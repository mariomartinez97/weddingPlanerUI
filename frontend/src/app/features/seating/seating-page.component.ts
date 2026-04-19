import { Component, computed, effect, inject, signal } from '@angular/core';
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
import { I18nService } from '../../core/services/i18n.service';
import { SeatingService } from '../../core/services/seating.service';
import { TableDef, Invitee } from '../../core/models';
import { TableEditorDialogComponent } from './table-editor-dialog.component';

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
      user-select: none;
      cursor: pointer;
      transition: border-color .18s ease, background .18s ease;
    }

    .guest-card.selected {
      border-color: rgba(255,255,255,0.28);
      background: rgba(255,255,255,0.1);
    }

    .guest-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }

    .guest-copy {
      flex: 1 1 auto;
      min-width: 0;
    }

    .drag-handle {
      cursor: grab;
      opacity: .82;
      flex: 0 0 auto;
    }

    .table-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 999px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.16);
      font-size: 12px;
      font-weight: 800;
    }

    .quick-assign {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }

    .quick-assign-row {
      display:flex;
      gap:10px;
      align-items:flex-start;
      flex-wrap:wrap;
    }

    .quick-assign-field {
      flex: 1 1 160px;
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
          <div style="font-weight:800">RSVP {{ 'yes' | t }}</div>
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
          <div
            *ngFor="let g of unassignedYesFiltered()"
            class="guest-card"
            [class.selected]="quickAssignGuestId() === g.id && !isAssigned(g.id)"
            cdkDrag
            [cdkDragData]="g"
            (click)="toggleQuickAssign(g)"
          >
            <div class="guest-top">
              <div class="guest-copy">
                <div style="font-weight:700">{{g.fullName}}</div>
                <div class="small">{{inviteName(g.partyId)}}</div>
              </div>

              <button
                type="button"
                mat-icon-button
                class="drag-handle"
                cdkDragHandle
                (click)="$event.stopPropagation()"
                [attr.aria-label]="'Drag ' + g.fullName"
              >
                <mat-icon>drag_indicator</mat-icon>
              </button>
            </div>

            <div *ngIf="quickAssignGuestId() === g.id && !isAssigned(g.id)" class="quick-assign" (click)="$event.stopPropagation()">
              <div class="small" style="margin-bottom:8px;">
                {{ 'clickAssignHint' | t }}
              </div>

              <ng-container *ngIf="tables().length > 0; else noTablesToAssign">
                <div class="quick-assign-row">
                  <mat-form-field appearance="fill" class="quick-assign-field">
                    <mat-label>{{ 'tableNumber' | t }}</mat-label>
                    <input
                      matInput
                      type="number"
                      min="1"
                      [ngModel]="quickAssignTableNumber()"
                      (ngModelChange)="quickAssignTableNumber.set(($event ?? '').toString())"
                      (keydown.enter)="assignSelectedGuestByNumber(g); $event.preventDefault()"
                    >
                  </mat-form-field>

                  <button mat-flat-button color="primary" (click)="assignSelectedGuestByNumber(g)">
                    {{ 'assignTable' | t }}
                  </button>
                </div>

                <div class="small">{{ tableNumberRangeLabel() }}</div>
              </ng-container>

              <ng-template #noTablesToAssign>
                <div class="small">{{ 'noTablesDefined' | t }}</div>
              </ng-template>
            </div>
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
          <div class="small" *ngIf="tables().length===0">{{ 'noTablesDefined' | t }}</div>
        </div>

        <div class="grid" style="margin-top:12px;">
          <div class="col-4" *ngFor="let t of tables()">
            <div class="table-card">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span class="table-number">{{ tableNumber(t.id) }}</span>
                  <div style="font-weight:800">{{t.name}}</div>
                </div>
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
                <div
                  *ngFor="let g of tableGuests(t.id)"
                  class="guest-card"
                  cdkDrag
                  [cdkDragData]="g"
                >
                  <div class="guest-top">
                    <div class="guest-copy">
                      <div style="font-weight:700">{{g.fullName}}</div>
                      <div class="small">{{inviteName(g.partyId)}}</div>
                    </div>

                    <button
                      type="button"
                      mat-icon-button
                      class="drag-handle"
                      cdkDragHandle
                      (click)="$event.stopPropagation()"
                      [attr.aria-label]="'Drag ' + g.fullName"
                      >
                        <mat-icon>drag_indicator</mat-icon>
                      </button>
                    </div>
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
  private i18n = inject(I18nService);
  private seating = inject(SeatingService);
  private dialog = inject(MatDialog);
  private invitesStore = toSignal(this.invites.storeObs$, { initialValue: this.invites.snapshot });
  private seatingStore = toSignal(this.seating.storeObs$, { initialValue: this.seating.snapshot });

  q = signal('');
  quickAssignGuestId = signal<string | null>(null);
  quickAssignTableNumber = signal('');

  yesPool = computed(() => this.invitesStore().invitees.filter(i => i.rsvp === 'YES'));
  tables = computed(() => this.seatingStore().tables);
  assignments = computed(() => this.seatingStore().assignments);

  assignedCount = computed(() => this.assignments().length);
  totalSeats = computed(() => this.tables().reduce((s,t) => s + t.seats, 0));
  connectedDropzones = computed(() => [
    'pool-dropzone',
    ...this.tables().map(t => `table-dropzone-${t.id}`),
  ]);

  constructor() {
    effect(() => {
      const guestId = this.quickAssignGuestId();
      if (!guestId) return;
      if (this.isAssigned(guestId)) this.closeQuickAssign();
    });
  }

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

  tableNumber(tableId: string): number {
    return this.tables().findIndex(t => t.id === tableId) + 1;
  }

  tableNumberRangeLabel(): string {
    return `1 - ${this.tables().length}`;
  }

  currentTableNumber(inviteeId: string): string {
    const assignment = this.assignments().find(a => a.inviteeId === inviteeId);
    if (!assignment) return '';

    const number = this.tableNumber(assignment.tableId);
    return number > 0 ? String(number) : '';
  }

  toggleQuickAssign(guest: Invitee) {
    if (this.quickAssignGuestId() === guest.id) {
      this.closeQuickAssign();
      return;
    }

    this.quickAssignGuestId.set(guest.id);
    this.quickAssignTableNumber.set(this.currentTableNumber(guest.id));
  }

  closeQuickAssign() {
    this.quickAssignGuestId.set(null);
    this.quickAssignTableNumber.set('');
  }

  assignGuestToTable(guest: Invitee, table: TableDef): boolean {
    const current = this.tableGuests(table.id);
    if (current.length >= table.seats && !current.some(g => g.id === guest.id)) {
      alert(this.i18n.t('tableFullMessage'));
      return false;
    }

    this.seating.assign(guest.id, table.id);
    this.closeQuickAssign();
    return true;
  }

  assignSelectedGuestByNumber(guest: Invitee) {
    const tableNumber = Number(this.quickAssignTableNumber().trim());
    if (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > this.tables().length) {
      alert(this.i18n.t('invalidTableNumber'));
      return;
    }

    const table = this.tables()[tableNumber - 1];
    if (!table) return;

    this.assignGuestToTable(guest, table);
  }

  unassignGuest(inviteeId: string) {
    this.seating.unassign(inviteeId);
    this.closeQuickAssign();
  }

  dropToTable(event: CdkDragDrop<Invitee[]>, t: TableDef) {
    const guest: Invitee | undefined = (event.item.data as Invitee | undefined);
    if (!guest) return;
    this.assignGuestToTable(guest, t);
  }

  dropToPool(event: CdkDragDrop<Invitee[]>) {
    const guest: Invitee | undefined = (event.item.data as Invitee | undefined);
    if (!guest) return;
    this.unassignGuest(guest.id);
  }

  openTables() {
    this.dialog.open(TableEditorDialogComponent, { width: '720px' });
  }

  clearAssignments() {
    if (!confirm('Clear all seating assignments?')) return;
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
