import { Component, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import * as XLSX from 'xlsx';

import { InvitesService } from '../../core/services/invites.service';
import { RSVPStatus } from '../../core/models';

type NewFormatRow = {
  InviteName: string;          // Party.inviteName
  CompanionName?: string;      // Invitee.fullName (optional)
  ContactEmail?: string;       // Party.contact.email
  ContactPhone?: string | number; // Party.contact.phone
  RSVP?: string;
  MealChoice?: string;
  Notes?: string;              // person notes
  InviteNotes?: string;        // party notes
};

type PreviewRow = {
  InviteName: string;
  CompanionName: string;
  ContactEmail?: string;
  ContactPhone?: string;
  RSVP?: string;
  MealChoice?: string;
};

@Component({
  selector: 'app-excel-import-dialog',
  standalone: true,
  imports: [NgIf, NgFor, MatDialogModule, MatButtonModule, MatTableModule],
  template: `
  <h2 mat-dialog-title>Import invites from Excel</h2>

  <div mat-dialog-content>
    <p style="opacity:.85; margin-top:0; line-height:1.5;">
      Expected columns (case-insensitive):<br>
      <b>InviteName</b>, <b>CompanionName</b> (optional), <b>ContactEmail</b> (optional), <b>ContactPhone</b> (optional),
      <b>RSVP</b> (optional), <b>MealChoice</b> (optional), <b>Notes</b> (optional), <b>InviteNotes</b> (optional).<br><br>
      ✅ Each row can represent an additional companion for the same InviteName.
      If CompanionName is empty, we still create the invite with the primary person = InviteName.
    </p>

    <input type="file" accept=".xlsx,.xls" (change)="onFile($event)" />

    <div *ngIf="error" style="margin-top:10px; color:#b91c1c;">{{error}}</div>

    <div *ngIf="preview.length" style="margin-top:14px; overflow:auto; max-height:360px;">
      <table mat-table [dataSource]="preview" class="mat-elevation-z0" style="min-width:860px;">

        <ng-container matColumnDef="InviteName">
          <th mat-header-cell *matHeaderCellDef>Invite</th>
          <td mat-cell *matCellDef="let r">{{r.InviteName}}</td>
        </ng-container>

        <ng-container matColumnDef="CompanionName">
          <th mat-header-cell *matHeaderCellDef>Companion</th>
          <td mat-cell *matCellDef="let r">{{r.CompanionName}}</td>
        </ng-container>

        <ng-container matColumnDef="ContactEmail">
          <th mat-header-cell *matHeaderCellDef>Email</th>
          <td mat-cell *matCellDef="let r">{{r.ContactEmail || '—'}}</td>
        </ng-container>

        <ng-container matColumnDef="ContactPhone">
          <th mat-header-cell *matHeaderCellDef>Phone</th>
          <td mat-cell *matCellDef="let r">{{r.ContactPhone || '—'}}</td>
        </ng-container>

        <ng-container matColumnDef="RSVP">
          <th mat-header-cell *matHeaderCellDef>RSVP</th>
          <td mat-cell *matCellDef="let r">{{r.RSVP || 'PENDING'}}</td>
        </ng-container>

        <ng-container matColumnDef="MealChoice">
          <th mat-header-cell *matHeaderCellDef>Meal</th>
          <td mat-cell *matCellDef="let r">{{r.MealChoice || '—'}}</td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols;"></tr>
      </table>
    </div>

    <div *ngIf="preview.length" style="opacity:.75; font-size:13px; margin-top:10px;">
      Preview rows: {{preview.length}} (each row may add a companion; primary person is always auto-created from InviteName)
    </div>
  </div>

  <div mat-dialog-actions align="end">
    <button mat-button (click)="ref.close()">Cancel</button>
    <button mat-flat-button color="primary" [disabled]="!parsed.length" (click)="import()">
      Import {{parsed.length}}
    </button>
  </div>
  `
})
export class ExcelImportDialogComponent {
  private svc = inject(InvitesService);
  ref = inject(MatDialogRef<ExcelImportDialogComponent>);

  cols = ['InviteName','CompanionName','ContactEmail','ContactPhone','RSVP','MealChoice'];

  preview: PreviewRow[] = [];
  error = '';

  // full parsed data used for import
  parsed: NewFormatRow[] = [];

  async onFile(evt: Event) {
    this.error = '';
    this.preview = [];
    this.parsed = [];

    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];

      const rawRows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });
      if (!rawRows.length) {
        this.error = 'Empty sheet.';
        return;
      }

      // ✅ Normalize header names (trim leading/trailing spaces)
      const rows = rawRows.map(r => {
        const o: any = {};
        for (const k of Object.keys(r)) o[String(k).trim()] = r[k];
        return o;
      });

      // Validate required column(s)
      const keys = Object.keys(rows[0] || {}).map(k => k.toLowerCase());
      if (!keys.includes('invitename')) {
        this.error = 'Missing required column: InviteName';
        return;
      }

      const cleaned = this.clean(rows as any as NewFormatRow[])
        .filter(r => r.InviteName); // InviteName required; CompanionName optional

      if (!cleaned.length) {
        this.error = 'No valid rows found. Make sure InviteName is filled.';
        return;
      }

      this.parsed = cleaned;

      this.preview = cleaned.slice(0, 250).map(r => ({
        InviteName: r.InviteName,
        CompanionName: r.CompanionName || '—',
        ContactEmail: r.ContactEmail,
        ContactPhone: r.ContactPhone ? String(r.ContactPhone) : undefined,
        RSVP: r.RSVP,
        MealChoice: r.MealChoice,
      }));

      if (cleaned.length > 250) {
        this.error = `Preview shows first 250 rows; all ${cleaned.length} rows will be imported.`;
      }
    } catch (e) {
      this.error = 'Could not read the file. Please ensure it is a valid Excel .xlsx.';
    }
  }

  import() {
    const normalizeRSVP = (val?: string): RSVPStatus => {
      const v = (val || '').toUpperCase().trim();
      if (v === 'YES' || v === 'Y') return 'YES';
      if (v === 'NO' || v === 'N') return 'NO';
      if (v === 'MAYBE' || v === 'M') return 'MAYBE';
      return 'PENDING';
    };

    const normalizePhone = (val: any): string | undefined => {
      if (val === null || val === undefined || String(val).trim() === '') return undefined;
      return String(val).replace(/\.0$/, '').trim();
    };

    // Prevent wiping contact info when subsequent rows are blank
    const findPartyByInviteName = (inviteName: string) =>
      this.svc.snapshot.parties.find(p => (p.inviteName || '').toLowerCase() === inviteName.toLowerCase());

    for (const r of this.parsed) {
      const inviteName = r.InviteName.trim();
      const existingParty = findPartyByInviteName(inviteName);

      const email = r.ContactEmail?.trim() || undefined;
      const phone = normalizePhone(r.ContactPhone);

      // ✅ Upsert party without overwriting contact with blanks
      const party = this.svc.upsertParty(
        inviteName,
        {
          email: email ?? existingParty?.contact?.email,
          phone: phone ?? existingParty?.contact?.phone,
        },
        (r.InviteNotes || undefined) ?? existingParty?.notes
      );

      // ✅ Always ensure primary invitee = InviteName
      const primary = this.svc.upsertPrimaryInvitee(party.id, inviteName);

      // Apply RSVP to primary (your sheet has 1 RSVP column)
      const rsvp = normalizeRSVP(r.RSVP);
      this.svc.updateInvitee(primary.id, { rsvp });

      // ✅ Add companion (optional)
      const companion = (r.CompanionName || '').trim();
      if (companion && companion.toLowerCase() !== inviteName.toLowerCase()) {
        this.svc.addInvitee({
          partyId: party.id,
          fullName: companion,
          rsvp,
          mealChoice: r.MealChoice || undefined,
          notes: r.Notes || undefined,
        });
      }
    }

    this.ref.close(true);
  }

  private clean(rows: NewFormatRow[]): NewFormatRow[] {
    return rows.map(r => ({
      InviteName: String((r as any).InviteName || '').trim(),
      CompanionName: String((r as any).CompanionName || '').trim() || undefined,
      ContactEmail: String((r as any).ContactEmail || '').trim() || undefined,
      ContactPhone: (r as any).ContactPhone ?? undefined,
      RSVP: String((r as any).RSVP || '').trim() || undefined,
      MealChoice: String((r as any).MealChoice || '').trim() || undefined,
      Notes: String((r as any).Notes || '').trim() || undefined,
      InviteNotes: String((r as any).InviteNotes || '').trim() || undefined,
    }));
  }
}
