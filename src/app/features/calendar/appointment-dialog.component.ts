import { Component, Inject, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { CalendarService } from '../../core/services/calendar.service';
import { Appointment } from '../../core/models';

type DialogData = { existing?: Appointment };

@Component({
  selector: 'app-appointment-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatInputModule, MatSelectModule],
  template: `
  <h2 mat-dialog-title>{{data.existing ? 'Edit appointment' : 'New appointment'}}</h2>
  <div mat-dialog-content>
    <form [formGroup]="form" class="grid">
      <div class="col-6">
        <mat-form-field appearance="fill">
          <mat-label>Type</mat-label>
          <mat-select formControlName="type">
            <mat-option value="WEDDING_PLANNER">Wedding planner</mat-option>
            <mat-option value="VENUE_MANAGER">Venue manager</mat-option>
            <mat-option value="PROVIDER">Provider</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
      <div class="col-6">
        <mat-form-field appearance="fill">
          <mat-label>With</mat-label>
          <input matInput formControlName="withWhom" placeholder="Name / company">
        </mat-form-field>
      </div>

      <div class="col-12">
        <mat-form-field appearance="fill">
          <mat-label>Title</mat-label>
          <input matInput formControlName="title">
        </mat-form-field>
      </div>

      <div class="col-6">
        <mat-form-field appearance="fill">
          <mat-label>Start (ISO)</mat-label>
          <input matInput formControlName="start" placeholder="2026-03-05T18:00:00">
        </mat-form-field>
      </div>
      <div class="col-6">
        <mat-form-field appearance="fill">
          <mat-label>End (ISO)</mat-label>
          <input matInput formControlName="end" placeholder="2026-03-05T18:45:00">
        </mat-form-field>
      </div>

      <div class="col-12">
        <mat-form-field appearance="fill">
          <mat-label>Location</mat-label>
          <input matInput formControlName="location" placeholder="Optional">
        </mat-form-field>
      </div>

      <div class="col-12">
        <mat-form-field appearance="fill">
          <mat-label>Notes</mat-label>
          <textarea matInput rows="3" formControlName="notes"></textarea>
        </mat-form-field>
      </div>
    </form>

    <div style="opacity:.7; font-size:12px;">
      Tip: paste ISO datetimes. We can upgrade this to a datetime picker later.
    </div>
  </div>
  <div mat-dialog-actions align="end">
    <button mat-button (click)="ref.close()">Cancel</button>
    <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">
      {{data.existing ? 'Save' : 'Create'}}
    </button>
  </div>
  `
})
export class AppointmentDialogComponent {
  private svc = inject(CalendarService);
  ref = inject(MatDialogRef<AppointmentDialogComponent>);

  form = new FormGroup({
    type: new FormControl<'WEDDING_PLANNER'|'VENUE_MANAGER'|'PROVIDER'>('WEDDING_PLANNER', { nonNullable: true }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    withWhom: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    start: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    end: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    location: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {
    const ex = data.existing;
    if (ex) {
      this.form.setValue({
        type: ex.type,
        title: ex.title,
        withWhom: ex.withWhom,
        start: ex.start,
        end: ex.end,
        location: ex.location ?? '',
        notes: ex.notes ?? '',
      });
    } else {
      // default: today 6pm-6:30pm
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2,'0');
      const isoDate = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      this.form.patchValue({
        start: `${isoDate}T18:00:00`,
        end: `${isoDate}T18:30:00`,
      });
    }
  }

  save() {
    const v = this.form.getRawValue();
    if (this.data.existing) {
      this.svc.updateAppointment(this.data.existing.id, {
        type: v.type,
        title: v.title,
        withWhom: v.withWhom,
        start: v.start,
        end: v.end,
        location: v.location || undefined,
        notes: v.notes || undefined,
      });
    } else {
      this.svc.addAppointment({
        type: v.type,
        title: v.title,
        withWhom: v.withWhom,
        start: v.start,
        end: v.end,
        location: v.location || undefined,
        notes: v.notes || undefined,
      });
    }
    this.ref.close();
  }
}
