import { Component, inject, signal, computed } from '@angular/core';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

import { Invitee, Party, RSVPStatus } from '../../core/models';
import { InvitesService } from '../../core/services/invites.service';
import { InviteFormDialogComponent } from './invite-form-dialog.component';
import { ExcelImportDialogComponent } from './excel-import-dialog.component';
import { I18nService } from '../../core/services/i18n.service';

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
    MatInputModule, MatDialogModule, MatSelectModule, MatTooltipModule, TranslatePipe,
  ],
  styles: [`
    .invite-actions {
      display:flex;
      gap:10px;
      flex-wrap:wrap;
    }

    .invite-mobile-list {
      display:grid;
      gap:14px;
    }

    .invite-mobile-card {
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 16px;
      padding: 16px;
      background: rgba(255,255,255,0.55);
    }

    .invite-mobile-row {
      display:grid;
      gap:10px;
    }

    .invite-mobile-companion {
      padding: 10px 0;
      border-top: 1px solid rgba(0,0,0,0.06);
    }

    .invite-mobile-companion:first-child {
      border-top: 0;
      padding-top: 0;
    }

    .invite-mobile-select {
      width: 100%;
      margin-top: 8px;
    }
  `],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <div class="page-title">{{ 'invitesTitle' | t }}</div>
        <div class="page-subtitle">{{ 'invitesSubtitle' | t }}</div>
      </div>

      <div class="invite-actions">
        <button mat-stroked-button (click)="openImport()">
          <mat-icon>upload</mat-icon>
          {{ 'uploadExcel' | t }}
        </button>

        <button mat-flat-button color="primary" (click)="openInviteForm()">
          <mat-icon>person_add</mat-icon>
          {{ 'newInvite' | t }}
        </button>

        <button mat-stroked-button (click)="exportRsvpCsv()">
          <mat-icon>download</mat-icon>
          {{ 'exportRsvp' | t }}
        </button>
      </div>
    </div>

    <div class="grid">
      <div class="col-12 card">
        <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
          <mat-form-field appearance="fill" style="max-width:360px;">
            <mat-label>{{ 'search' | t }}</mat-label>
            <input matInput [ngModel]="q()" (ngModelChange)="q.set($event)" [placeholder]="'searchInvitesPlaceholder' | t">
          </mat-form-field>

          <mat-chip-listbox [value]="filter()" (change)="filter.set($event.value)">
            <mat-chip-option value="ALL">{{ 'all' | t }} ({{counts().all}})</mat-chip-option>
            <mat-chip-option value="YES">{{ 'yes' | t }} ({{counts().yes}})</mat-chip-option>
            <mat-chip-option value="PENDING">{{ 'pending' | t }} ({{counts().pending}})</mat-chip-option>
            <mat-chip-option value="NO">{{ 'no' | t }} ({{counts().no}})</mat-chip-option>
            <mat-chip-option value="MAYBE">{{ 'maybe' | t }} ({{counts().maybe}})</mat-chip-option>
          </mat-chip-listbox>

          <span style="flex:1 1 auto"></span>

          <button mat-icon-button [matTooltip]="'reload' | t" (click)="reload()">
            <mat-icon>refresh</mat-icon>
          </button>

          <button mat-icon-button [matTooltip]="'clearAllInvites' | t" (click)="clearAll()">
            <mat-icon>delete_forever</mat-icon>
          </button>
        </div>
      </div>

      <div class="col-12 card" style="overflow:auto;" *ngIf="!isHandset(); else mobileInvites">
        <table mat-table [dataSource]="partyRows()" class="mat-elevation-z0" style="min-width:920px;">

          <!-- Invite (Party) -->
          <ng-container matColumnDef="invite">
            <th mat-header-cell *matHeaderCellDef>{{ 'invite' | t }}</th>
            <td mat-cell *matCellDef="let row">
              <div style="font-weight:700;">{{ row.party.inviteName }}</div>
              <div style="opacity:.75; font-size:12px; margin-top:2px;">
                {{ row.companions.length }} {{ 'companionCount' | t }}
              </div>
            </td>
          </ng-container>

          <!-- Contact (Party contact) -->
          <ng-container matColumnDef="contact">
            <th mat-header-cell *matHeaderCellDef>{{ 'contact' | t }}</th>
            <td mat-cell *matCellDef="let row">
              <div style="opacity:.95;">{{ row.party.contact?.email || '—' }}</div>
              <div style="opacity:.7; font-size:12px;">{{ row.party.contact?.phone || '' }}</div>
            </td>
          </ng-container>

          <!-- Companions list -->
          <ng-container matColumnDef="companions">
            <th mat-header-cell *matHeaderCellDef>{{ 'companionsDetail' | t }}</th>
            <td mat-cell *matCellDef="let row">
              <div *ngIf="row.companions.length===0" style="opacity:.75;">{{ 'noCompanionsYet' | t }}</div>

              <div *ngFor="let c of row.companions" style="display:flex; gap:12px; align-items:center; padding:8px 0; border-bottom: 1px solid rgba(0,0,0,0.06);">
                <div style="flex:1; min-width:200px;">
                  <div style="font-weight:600;">{{ c.fullName }}</div>
                  <div style="opacity:.7; font-size:12px;">{{ c.mealChoice || '— meal' }}</div>
                </div>

                <mat-form-field appearance="fill" style="width:170px;">
                  <mat-select [value]="c.rsvp" (selectionChange)="setRsvp(c, $event.value)">
                    <mat-option value="PENDING">{{ 'pending' | t }}</mat-option>
                    <mat-option value="YES">{{ 'yes' | t }}</mat-option>
                    <mat-option value="NO">{{ 'no' | t }}</mat-option>
                    <mat-option value="MAYBE">{{ 'maybe' | t }}</mat-option>
                  </mat-select>
                </mat-form-field>

                <button mat-icon-button [matMenuTriggerFor]="menuC" [attr.aria-label]="i18n.t('companionMenu')">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menuC="matMenu">
                  <button mat-menu-item (click)="openInviteForm(c)">
                    <mat-icon>edit</mat-icon>
                    {{ 'editPerson' | t }}
                  </button>
                  <button mat-menu-item (click)="deletePerson(c)">
                    <mat-icon>delete</mat-icon>
                    {{ 'deletePerson' | t }}
                  </button>
                </mat-menu>
              </div>

              <div style="padding-top:10px;">
                <button mat-stroked-button (click)="addCompanionPrompt(row.party)">
                  <mat-icon>person_add</mat-icon>
                  {{ 'addCompanion' | t }}
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
                  {{ 'editInvite' | t }}
                </button>
                <button mat-menu-item (click)="deleteInvite(row.party)">
                  <mat-icon>delete</mat-icon>
                  {{ 'deleteInvite' | t }}
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>

        <div *ngIf="partyRows().length===0" style="padding:18px; opacity:.8;">
          {{ 'noInvitesYet' | t }}
        </div>
      </div>

      <ng-template #mobileInvites>
        <div class="col-12 card">
          <div *ngIf="partyRows().length===0" style="padding:6px 0; opacity:.8;">
            {{ 'noInvitesYet' | t }}
          </div>

          <div class="invite-mobile-list" *ngIf="partyRows().length>0">
            <div class="invite-mobile-card" *ngFor="let row of partyRows()">
              <div class="invite-mobile-row">
                <div>
                  <div style="font-weight:800; font-size:16px;">{{ row.party.inviteName }}</div>
                  <div style="opacity:.75; font-size:12px;">{{ row.companions.length }} {{ 'companionCount' | t }}</div>
                </div>

                <div style="opacity:.85; font-size:13px;">
                  <div>{{ row.party.contact?.email || '—' }}</div>
                  <div *ngIf="row.party.contact?.phone">{{ row.party.contact?.phone }}</div>
                </div>

                <div class="inline-actions" style="display:flex; gap:8px; flex-wrap:wrap;">
                  <button mat-stroked-button (click)="openInviteForm(undefined, row.party)">
                    <mat-icon>edit</mat-icon>
                    {{ 'editInvite' | t }}
                  </button>
                  <button mat-stroked-button (click)="addCompanionPrompt(row.party)">
                    <mat-icon>person_add</mat-icon>
                    {{ 'addCompanion' | t }}
                  </button>
                  <button mat-stroked-button color="warn" (click)="deleteInvite(row.party)">
                    <mat-icon>delete</mat-icon>
                    {{ 'deleteInvite' | t }}
                  </button>
                </div>
              </div>

              <div style="margin-top:14px;" *ngIf="row.companions.length===0">
                <div style="opacity:.75;">{{ 'noCompanionsYet' | t }}</div>
              </div>

              <div style="margin-top:14px;" *ngIf="row.companions.length>0">
                <div class="invite-mobile-companion" *ngFor="let c of row.companions">
                  <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
                    <div>
                      <div style="font-weight:700;">{{ c.fullName }}</div>
                      <div style="opacity:.7; font-size:12px;">{{ c.mealChoice || '— meal' }}</div>
                    </div>
                    <button mat-icon-button [matMenuTriggerFor]="mobileMenu">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #mobileMenu="matMenu">
                      <button mat-menu-item (click)="openInviteForm(c)">
                        <mat-icon>edit</mat-icon>
                        {{ 'editPerson' | t }}
                      </button>
                      <button mat-menu-item (click)="deletePerson(c)">
                        <mat-icon>delete</mat-icon>
                        {{ 'deletePerson' | t }}
                      </button>
                    </mat-menu>
                  </div>

                  <mat-form-field appearance="fill" class="invite-mobile-select">
                    <mat-select [value]="c.rsvp" (selectionChange)="setRsvp(c, $event.value)">
                      <mat-option value="PENDING">{{ 'pending' | t }}</mat-option>
                      <mat-option value="YES">{{ 'yes' | t }}</mat-option>
                      <mat-option value="NO">{{ 'no' | t }}</mat-option>
                      <mat-option value="MAYBE">{{ 'maybe' | t }}</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ng-template>
    </div>
  </div>
  `,
})
export class InvitesPageComponent {
  readonly svc = inject(InvitesService);
  readonly i18n = inject(I18nService);
  private dialog = inject(MatDialog);
  private bp = inject(BreakpointObserver);
  private store = toSignal(this.svc.storeObs$, {
    initialValue: this.svc.snapshot,
  });

  cols = ['invite', 'contact', 'companions', 'actions'];

  q = signal('');
  filter = signal<'ALL' | RSVPStatus>('ALL');
  handsetState = toSignal(this.bp.observe([Breakpoints.Handset]), {
    initialValue: { matches: false, breakpoints: {} }
  });

  constructor() {
    // Load data once when page mounts
    void this.reload();
  }

  isHandset() {
    return this.handsetState()?.matches ?? false;
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
