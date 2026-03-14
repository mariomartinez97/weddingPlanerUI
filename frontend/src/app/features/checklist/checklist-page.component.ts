import { Component, computed, inject, signal } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';

import { ChecklistService } from '../../core/services/checklist.service';
import { ChecklistItem } from '../../core/models';
import { ChecklistItemDialogComponent } from './checklist-item-dialog.component';

@Component({
  selector: 'app-checklist-page',
  standalone: true,
  imports: [
    NgIf, NgFor,
    MatButtonModule, MatIconModule, MatDialogModule,
    MatChipsModule, MatCheckboxModule, MatMenuModule
  ],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Checklist</div>
        <div style="opacity:.8; font-size:13px;">Track tasks and who’s responsible.</div>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button mat-flat-button color="primary" (click)="open()"><mat-icon>add</mat-icon> Add item</button>
      </div>
    </div>

    <div class="grid">
      <div class="col-12 card">
        <mat-chip-listbox [value]="filter()" (change)="filter.set($event.value)">
          <mat-chip-option value="ALL">All ({{counts().all}})</mat-chip-option>
          <mat-chip-option value="PENDING">Pending ({{counts().pending}})</mat-chip-option>
          <mat-chip-option value="DONE">Done ({{counts().done}})</mat-chip-option>
        </mat-chip-listbox>
      </div>

      <div class="col-12 card">
        <div *ngIf="rows().length===0" style="opacity:.8; padding:8px;">
          No checklist items yet.
        </div>

        <div *ngFor="let it of rows()" style="display:flex; gap:10px; align-items:flex-start; padding:10px; border-bottom: 1px solid rgba(255,255,255,0.10);">
          <mat-checkbox [checked]="it.done" (change)="svc.updateItem(it.id, {done: $event.checked})"></mat-checkbox>

          <div style="flex:1 1 auto;">
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
              <div style="font-weight:700" [style.textDecoration]="it.done ? 'line-through' : 'none'">{{it.title}}</div>
              <span style="opacity:.7; font-size:12px;">Owner: <b>{{it.owner}}</b></span>
              <span style="opacity:.7; font-size:12px;" *ngIf="it.dueDate">Due: <b>{{it.dueDate}}</b></span>
            </div>
            <div style="opacity:.8; font-size:13px; margin-top:6px;" *ngIf="it.notes">{{it.notes}}</div>
          </div>

          <button mat-icon-button [matMenuTriggerFor]="menu"><mat-icon>more_vert</mat-icon></button>
          <mat-menu #menu="matMenu">
            <button mat-menu-item (click)="open(it)"><mat-icon>edit</mat-icon> Edit</button>
            <button mat-menu-item (click)="del(it)"><mat-icon>delete</mat-icon> Delete</button>
          </mat-menu>
        </div>
      </div>
    </div>
  </div>
  `
})
export class ChecklistPageComponent {
  readonly svc = inject(ChecklistService);
  private dialog = inject(MatDialog);
  private store = toSignal(this.svc.storeObs$, { initialValue: this.svc.snapshot });

  filter = signal<'ALL'|'PENDING'|'DONE'>('ALL');

  counts = computed(() => {
    const items = this.store().items;
    return {
      all: items.length,
      pending: items.filter(x => !x.done).length,
      done: items.filter(x => x.done).length,
    };
  });

  rows = computed(() => {
    const f = this.filter();
    const items = this.store().items;
    if (f === 'ALL') return items;
    if (f === 'DONE') return items.filter(x => x.done);
    return items.filter(x => !x.done);
  });

  open(existing?: ChecklistItem) {
    this.dialog.open(ChecklistItemDialogComponent, { width: '560px', data: { existing } });
  }

  del(it: ChecklistItem) {
    if (!confirm('Delete this item?')) return;
    this.svc.deleteItem(it.id);
  }
}
