import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

import { BudgetService } from '../../core/services/budget.service';

@Component({
  selector: 'app-budget-settings-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatInputModule, MatSelectModule, TranslatePipe],
  template: `
  <h2 mat-dialog-title>{{ 'totalBudget' | t }}</h2>
  <div mat-dialog-content>
    <form [formGroup]="form" class="grid">
      <div class="col-8">
        <mat-form-field appearance="fill">
          <mat-label>{{ 'amount' | t }}</mat-label>
          <input matInput type="number" formControlName="totalBudget" min="0">
        </mat-form-field>
      </div>
      <div class="col-4">
        <mat-form-field appearance="fill">
          <mat-label>{{ 'currency' | t }}</mat-label>
          <mat-select formControlName="currency">
            <mat-option value="CAD">CAD</mat-option>
            <mat-option value="USD">USD</mat-option>
            <mat-option value="EUR">EUR</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
    </form>
  </div>
  <div mat-dialog-actions align="end">
    <button mat-button (click)="ref.close()">{{ 'cancel' | t }}</button>
    <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">{{ 'save' | t }}</button>
  </div>
  `
})
export class BudgetSettingsDialogComponent {
  private svc = inject(BudgetService);
  ref = inject(MatDialogRef<BudgetSettingsDialogComponent>);

  form = new FormGroup({
    totalBudget: new FormControl<number>(this.svc.snapshot.state.totalBudget, { nonNullable: true, validators: [Validators.min(0)] }),
    currency: new FormControl(this.svc.snapshot.state.currency, { nonNullable: true }),
  });

  save() {
    const v = this.form.getRawValue();
    this.svc.setTotalBudget(v.totalBudget, v.currency);
    this.ref.close();
  }
}
