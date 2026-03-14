import { Component, inject, signal } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuditService } from '../../core/services/audit.service';
import { AuditEntry } from '../../core/models';

@Component({
  selector: 'app-audit-page',
  standalone: true,
  imports: [NgIf, NgFor, DatePipe, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Activity</div>
          <div class="page-subtitle">Recent changes for the selected plan.</div>
        </div>
        <button mat-stroked-button (click)="load()">
          <mat-icon>refresh</mat-icon>
          Refresh
        </button>
      </div>

      <div class="card">
        <div *ngIf="loading()" style="opacity:.75;">Loading activity...</div>
        <div *ngIf="!loading() && rows().length===0" style="opacity:.75;">No activity yet.</div>

        <div *ngFor="let row of rows()" style="padding:14px 0; border-bottom:1px solid rgba(0,0,0,0.06);">
          <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
            <div style="font-weight:700;">{{ row.summary || (row.action + ' ' + row.entityType) }}</div>
            <div style="opacity:.7; font-size:12px;">{{ row.createdAt | date:'medium' }}</div>
          </div>
          <div style="opacity:.75; font-size:13px; margin-top:4px;">
            action: <b>{{ row.action }}</b> · entity: <b>{{ row.entityType }}</b> · user: <b>{{ row.userDisplayName || row.userEmail || row.userId }}</b>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AuditPageComponent {
  private audits = inject(AuditService);

  loading = signal(false);
  rows = signal<AuditEntry[]>([]);

  constructor() {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      this.rows.set(await this.audits.list());
    } finally {
      this.loading.set(false);
    }
  }
}
