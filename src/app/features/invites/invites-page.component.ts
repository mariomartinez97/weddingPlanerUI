import { Component, inject, signal, computed } from '@angular/core';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Invitee, Party, RSVPStatus } from '../../core/models';
import { InvitesService } from '../../core/services/invites.service';
import { InviteFormDialogComponent } from './invite-form-dialog.component';
import { ExcelImportDialogComponent } from './excel-import-dialog.component';

type PartyRow = {
  party: Party;
  companions: Invitee[];
};

@Component({
  selector: 'app-invites-page',
  standalone: true,
  imports: [
    NgIf, NgFor, AsyncPipe,
    FormsModule,
    MatButtonModule, MatIconModule, MatTableModule, MatChipsModule, MatMenuModule,
    MatInputModule, MatDialogModule, MatSelectModule, MatTooltipModule,
  ],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Invites</div>
        <div class="page-subtitle">
          Upload Excel, add invites manually, track RSVP + meals per person.
        </div>
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button mat-stroked-button (click)="openImport()">
          <mat-icon>upload</mat-icon>
          Upload Excel
        </button>

        <button mat-flat-button color="primary" (click)="openNewInvite()">
          <mat-icon>person_add</mat-icon>
          New Invite
        </button>

        <button mat-stroked-button (click)="exportRsvpCsv()">
          <mat-icon>download</mat-icon>
          Export RSVP
        </button>
      </div>
    </div>

    <div class="grid">
      <div class="col-12 card">
        <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
          <mat-form-field appearance="fill" style="max-width:360px;">
            <mat-label>Search</mat-label>
            <input matInput
              [ngModel]="q()"
              (ngModelChange)="q.set($event)"
              placeholder="Invite name, companion, email, phone...">
          </mat-form-field>

          <mat-chip-listbox [value]="filter()" (change)="filter.set($event.value)">
            <mat-chip-option value="ALL">All ({{counts().all}})</mat-chip-option>
            <mat-chip-option value="YES">Yes ({{counts().yes}})</mat-chip-option>
            <mat-chip-option value="PENDING">Pending ({{counts().pending}})</mat-chip-option>
            <mat-chip-option value="NO">No ({{counts().no}})</mat-chip-option>
            <mat-chip-option value="MAYBE">Maybe ({{counts().maybe}})</mat-chip-option>
          </mat-chip-listbox>

          <span style="flex:1 1 auto"></span>

          <button mat-icon-button matTooltip="Clear all invites" (click)="clearAll()">
            <mat-icon>delete_forever</mat-icon>
          </button>
        </div>
      </div>

      <div class="col-12 card" style="overflow:auto;">
        <table mat-table [dataSource]="partyRows()" class="mat-elevation-z0" style="min-width:920px;">

          <!-- Invite -->
          <ng-container matColumnDef="invite">
            <th mat-header-cell *matHeaderCellDef>Invite</th>
            <td mat-cell *matCellDef="let row">
              <div style="font-weight:700;">{{ row.party.inviteName }}</div>
              <div style="opacity:.75; font-size:12px; margin-top:2px;">
                {{ row.companions.length }} companion(s)
              </div>
            </td>
          </ng-container>

          <!-- Contact -->
          <ng-container matColumnDef="contact">
            <th mat-header-cell *matHeaderCellDef>Contact</th>
            <td mat-cell *matCellDef="let row">
              <div>{{ row.party.contact?.email || '—' }}</div>
              <div style="opacity:.7; font-size:12px;">
                {{ row.party.contact?.phone || '' }}
              </div>
            </td>
          </ng-container>

          <!-- Companions -->
          <ng-container matColumnDef="companions">
            <th mat-header-cell *matHeaderCellDef>Companions</th>
            <td mat-cell *matCellDef="let row">

              <div *ngFor="let c of row.companions"
                   style="display:flex; gap:12px; align-items:center; padding:8px 0; border-bottom:1px solid rgba(0,0,0,0.06);">

                <div style="flex:1;">
                  <div style="font-weight:600;">{{ c.fullName }}</div>
                  <div style="opacity:.7; font-size:12px;">
                    {{ c.mealChoice || '— meal' }}
                  </div>
                </div>

                <mat-form-field appearance="fill" style="width:170px;">
                  <mat-select [value]="c.rsvp"
                              (selectionChange)="setRsvp(c, $event.value)">
                    <mat-option value="PENDING">Pending</mat-option>
                    <mat-option value="YES">Yes</mat-option>
                    <mat-option value="NO">No</mat-option>
                    <mat-option value="MAYBE">Maybe</mat-option>
                  </mat-select>
                </mat-form-field>

                <button mat-icon-button [matMenuTriggerFor]="menuC">
                  <mat-icon>more_vert</mat-icon>
                </button>

                <mat-menu #menuC="matMenu">
                  <button mat-menu-item (click)="openEditPerson(c)">
                    <mat-icon>edit</mat-icon>
                    Edit person
                  </button>
                  <button mat-menu-item (click)="svc.deleteInvitee(c.id)">
                    <mat-icon>delete</mat-icon>
                    Delete person
                  </button>
                </mat-menu>
              </div>

              <div style="padding-top:10px;">
                <button mat-stroked-button (click)="addCompanionPrompt(row.party)">
                  <mat-icon>person_add</mat-icon>
                  Add companion
                </button>
              </div>
            </td>
          </ng-container>

          <!-- Invite actions -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row" style="text-align:right;">
              <button mat-icon-button [matMenuTriggerFor]="menuP">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menuP="matMenu">
                <button mat-menu-item (click)="openEditInvite(row.party)">
                  <mat-icon>edit</mat-icon>
                  Edit invite
                </button>
                <button mat-menu-item (click)="svc.deleteParty(row.party.id)">
                  <mat-icon>delete</mat-icon>
                  Delete invite
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>

        <div *ngIf="partyRows().length===0"
             style="padding:18px; opacity:.8;">
          No invites yet.
        </div>
      </div>
    </div>
  </div>
  `
})
export class InvitesPageComponent {

  readonly svc = inject(InvitesService);
  private dialog = inject(MatDialog);

  cols = ['invite', 'contact', 'companions', 'actions'];

  q = signal('');
  filter = signal<'ALL' | RSVPStatus>('ALL');

  // ---------- Dialog Openers ----------
  openNewInvite() {
    this.dialog.open(InviteFormDialogComponent, {
      width: '650px',
      data: {}
    });
  }

  openEditPerson(invitee: Invitee) {
    this.dialog.open(InviteFormDialogComponent, {
      width: '650px',
      data: { existingInvitee: invitee }
    });
  }

  openEditInvite(party: Party) {
    this.dialog.open(InviteFormDialogComponent, {
      width: '650px',
      data: { existingParty: party }
    });
  }

  openImport() {
    this.dialog.open(ExcelImportDialogComponent, { width: '860px' });
  }

  setRsvp(inv: Invitee, v: RSVPStatus) {
    this.svc.setRSVP(inv.id, v);
  }

  addCompanionPrompt(party: Party) {
    const name = prompt('Companion full name:');
    if (!name?.trim()) return;
    this.svc.addCompanion(party.id, name.trim());
  }

  clearAll() {
    if (!confirm('Delete ALL invites?')) return;
    this.svc.clearAll();
  }

  // ---------- Computed ----------
  counts = computed(() => {
    const inv = this.svc.snapshot.invitees;
    return {
      all: inv.length,
      yes: inv.filter(x => x.rsvp === 'YES').length,
      pending: inv.filter(x => x.rsvp === 'PENDING').length,
      no: inv.filter(x => x.rsvp === 'NO').length,
      maybe: inv.filter(x => x.rsvp === 'MAYBE').length,
    };
  });

  partyRows = computed<PartyRow[]>(() => {
    const parties = this.svc.snapshot.parties;
    const invitees = this.svc.snapshot.invitees;

    return parties.map(p => ({
      party: p,
      companions: invitees
        .filter(i => i.partyId === p.id)
        .sort((a,b) => a.fullName.localeCompare(b.fullName))
    }));
  });

  exportRsvpCsv() {
    // (unchanged — your existing export logic here)
  }
}
