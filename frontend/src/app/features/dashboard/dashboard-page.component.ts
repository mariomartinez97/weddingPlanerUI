import { Component, computed, inject } from '@angular/core';
import { NgFor, NgIf, DatePipe, CurrencyPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { InvitesService } from '../../core/services/invites.service';
import { CalendarService } from '../../core/services/calendar.service';
import { BudgetService } from '../../core/services/budget.service';
import { ChecklistService } from '../../core/services/checklist.service';

import { Appointment, Invitee, RSVPStatus } from '../../core/models';

type Slice = { label: string; value: number; color?: string };
type Seg = { d: string; color: string };

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [NgIf, NgFor, DatePipe, CurrencyPipe, MatCardModule, MatIconModule],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Dashboard</div>
        <div class="page-subtitle">Quick overview of invites, calendar, checklist and budget.</div>
      </div>
    </div>

    <div class="grid">
      <!-- Invites pie -->
      <div class="col-6 card">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:14px;">
          <div>
            <div style="font-weight:800; font-size:16px;">Invites & RSVP</div>
            <div style="opacity:.75; font-size:13px;">
              Total: <b>{{ inviteTotal() }}</b>
            </div>
          </div>
        </div>

        <div style="display:flex; gap:18px; align-items:center; flex-wrap:wrap; margin-top:14px;">
          <div class="pie-wrap">
            <svg [attr.width]="160" [attr.height]="160" viewBox="0 0 160 160">
              <g transform="translate(80 80)">
                <ng-container *ngFor="let seg of invitePieSegments()">
                  <path [attr.d]="seg.d" [attr.fill]="seg.color"></path>
                </ng-container>
                <circle r="44" fill="var(--panel)"></circle>
                <text text-anchor="middle" dy="5" style="font-size:14px; font-weight:800;">
                  {{ inviteTotal() }}
                </text>
              </g>
            </svg>
          </div>

          <div style="display:flex; flex-direction:column; gap:10px; min-width:220px;">
            <div class="legend-row" *ngFor="let s of inviteSlices()">
              <span class="dot" [style.background]="s.color"></span>
              <span style="flex:1;">{{ s.label }}</span>
              <b>{{ s.value }}</b>
            </div>
          </div>
        </div>
      </div>

      <!-- Budget pie -->
      <div class="col-6 card">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:14px;">
          <div>
            <div style="font-weight:800; font-size:16px;">Budget breakdown</div>
            <div style="opacity:.75; font-size:13px;">
              Total spent:
              <b>{{ totalSpent() | currency: currencyCode():'symbol':'1.0-0' }}</b>
              <span style="opacity:.75;">
                / {{ totalBudget() | currency: currencyCode():'symbol':'1.0-0' }}
              </span>
            </div>
          </div>
        </div>

        <div style="display:flex; gap:18px; align-items:center; flex-wrap:wrap; margin-top:14px;">
          <div class="pie-wrap">
            <svg [attr.width]="160" [attr.height]="160" viewBox="0 0 160 160">
              <g transform="translate(80 80)">
                <ng-container *ngFor="let seg of budgetPieSegments()">
                  <path [attr.d]="seg.d" [attr.fill]="seg.color"></path>
                </ng-container>
                <circle r="44" fill="var(--panel)"></circle>
                <text text-anchor="middle" dy="-2" style="font-size:12px; font-weight:800;">
                  {{ totalSpent() | currency: currencyCode():'symbol':'1.0-0' }}
                </text>
                <text text-anchor="middle" dy="14" style="font-size:11px; opacity:.75;">
                  spent
                </text>
              </g>
            </svg>
          </div>

          <div style="display:flex; flex-direction:column; gap:10px; min-width:220px;">
            <div class="legend-row" *ngFor="let s of budgetSlices()">
              <span class="dot" [style.background]="s.color"></span>
              <span style="flex:1;">{{ s.label }}</span>
              <b>{{ s.value | currency: currencyCode():'symbol':'1.0-0' }}</b>
            </div>
          </div>
        </div>

        <div *ngIf="budgetSlices().length===0" style="opacity:.75; padding-top:12px;">
          Add expenses to see the breakdown.
        </div>
      </div>

      <!-- Next appointments -->
      <div class="col-6 card">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div style="font-weight:800; font-size:16px;">Next 3 appointments</div>
          <mat-icon style="opacity:.6;">event</mat-icon>
        </div>

        <div *ngIf="nextAppointments().length===0" style="opacity:.75; padding-top:12px;">
          No upcoming appointments.
        </div>

        <div *ngFor="let a of nextAppointments()" class="row">
          <div class="badge" [style.background]="typeColor(a.type)"></div>
          <div style="flex:1;">
            <div style="font-weight:800;">{{ a.title }}</div>
            <div style="opacity:.75; font-size:13px;">
              {{ a.start | date:'EEE, MMM d' }} · {{ a.start | date:'shortTime' }} – {{ a.end | date:'shortTime' }}
              <span *ngIf="a.location"> · {{ a.location }}</span>
            </div>
            <div style="opacity:.75; font-size:12px;">With: <b>{{ a.withWhom }}</b></div>
          </div>
        </div>
      </div>

      <!-- Top todos -->
      <div class="col-6 card">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div style="font-weight:800; font-size:16px;">Top 5 to-do items</div>
          <mat-icon style="opacity:.6;">checklist</mat-icon>
        </div>

        <div *ngIf="topTodos().length===0" style="opacity:.75; padding-top:12px;">
          No pending tasks 🎉
        </div>

        <div *ngFor="let t of topTodos()" class="row">
          <div class="todo-dot"></div>
          <div style="flex:1;">
            <div style="font-weight:800;">{{ t.title }}</div>
            <div style="opacity:.75; font-size:13px;">
              Owner: <b>{{ t.owner || '—' }}</b>
              <span *ngIf="t.dueDate"> · Due: {{ t.dueDate | date:'MMM d' }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
  `,
  styles: [`
    .pie-wrap { width:160px; height:160px; }
    .legend-row { display:flex; gap:10px; align-items:center; font-size:13px; }
    .dot { width:10px; height:10px; border-radius:999px; display:inline-block; }
    .row { display:flex; gap:12px; padding:14px 0; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .badge { width:10px; height:10px; border-radius:50%; margin-top:6px; }
    .todo-dot { width:10px; height:10px; border-radius:50%; margin-top:6px; background: rgba(0,0,0,0.25); }
  `]
})
export class DashboardPageComponent {
  invites = inject(InvitesService);
  calendar = inject(CalendarService);
  budget = inject(BudgetService);
  checklist = inject(ChecklistService);
  private invitesStore = toSignal(this.invites.storeObs$, { initialValue: this.invites.snapshot });
  private calendarStore = toSignal(this.calendar.storeObs$, { initialValue: this.calendar.snapshot });
  private budgetStore = toSignal(this.budget.storeObs$, { initialValue: this.budget.snapshot });
  private checklistStore = toSignal(this.checklist.storeObs$, { initialValue: this.checklist.snapshot });

  // ---------- Invites pie ----------
  inviteSlices = computed((): Slice[] => {
    const all: Invitee[] = this.invitesStore().invitees ?? [];
    const counts: Record<RSVPStatus, number> = { YES: 0, NO: 0, MAYBE: 0, PENDING: 0 };

    for (const i of all) counts[i.rsvp]++;

    return [
      { label: 'Yes',     value: counts.YES,     color: '#3b82f6' },
      { label: 'Pending', value: counts.PENDING, color: '#94a3b8' },
      { label: 'No',      value: counts.NO,      color: '#ef4444' },
      { label: 'Maybe',   value: counts.MAYBE,   color: '#f59e0b' },
    ];
  });

  inviteTotal = computed(() => this.inviteSlices().reduce((s, x) => s + x.value, 0));
  invitePieSegments = computed(() => this.toPieSegments(this.inviteSlices(), 72));

  // ---------- Calendar widget ----------
  nextAppointments = computed((): Appointment[] => {
    const all = this.calendarStore().appointments ?? [];
    const now = new Date().toISOString();
    return [...all]
      .filter(a => a.start >= now)
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 3);
  });

  // ---------- Checklist widget ----------
  topTodos = computed(() => {
    const all = this.checklistStore().items ?? [];
    return [...all]
      .filter(t => !t.done)
      .sort((a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31'))
      .slice(0, 5);
  });

  // ---------- Budget pie ----------
  currencyCode = computed(() => this.budgetStore().state.currency ?? 'CAD');
  totalBudget = computed(() => this.budgetStore().state.totalBudget ?? 0);

  totalSpent = computed(() => {
    const ex = this.budgetStore().expenses ?? [];
    return ex.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  });

  budgetSlices = computed((): Slice[] => {
    const ex = this.budgetStore().expenses ?? [];
    const map = new Map<string, number>();

    for (const e of ex) {
      const key = e.category || e.vendor || 'Other';
      map.set(key, (map.get(key) || 0) + (Number(e.amount) || 0));
    }

    const rows: Slice[] = [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const colors = ['#3b82f6', '#0ea5e9', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'];
    rows.forEach((r, idx) => (r.color = colors[idx % colors.length]));

    return rows;
  });

  budgetPieSegments = computed(() => this.toPieSegments(this.budgetSlices(), 72));

  typeColor(t: Appointment['type']) {
    if (t === 'WEDDING_PLANNER') return '#3b82f6';
    if (t === 'VENUE_MANAGER') return '#0ea5e9';
    return '#94a3b8';
  }

  // ---------- SVG pie helpers ----------
  private toPieSegments(slices: Slice[], r: number): Seg[] {
    const total = slices.reduce((s, x) => s + x.value, 0);
    const safeTotal = total <= 0 ? 1 : total;
    const EPS = 1e-6;

    let start = -Math.PI / 2;
    return slices
      .filter(s => s.value > 0)
      .map(s => {
        const ratio = s.value / safeTotal;
        const angle = ratio * Math.PI * 2;
        const end = start + angle;
        // A 100% slice needs a dedicated full-circle path; an SVG arc where start=end won't render.
        const d = Math.abs(ratio - 1) < EPS
          ? this.fullCirclePath(0, 0, r)
          : this.arcPath(0, 0, r, start, end);
        const seg = { d, color: s.color || '#94a3b8' };
        start = end;
        return seg;
      });
  }

  private arcPath(cx: number, cy: number, r: number, start: number, end: number) {
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);

    const largeArc = (end - start) > Math.PI ? 1 : 0;

    return [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      `Z`,
    ].join(' ');
  }

  private fullCirclePath(cx: number, cy: number, r: number) {
    return [
      `M ${cx} ${cy}`,
      `m ${-r}, 0`,
      `a ${r},${r} 0 1,0 ${2 * r},0`,
      `a ${r},${r} 0 1,0 ${-2 * r},0`,
      'Z',
    ].join(' ');
  }
}
