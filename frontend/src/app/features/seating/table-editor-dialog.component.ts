import { Component, inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { SeatingService } from '../../core/services/seating.service';
import { TableDef } from '../../core/models';
import { uid } from '../../core/services/storage.util';

@Component({
  selector: 'app-table-editor-dialog',
  standalone: true,
  imports: [NgFor, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatInputModule],
  styles: [`
    .hint { opacity:.78; font-size:13px; margin-bottom:12px; line-height:1.4; }
    .row-card { padding: 14px; border-radius: 16px; }
    .row-wrap { display:flex; gap:12px; align-items:flex-start; flex-wrap:wrap; }
    .field { flex:1 1 auto; min-width: 240px; }
    .seats { width: 170px; min-width: 170px; }
    .actions { display:flex; align-items:center; margin-top: 4px; }

    /* button icon/text spacing + vertical centering */
    .btn-gap mat-icon { margin-right: 8px; }
    .btn-gap { display:inline-flex; align-items:center; }
    .btn-gap .txt { line-height: 1; display:inline-flex; align-items:center; }

    .quick-row { display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; }
    .note { opacity:.72; font-size:12px; margin-top:12px; line-height:1.35; }
  `],
  template: `
  <h2 mat-dialog-title>Define tables</h2>

  <div mat-dialog-content>
    <div class="hint">
      Add/remove tables and set seat capacity per table.
    </div>

    <form [formGroup]="form" class="grid">
      <div class="col-12" formArrayName="tables">
        <div *ngFor="let g of tables.controls; let i=index"
             [formGroupName]="i"
             class="card row-card"
             style="margin-bottom:12px;">
          <div class="row-wrap">
            <div class="field">
              <mat-form-field appearance="fill" style="width:100%;">
                <mat-label>Table name</mat-label>
                <input matInput formControlName="name" placeholder="Table 1">
              </mat-form-field>
            </div>

            <div class="seats">
              <mat-form-field appearance="fill" style="width:100%;">
                <mat-label>Seats</mat-label>
                <input matInput type="number" min="1" formControlName="seats">
              </mat-form-field>
            </div>

            <div class="actions">
              <button type="button" mat-icon-button (click)="remove(i)" aria-label="remove">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>

    <div class="quick-row">
      <button type="button" mat-stroked-button (click)="add()">
        <span class="btn-gap"><mat-icon>add</mat-icon><span class="txt">Add table</span></span>
      </button>

      <button type="button" mat-stroked-button (click)="quickCreate(10, 8)">
        10 tables × 8 seats
      </button>

      <button type="button" mat-stroked-button (click)="quickCreate(12, 10)">
        12 tables × 10 seats
      </button>
    </div>

    <div class="note">
      Note: if you remove a table, any assignments in that table will be removed.
    </div>
  </div>

  <div mat-dialog-actions align="end" style="gap:10px;">
    <button type="button" mat-button (click)="ref.close()">Cancel</button>
    <button type="button" mat-flat-button color="primary" [disabled]="tables.length===0" (click)="save()">Save</button>
  </div>
  `
})
export class TableEditorDialogComponent {
  private seating = inject(SeatingService);
  ref = inject(MatDialogRef<TableEditorDialogComponent>);

  form = new FormGroup({
    tables: new FormArray<FormGroup>([])
  });

  get tables() { return this.form.controls.tables as FormArray<FormGroup>; }

  constructor() {
    const current = this.seating.snapshot.tables;
    if (current.length) current.forEach(t => this.tables.push(this.groupFor(t)));
    else this.add();
  }

  groupFor(t?: TableDef) {
    return new FormGroup({
      id: new FormControl(t?.id ?? uid('tbl'), { nonNullable: true }),
      name: new FormControl(t?.name ?? '', { nonNullable: true, validators: [Validators.required] }),
      seats: new FormControl<number>(
        t?.seats ?? 8,
        { nonNullable: true, validators: [Validators.required, Validators.min(1)] }
      )
    });
  }

  add() { this.tables.push(this.groupFor()); }

  remove(i: number) { this.tables.removeAt(i); }

  quickCreate(count: number, seats: number) {
    while (this.tables.length) this.tables.removeAt(0);
    for (let i = 1; i <= count; i++) {
      this.tables.push(this.groupFor({ id: uid('tbl'), name: `Table ${i}`, seats }));
    }
  }

  save() {
    const raw = this.tables.getRawValue() as any[];
    const tables: TableDef[] = raw.map(r => ({ id: r.id, name: r.name, seats: Number(r.seats) }));
    this.seating.setTables(tables);
    this.ref.close();
  }
}
