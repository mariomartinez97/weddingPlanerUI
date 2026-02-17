import { Component, inject, signal, computed } from '@angular/core';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
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
        <div class="page-subtitle">Upload Excel, add invites manually, track RSVP + meals per person.</div>
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button mat-stroked-button (click)="openImport()">
          <mat-icon>upload</mat-icon>
          Upload Excel
        </button>

        <button mat-flat-button color="primary" (click)="openInviteForm()">
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
            <input matInput [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="Invite name, companion, email, phone...">
          </mat-form-field>

          <mat-chip-listbox [value]="filter()" (change)="filter.set($event.value)">
            <mat-chip-option value="ALL">All ({{counts().all}})</mat-chip-option>
            <mat-chip-option value="YES">Yes ({{counts().yes}})</mat-chip-option>
            <mat-chip-option value="PENDING">Pending ({{counts().pending}})</mat-chip-option>
            <mat-chip-option value="NO">No ({{counts().no}})</mat-chip-option>
            <mat-chip-option value="MAYBE">Maybe ({{counts().maybe}})</mat-chip-option>
          </mat-chip-listbox>

          <span style="flex:1 1 auto"></span>

          <button mat-icon-button matTooltip="Reload" (click)="reload()">
            <mat-icon>refresh</mat-icon>
          </button>

          <button mat-icon-button matTooltip="Clear all invites" (click)="clearAll()">
            <mat-icon>delete_forever</mat-icon>
          </button>
        </div>
      </div>

      <div class="col-12 card" style="overflow:auto;">
        <table mat-table [dataSource]="partyRows()" class="mat-elevation-z0" style="min-width:920px;">

          <!-- Invite (Party) -->
          <ng-container matColumnDef="invite">
            <th mat-header-cell *matHeaderCellDef>Invite</th>
            <td mat-cell *matCellDef="let row">
              <div style="font-weight:700;">{{ row.party.inviteName }}</div>
              <div style="opacity:.75; font-size:12px; margin-top:2px;">
                {{ row.companions.length }} companion(s)
              </div>
            </td>
          </ng-container>

          <!-- Contact (Party contact) -->
          <ng-container matColumnDef="contact">
            <th mat-header-cell *matHeaderCellDef>Contact</th>
            <td mat-cell *matCellDef="let row">
              <div style="opacity:.95;">{{ row.party.contact?.email || '—' }}</div>
              <div style="opacity:.7; font-size:12px;">{{ row.party.contact?.phone || '' }}</div>
            </td>
          </ng-container>

          <!-- Companions list -->
          <ng-container matColumnDef="companions">
            <th mat-header-cell *matHeaderCellDef>Companions (RSVP + Meal per person)</th>
            <td mat-cell *matCellDef="let row">
              <div *ngIf="row.companions.length===0" style="opacity:.75;">No companions yet</div>

              <div *ngFor="let c of row.companions" style="display:flex; gap:12px; align-items:center; padding:8px 0; border-bottom: 1px solid rgba(0,0,0,0.06);">
                <div style="flex:1; min-width:200px;">
                  <div style="font-weight:600;">{{ c.fullName }}</div>
                  <div style="opacity:.7; font-size:12px;">{{ c.mealChoice || '— meal' }}</div>
                </div>

                <mat-form-field appearance="fill" style="width:170px;">
                  <mat-select [value]="c.rsvp" (selectionChange)="setRsvp(c, $event.value)">
                    <mat-option value="PENDING">Pending</mat-option>
                    <mat-option value="YES">Yes</mat-option>
                    <mat-option value="NO">No</mat-option>
                    <mat-option value="MAYBE">Maybe</mat-option>
                  </mat-select>
                </mat-form-field>

                <button mat-icon-button [matMenuTriggerFor]="menuC" aria-label="Companion menu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menuC="matMenu">
                  <button mat-menu-item (click)="openInviteForm(c)">
                    <mat-icon>edit</mat-icon>
                    Edit person
                  </button>
                  <button mat-menu-item (click)="deletePerson(c)">
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

          <!-- Actions -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row" style="text-align:right;">
              <button mat-icon-button [matMenuTriggerFor]="menuP"><mat-icon>more_vert</mat-icon></button>
              <mat-menu #menuP="matMenu">
                <button mat-menu-item (click)="openInviteForm(undefined, row.party)">
                  <mat-icon>edit</mat-icon>
                  Edit invite
                </button>
                <button mat-menu-item (click)="deleteInvite(row.party)">
                  <mat-icon>delete</mat-icon>
                  Delete invite
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>

        <div *ngIf="partyRows().length===0" style="padding:18px; opacity:.8;">
          No invites yet. Upload an Excel or add an invite manually.
        </div>
      </div>
    </div>
  </div>
  `,
})
export class InvitesPageComponent {
  readonly svc = inject(InvitesService);
  private dialog = inject(MatDialog);
  private store = toSignal(this.svc.storeObs$, {
    initialValue: this.svc.snapshot,
  });

  cols = ['invite', 'contact', 'companions', 'actions'];

  q = signal('');
  filter = signal<'ALL' | RSVPStatus>('ALL');

  constructor() {
    // Load data once when page mounts
    void this.reload();
  }

  async reload() {
    try {
      await this.svc.load();
    } catch {
      // leave UI as-is
    }
  }

  counts = computed(() => {
    const inv = this.store().invitees;
    return {
      all: inv.length,
      yes: inv.filter(x => x.rsvp === 'YES').length,
      pending: inv.filter(x => x.rsvp === 'PENDING').length,
      no: inv.filter(x => x.rsvp === 'NO').length,
      maybe: inv.filter(x => x.rsvp === 'MAYBE').length,
    };
  });

  partyRows = computed<PartyRow[]>(() => {
    const q = this.q().trim().toLowerCase();
    const f = this.filter();

    const state = this.store();
    const parties = state.parties;
    const invitees = state.invitees;

    const byParty = new Map<string, Invitee[]>();
    for (const i of invitees) {
      if (f !== 'ALL' && i.rsvp !== f) continue;
      if (!byParty.has(i.partyId)) byParty.set(i.partyId, []);
      byParty.get(i.partyId)!.push(i);
    }

    let rows: PartyRow[] = parties.map(p => ({
      party: p,
      companions: (byParty.get(p.id) || []).slice().sort((a,b) => a.fullName.localeCompare(b.fullName)),
    }));

    if (q) {
      rows = rows.filter(r => {
        const inviteName = (r.party.inviteName || '').toLowerCase();
        const email = (r.party.contact?.email || '').toLowerCase();
        const phone = (r.party.contact?.phone || '').toLowerCase();
        const companionNames = r.companions.map(c => c.fullName.toLowerCase()).join(' ');
        return inviteName.includes(q) || email.includes(q) || phone.includes(q) || companionNames.includes(q);
      });
    }

    rows.sort((a,b) => a.party.inviteName.localeCompare(b.party.inviteName));
    return rows;
  });

  openInviteForm(existingInvitee?: Invitee, existingParty?: Party) {
    const ref = this.dialog.open(InviteFormDialogComponent, {
      width: '650px',
      data: { existingInvitee, existingParty }
    });

    // after close, reload (dialog writes to backend)
    ref.afterClosed().subscribe((changed) => {
      if (changed) void this.reload();
    });
  }

  openImport() {
    const ref = this.dialog.open(ExcelImportDialogComponent, { width: '860px' });
    ref.afterClosed().subscribe((changed) => {
      if (changed) void this.reload();
    });
  }

  async setRsvp(inv: Invitee, v: RSVPStatus) {
    await this.svc.setRSVP(inv.id, v);
  }

  async deletePerson(c: Invitee) {
    if (!confirm(`Delete ${c.fullName}?`)) return;
    await this.svc.deleteInvitee(c.id);
  }

  async deleteInvite(party: Party) {
    if (!confirm(`Delete invite "${party.inviteName}" and all companions?`)) return;
    await this.svc.deleteParty(party.id);
  }

  async addCompanionPrompt(party: Party) {
    const name = prompt('Companion full name:');
    if (!name || !name.trim()) return;
    await this.svc.addCompanion(party.id, name.trim());
  }

  exportRsvpCsv() {
    const partiesById = new Map(this.svc.snapshot.parties.map(p => [p.id, p]));
    const inv = this.svc.snapshot.invitees;

    const header = [
      'InviteName',
      'CompanionName',
      'ContactEmail',
      'ContactPhone',
      'RSVP',
      'MealChoice',
      'PersonNotes',
      'InviteNotes'
    ];

    const rows = inv.map(i => {
      const p = partiesById.get(i.partyId);

      return [
        p?.inviteName || '',
        i.fullName || '',
        p?.contact?.email || '',
        p?.contact?.phone || '',
        i.rsvp || 'PENDING',
        i.mealChoice || '',
        (i.notes || '').replace(/\n/g, ' '),
        (p?.notes || '').replace(/\n/g, ' ')
      ];
    });

    const csv = [header, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))
      .join('\n');

    this.download('rsvp_export.csv', csv, 'text/csv;charset=utf-8;');
  }

  private download(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async clearAll() {
    if (!confirm('Delete ALL invites?')) return;
    await this.svc.clearAll();
  }
}
