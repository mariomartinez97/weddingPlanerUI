import { Component, computed, inject, signal } from '@angular/core';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

import { CalendarService } from '../../core/services/calendar.service';
import { Appointment } from '../../core/models';
import { AppointmentDialogComponent } from './appointment-dialog.component';
import { I18nService } from '../../core/services/i18n.service';

function toISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [
    NgIf, NgFor, DatePipe,
    MatButtonModule, MatIconModule, MatDialogModule,
    MatChipsModule, MatMenuModule, TranslatePipe
  ],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <div class="page-title">{{ 'calendarTitle' | t }}</div>
        <div class="page-subtitle">{{ 'calendarSubtitle' | t }}</div>
      </div>
      <button mat-flat-button color="primary" (click)="open()">
        <mat-icon>add</mat-icon> {{ 'newAppointment' | t }}
      </button>
    </div>

    <div class="card">

      <div style="opacity:.75; font-size:12px; margin-bottom:12px;">
        {{ filteredRows().length }} {{ 'appointmentCount' | t }}
      </div>

      <div *ngIf="filteredRows().length===0" style="padding:14px 0; opacity:.8;">
        {{ 'noAppointmentsYet' | t }}
      </div>

      <div *ngFor="let a of filteredRows()" 
           style="display:flex; align-items:flex-start; gap:12px; padding:16px 0; border-bottom: 1px solid rgba(255,255,255,0.10);">

        <div style="width:10px; height:10px; border-radius:50%; margin-top:6px;"
             [style.background]="dotColor(a.type)">
        </div>

        <div style="flex:1 1 auto;">
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <div style="font-weight:800">{{a.title}}</div>
            <span style="opacity:.75; font-size:12px;">{{ label(a.type) }}</span>
          </div>

          <div style="opacity:.85; margin-top:4px;">
            {{fullDate(a.start)}} · {{timeRange(a)}}
            <span *ngIf="a.location"> · {{a.location}}</span>
          </div>

          <div style="opacity:.75; font-size:12px; margin-top:4px;">
            {{ 'withLabel' | t }}: <b>{{a.withWhom}}</b>
          </div>

          <div *ngIf="a.notes" style="opacity:.8; font-size:13px; margin-top:6px;">
            {{a.notes}}
          </div>
        </div>

        <button mat-icon-button [matMenuTriggerFor]="menu">
          <mat-icon>more_vert</mat-icon>
        </button>

        <mat-menu #menu="matMenu">
          <button mat-menu-item (click)="open(a)">
            <mat-icon>edit</mat-icon> {{ 'edit' | t }}
          </button>
          <button mat-menu-item (click)="del(a)">
            <mat-icon>delete</mat-icon> {{ 'delete' | t }}
          </button>
        </mat-menu>
      </div>

    </div>
  </div>
  `
})
export class CalendarPageComponent {
  readonly svc = inject(CalendarService);
  private i18n = inject(I18nService);
  private dialog = inject(MatDialog);
  private store = toSignal(this.svc.storeObs$, { initialValue: this.svc.snapshot });

  typeFilter = signal<'ALL'|'WEDDING_PLANNER'|'VENUE_MANAGER'|'PROVIDER'>('ALL');

  filteredRows = computed(() => {
    const all = this.store().appointments;

    return [...all].sort((a,b) => a.start.localeCompare(b.start));
  });

  open(existing?: Appointment) {
    this.dialog.open(AppointmentDialogComponent, { 
      width: '600px', 
      data: { existing } 
    });
  }

  del(a: Appointment) {
    if (!confirm(this.i18n.t('deleteAppointmentConfirm'))) return;
    this.svc.deleteAppointment(a.id);
  }

  label(t: Appointment['type']) {
    if (t === 'WEDDING_PLANNER') return this.i18n.t('weddingPlanner');
    if (t === 'VENUE_MANAGER') return this.i18n.t('venueManager');
    return this.i18n.t('provider');
  }

  dotColor(t: Appointment['type']) {
    if (t === 'WEDDING_PLANNER') return '#9AE6B4';
    if (t === 'VENUE_MANAGER') return '#90CDF4';
    return '#FBD38D';
  }

  timeRange(a: Appointment) {
    const s = new Date(a.start);
    const e = new Date(a.end);
    const fmt = (d: Date) => d.toLocaleTimeString(this.i18n.locale(), { hour: '2-digit', minute: '2-digit' });
    return `${fmt(s)} – ${fmt(e)}`;
  }

  fullDate(value: string) {
    return new Intl.DateTimeFormat(this.i18n.locale(), {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(value));
  }
}
