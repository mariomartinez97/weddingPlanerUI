import { Component, computed, inject, signal } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

import { InvitesService } from '../../core/services/invites.service';
import { SeatingService } from '../../core/services/seating.service';
import { TableDef, Invitee } from '../../core/models';
import { TableEditorDialogComponent } from './table-editor-dialog.component';
import { I18nService } from '../../core/services/i18n.service';

@Component({
  selector: 'app-seating-page',
  standalone: true,
  imports: [
    NgIf, NgFor,
    FormsModule,
    DragDropModule,
    MatButtonModule, MatIconModule, MatInputModule, MatDialogModule, TranslatePipe
  ],
  styles: [`
    .pane { min-height: 520px; }

    .guest-card {
      padding: 10px;
      border-radius: 14px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      margin-bottom: 10px;
      cursor: grab;
      user-select: none;
    }

    .table-card {
      border-radius: 16px;
      padding: 12px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
    }

    .dropzone {
      min-height: 90px;
      padding: 10px;
      border-radius: 12px;
      border: 1px dashed rgba(255,255,255,0.18);
      background: rgba(0,0,0,0.12);
      margin-top: 10px;
    }
    .dropzone.full { opacity: .55; }

    .small { opacity:.75; font-size:12px; }
  `],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <div class="page-title">{{ 'seatingTitle' | t }}</div>
        <div class="page-subtitle">{{ 'seatingSubtitle' | t }}</div>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button mat-stroked-button (click)="openTables()">
          <mat-icon>table_restaurant</mat-icon>
          {{ 'defineTables' | t }}
        </button>

        <button mat-stroked-button (click)="clearAssignments()">
          <mat-icon>restart_alt</mat-icon>
          {{ 'clearSeating' | t }}
        </button>

        <button mat-flat-button color="primary" (click)="exportCsv()">
          <mat-icon>download</mat-icon>
          {{ 'exportList' | t }}
        </button>
      </div>
    </div>

    <div class="grid" cdkDropListGroup>
      <!-- Left: RSVP YES pool -->
      <div class="col-3 card pane">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="font-weight:800">RSVP {{ 'rsvpYes' | t }}</div>
          <span class="small">({{yesPool().length}})</span>
        </div>

        <mat-form-field appearance="fill" style="margin-top:10px;">
          <mat-label>{{ 'searchGuests' | t }}</mat-label>
          <input matInput [ngModel]="q()" (ngModelChange)="q.set($event)" [placeholder]="'searchGuestsPlaceholder' | t">
        </mat-form-field>

        <div class="small" style="margin-top:8px;">
          {{ 'dragGuestsHint' | t }}
        </div>

        <div
          id="pool-dropzone"
          cdkDropList
          [cdkDropListConnectedTo]="connectedDropzones()"
          [cdkDropListData]="unassignedYes()"
          class="dropzone"
          (cdkDropListDropped)="dropToPool($event)"
        >
          <div *ngFor="let g of unassignedYesFiltered()" class="guest-card" cdkDrag [cdkDragData]="g">
            <div style="font-weight:700">{{g.fullName}}</div>
            <div class="small">{{inviteName(g.partyId)}}</div>
          </div>

          <div *ngIf="unassignedYesFiltered().length===0" class="small" style="padding:8px; opacity:.8;">
            {{ 'noMatchingGuests' | t }}
          </div>
        </div>
      </div>

      <!-- Middle/Right: tables -->
      <div class="col-9 card pane">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
          <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
            <div style="font-weight:800">{{ 'tables' | t }}</div>
            <div class="small">
              {{ 'totalSeats' | t }}: <b>{{totalSeats()}}</b> · {{ 'assigned' | t }}: <b>{{assignedCount()}}</b>
            </div>
          </div>
          <div class="small" *ngIf="tables().length===0">{{ 'noTablesDefinedYet' | t }}</div>
        </div>

        <div class="grid" style="margin-top:12px;">
          <div class="col-4" *ngFor="let t of tables()">
            <div class="table-card">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                <div style="font-weight:800">{{t.name}}</div>
                <div class="small">{{tableGuests(t.id).length}} / {{t.seats}}</div>
              </div>

              <div
                [id]="'table-dropzone-' + t.id"
                class="dropzone"
                [class.full]="tableGuests(t.id).length >= t.seats"
                cdkDropList
                [cdkDropListConnectedTo]="connectedDropzones()"
                [cdkDropListData]="tableGuests(t.id)"
                (cdkDropListDropped)="dropToTable($event, t)"
              >
                <div *ngFor="let g of tableGuests(t.id)" class="guest-card" cdkDrag [cdkDragData]="g">
                  <div style="font-weight:700">{{g.fullName}}</div>
                  <div class="small">{{inviteName(g.partyId)}}</div>
                </div>

                <div *ngIf="tableGuests(t.id).length===0" class="small" style="padding:6px; opacity:.8;">
                  {{ 'dropGuestsHere' | t }}
                </div>
              </div>

              <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
                <button mat-stroked-button (click)="clearTable(t)">
                  <mat-icon>clear</mat-icon>
                  {{ 'clearTable' | t }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="small" style="margin-top:12px; opacity:.75;">
          {{ 'dragBackTip' | t }}
        </div>
      </div>
    </div>
  </div>
  `
})
export class SeatingPageComponent {
  private invites = inject(InvitesService);
  private seating = inject(SeatingService);
  private i18n = inject(I18nService);
  private dialog = inject(MatDialog);
  private invitesStore = toSignal(this.invites.storeObs$, { initialValue: this.invites.snapshot });
  private seatingStore = toSignal(this.seating.storeObs$, { initialValue: this.seating.snapshot });

  q = signal('');

  yesPool = computed(() => this.invitesStore().invitees.filter(i => i.rsvp === 'YES'));
  tables = computed(() => this.seatingStore().tables);
  assignments = computed(() => this.seatingStore().assignments);

  assignedCount = computed(() => this.assignments().length);
  totalSeats = computed(() => this.tables().reduce((s,t) => s + t.seats, 0));
  connectedDropzones = computed(() => [
    'pool-dropzone',
    ...this.tables().map(t => `table-dropzone-${t.id}`),
  ]);

  inviteName(partyId: string): string {
    return this.invitesStore().parties.find(p => p.id === partyId)?.inviteName ?? '—';
  }

  isAssigned(inviteeId: string): boolean {
    return this.assignments().some(a => a.inviteeId === inviteeId);
  }

  unassignedYes = computed(() => this.yesPool().filter(g => !this.isAssigned(g.id)));

  unassignedYesFiltered = computed(() => {
    const q = this.q().trim().toLowerCase();
    const list = this.unassignedYes();
    if (!q) return list;

    return list.filter(g => {
      const inv = this.inviteName(g.partyId).toLowerCase();
      return (g.fullName || '').toLowerCase().includes(q) || inv.includes(q);
    });
  });

  tableGuests(tableId: string): Invitee[] {
    const map = new Map(this.invitesStore().invitees.map(i => [i.id, i]));
    return this.assignments()
      .filter(a => a.tableId === tableId)
      .map(a => map.get(a.inviteeId))
      .filter((x): x is Invitee => !!x);
  }

  dropToTable(event: CdkDragDrop<Invitee[]>, t: TableDef) {
    const guest: Invitee | undefined = (event.item.data as Invitee | undefined);
    if (!guest) return;

    const current = this.tableGuests(t.id);
    // capacity check
    if (current.length >= t.seats && !current.some(g => g.id === guest.id)) return;

    this.seating.assign(guest.id, t.id);
  }

  dropToPool(event: CdkDragDrop<Invitee[]>) {
    const guest: Invitee | undefined = (event.item.data as Invitee | undefined);
    if (!guest) return;
    this.seating.unassign(guest.id);
  }

  openTables() {
    this.dialog.open(TableEditorDialogComponent, { width: '720px' });
  }

  clearAssignments() {
    if (!confirm(this.i18n.t('clearAllSeatingConfirm'))) return;
    this.seating.clearAssignments();
  }

  clearTable(t: TableDef) {
    const assigned = this.assignments().filter(a => a.tableId === t.id);
    for (const a of assigned) this.seating.unassign(a.inviteeId);
  }

  exportCsv() {
    const invMap = new Map(this.invitesStore().invitees.map(i => [i.id, i]));
    const partyMap = new Map(this.invitesStore().parties.map(p => [p.id, p]));
    const tableMap = new Map(this.tables().map(t => [t.id, t.name]));

    // New format export
    const header = ['InviteName','CompanionName','RSVP','TableName'];

    const rows = this.assignments()
      .map(a => {
        const i = invMap.get(a.inviteeId);
        if (!i) return null;

        const p = partyMap.get(i.partyId);

        return [
          p?.inviteName || '',
          i.fullName || '',
          i.rsvp || 'PENDING',
          tableMap.get(a.tableId) || ''
        ];
      })
      .filter((x): x is string[] => !!x)
      .sort((a,b) =>
        (a[3]||'').localeCompare(b[3]||'') ||
        (a[0]||'').localeCompare(b[0]||'') ||
        (a[1]||'').localeCompare(b[1]||'')
      );

    const csv = [header, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))
      .join('\n');

    this.download('seating_export.csv', csv, 'text/csv;charset=utf-8;');
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
}
