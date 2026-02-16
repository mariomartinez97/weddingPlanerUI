import { Component, Inject, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { ChecklistService } from '../../core/services/checklist.service';
import { ChecklistItem } from '../../core/models';

type DialogData = { existing?: ChecklistItem };

@Component({
  selector: 'app-checklist-item-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatInputModule, MatCheckboxModule],
  template: `
  <h2 mat-dialog-title>{{data.existing ? 'Edit item' : 'Add checklist item'}}</h2>
  <div mat-dialog-content>
    <form [formGroup]="form" class="grid">
      <div class="col-12">
        <mat-form-field appearance="fill">
          <mat-label>Title</mat-label>
          <input matInput formControlName="title">
        </mat-form-field>
      </div>
      <div class="col-6">
        <mat-form-field appearance="fill">
          <mat-label>Owner</mat-label>
          <input matInput formControlName="owner" placeholder="Who is responsible?">
        </mat-form-field>
      </div>
      <div class="col-6">
        <mat-form-field appearance="fill">
          <mat-label>Due date</mat-label>
          <input matInput formControlName="dueDate" placeholder="YYYY-MM-DD (optional)">
        </mat-form-field>
      </div>
      <div class="col-12">
        <mat-form-field appearance="fill">
          <mat-label>Notes</mat-label>
          <textarea matInput rows="3" formControlName="notes"></textarea>
        </mat-form-field>
      </div>
      <div class="col-12">
        <mat-checkbox formControlName="done">Done</mat-checkbox>
      </div>
    </form>
  </div>
  <div mat-dialog-actions align="end">
    <button mat-button (click)="ref.close()">Cancel</button>
    <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">
      {{data.existing ? 'Save' : 'Add'}}
    </button>
  </div>
  `
})
export class ChecklistItemDialogComponent {
  private svc = inject(ChecklistService);
  ref = inject(MatDialogRef<ChecklistItemDialogComponent>);

  form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    owner: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    dueDate: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    done: new FormControl(false, { nonNullable: true }),
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {
    const ex = data.existing;
    if (ex) {
      this.form.setValue({
        title: ex.title,
        owner: ex.owner,
        dueDate: ex.dueDate ?? '',
        notes: ex.notes ?? '',
        done: ex.done,
      });
    }
  }

  save() {
    const v = this.form.getRawValue();
    if (this.data.existing) {
      this.svc.updateItem(this.data.existing.id, {
        title: v.title,
        owner: v.owner,
        dueDate: v.dueDate || undefined,
        notes: v.notes || undefined,
        done: v.done,
      });
    } else {
      this.svc.addItem({
        title: v.title,
        owner: v.owner,
        dueDate: v.dueDate || undefined,
        notes: v.notes || undefined,
        done: v.done,
      });
    }
    this.ref.close();
  }
}
