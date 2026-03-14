import { Component, Inject, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

import { BudgetService } from '../../core/services/budget.service';
import { Expense } from '../../core/models';
import { I18nService } from '../../core/services/i18n.service';

type DialogData = { existing?: Expense };

@Component({
  selector: 'app-expense-dialog',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatInputModule, MatSlideToggleModule, TranslatePipe],
  template: `
  <h2 mat-dialog-title>{{data.existing ? ('edit' | t) : ('addExpense' | t)}}</h2>
  <div mat-dialog-content>
    <form [formGroup]="form" class="grid">
      <div class="col-6">
        <mat-form-field appearance="fill">
          <mat-label>{{ 'category' | t }}</mat-label>
          <input matInput formControlName="category" placeholder="Venue, Catering, Photo...">
        </mat-form-field>
      </div>
      <div class="col-6">
        <mat-form-field appearance="fill">
          <mat-label>{{ 'vendor' | t }}</mat-label>
          <input matInput formControlName="vendor" [placeholder]="'optional' | t">
        </mat-form-field>
      </div>
      <div class="col-6">
        <mat-form-field appearance="fill">
          <mat-label>{{ 'amount' | t }}</mat-label>
          <input matInput type="number" formControlName="amount" min="0">
        </mat-form-field>
      </div>
      <div class="col-6">
        <mat-form-field appearance="fill">
          <mat-label>{{ 'date' | t }}</mat-label>
          <input matInput formControlName="date" placeholder="YYYY-MM-DD">
        </mat-form-field>
      </div>
      <div class="col-12" style="display:flex; align-items:center; gap:10px; padding-top:6px;">
        <mat-slide-toggle formControlName="paid">{{ 'paid' | t }}</mat-slide-toggle>
        <span style="opacity:.8; font-size:12px;">{{ 'paid' | t }}</span>
      </div>
      <div class="col-12">
        <mat-form-field appearance="fill">
          <mat-label>{{ 'notes' | t }}</mat-label>
          <textarea matInput rows="3" formControlName="notes"></textarea>
        </mat-form-field>
      </div>
    </form>
  </div>
  <div mat-dialog-actions align="end">
    <button mat-button (click)="ref.close()">{{ 'cancel' | t }}</button>
    <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">
      {{data.existing ? i18n.t('save') : i18n.t('add')}}
    </button>
  </div>
  `
})
export class ExpenseDialogComponent {
  private svc = inject(BudgetService);
  readonly i18n = inject(I18nService);
  ref = inject(MatDialogRef<ExpenseDialogComponent>);

  form = new FormGroup({
    category: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    vendor: new FormControl('', { nonNullable: true }),
    amount: new FormControl<number>(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    date: new FormControl('', { nonNullable: true }),
    paid: new FormControl(false, { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {
    const ex = data.existing;
    if (ex) {
      this.form.setValue({
        category: ex.category,
        vendor: ex.vendor ?? '',
        amount: ex.amount,
        date: ex.date ?? '',
        paid: ex.paid,
        notes: ex.notes ?? '',
      });
    }
  }

  save() {
    const v = this.form.getRawValue();
    if (this.data.existing) {
      this.svc.updateExpense(this.data.existing.id, {
        category: v.category,
        vendor: v.vendor || undefined,
        amount: v.amount,
        date: v.date || undefined,
        paid: v.paid,
        notes: v.notes || undefined,
      });
    } else {
      this.svc.addExpense({
        category: v.category,
        vendor: v.vendor || undefined,
        amount: v.amount,
        date: v.date || undefined,
        paid: v.paid,
        notes: v.notes || undefined,
      });
    }
    this.ref.close();
  }
}
