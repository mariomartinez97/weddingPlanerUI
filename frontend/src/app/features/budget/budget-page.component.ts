import { Component, computed, inject } from '@angular/core';
import { NgIf, NgFor, CurrencyPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { BudgetService } from '../../core/services/budget.service';
import { BudgetSettingsDialogComponent } from './budget-settings-dialog.component';
import { ExpenseDialogComponent } from './expense-dialog.component';
import { Expense } from '../../core/models';

@Component({
  selector: 'app-budget-page',
  standalone: true,
  imports: [
    NgIf, NgFor, CurrencyPipe,
    MatButtonModule, MatIconModule, MatDialogModule, MatTableModule, MatSlideToggleModule
  ],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Budget</div>
        <div style="opacity:.8; font-size:13px;">Set total budget, track expenses, see remaining.</div>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button mat-stroked-button (click)="openSettings()"><mat-icon>tune</mat-icon> Set Total Budget</button>
        <button mat-flat-button color="primary" (click)="openExpense()"><mat-icon>add</mat-icon> Add Expense</button>
      </div>
    </div>

    <div class="grid">
      <div class="col-4 card">
        <div style="opacity:.75; font-size:13px;">Total budget</div>
        <div style="font-size:26px; font-weight:800; margin-top:6px;">
          {{ total() | currency:currency():'symbol':'1.0-0' }}
        </div>
      </div>
      <div class="col-4 card">
        <div style="opacity:.75; font-size:13px;">Total spent</div>
        <div style="font-size:26px; font-weight:800; margin-top:6px;">
          {{ spent() | currency:currency():'symbol':'1.0-0' }}
        </div>
        <div style="opacity:.75; font-size:12px; margin-top:6px;">
          Paid: {{ paidTotal() | currency:currency():'symbol':'1.0-0' }} · Unpaid: {{ unpaidTotal() | currency:currency():'symbol':'1.0-0' }}
        </div>
      </div>
      <div class="col-4 card">
        <div style="opacity:.75; font-size:13px;">Remaining</div>
        <div style="font-size:26px; font-weight:800; margin-top:6px;" [style.color]="remaining() < 0 ? '#ffb4b4' : ''">
          {{ remaining() | currency:currency():'symbol':'1.0-0' }}
        </div>
      </div>

      <div class="col-12 card" style="overflow:auto;">
        <table mat-table [dataSource]="expenses()" class="mat-elevation-z0" style="min-width:980px;">
          <ng-container matColumnDef="category"><th mat-header-cell *matHeaderCellDef>Category</th><td mat-cell *matCellDef="let e">{{e.category}}</td></ng-container>
          <ng-container matColumnDef="vendor"><th mat-header-cell *matHeaderCellDef>Vendor</th><td mat-cell *matCellDef="let e">{{e.vendor || '—'}}</td></ng-container>
          <ng-container matColumnDef="amount"><th mat-header-cell *matHeaderCellDef>Amount</th><td mat-cell *matCellDef="let e">{{e.amount | currency:currency()}}</td></ng-container>
          <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Date</th><td mat-cell *matCellDef="let e">{{e.date || '—'}}</td></ng-container>
          <ng-container matColumnDef="paid">
            <th mat-header-cell *matHeaderCellDef>Paid</th>
            <td mat-cell *matCellDef="let e">
              <mat-slide-toggle [checked]="e.paid" (change)="togglePaid(e, $event.checked)"></mat-slide-toggle>
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let e" style="text-align:right;">
              <button mat-icon-button (click)="openExpense(e)"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button (click)="del(e)"><mat-icon>delete</mat-icon></button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>

        <div *ngIf="expenses().length===0" style="padding:18px; opacity:.8;">
          No expenses yet. Add your first expense.
        </div>
      </div>
    </div>
  </div>
  `
})
export class BudgetPageComponent {
  private svc = inject(BudgetService);
  private dialog = inject(MatDialog);
  private store = toSignal(this.svc.storeObs$, { initialValue: this.svc.snapshot });

  cols = ['category','vendor','amount','date','paid','actions'];

  currency = computed(() => this.store().state.currency);
  total = computed(() => this.store().state.totalBudget);
  expenses = computed(() => this.store().expenses);

  spent = computed(() => this.expenses().reduce((s, e) => s + (e.amount || 0), 0));
  paidTotal = computed(() => this.expenses().filter(e => e.paid).reduce((s, e) => s + e.amount, 0));
  unpaidTotal = computed(() => this.expenses().filter(e => !e.paid).reduce((s, e) => s + e.amount, 0));
  remaining = computed(() => this.total() - this.spent());

  openSettings() {
    this.dialog.open(BudgetSettingsDialogComponent, { width: '520px' });
  }

  openExpense(existing?: Expense) {
    this.dialog.open(ExpenseDialogComponent, { width: '560px', data: { existing } });
  }

  togglePaid(e: Expense, paid: boolean) {
    this.svc.updateExpense(e.id, { paid });
  }

  del(e: Expense) {
    if (!confirm('Delete this expense?')) return;
    this.svc.deleteExpense(e.id);
  }
}
