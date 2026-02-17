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
  CompanionName: string;       // Invitee.fullName
  ContactEmail?: string;       // Party.contact.email
  ContactPhone?: string | number; // can come as number from Excel
  RSVP?: string;
  MealChoice?: string;
  Notes?: string;              // person notes
  InviteNotes?: string;        // party notes
};

type OldFormatRow = {
  Party: string;
  FirstName: string;
  LastName: string;
  Email?: string;
  Phone?: string | number;
  RSVP?: string;
  MealChoice?: string;
  Notes?: string;
};

type PreviewRow = {
  InviteName: string;
  CompanionName: string;
  ContactEmail?: string;
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
      Supported formats:
      <br><b>New format (recommended):</b> InviteName, CompanionName, ContactEmail, ContactPhone, RSVP, MealChoice, Notes, InviteNotes
      <br><b>Old format (legacy):</b> Party, FirstName, LastName, Email, Phone, RSVP, MealChoice, Notes
    </p>

    <input type="file" accept=".xlsx,.xls" (change)="onFile($event)" />

    <div *ngIf="error" style="margin-top:10px; color:#b91c1c;">{{error}}</div>

    <div *ngIf="preview.length" style="margin-top:14px; overflow:auto; max-height:360px;">
      <table mat-table [dataSource]="preview" class="mat-elevation-z0" style="min-width:760px;">
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
      Rows: {{preview.length}} (each row = one companion/person)
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

  cols = ['InviteName','CompanionName','ContactEmail','RSVP','MealChoice'];

  preview: PreviewRow[] = [];
  error = '';

  // full parsed data kept for import
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

      const rawRows = XLSX.utils
        .sheet_to_json<any>(sheet, { defval: '' })
        .map(r => this.normalizeRowKeys(r));
      if (!rawRows.length) {
        this.error = 'Empty sheet.';
        return;
      }

      const first = rawRows[0] || {};
      const keys = Object.keys(first).map(k => k.trim().toLowerCase());

      const isNew = keys.includes('invitename') && keys.includes('companionname');
      const isOld = keys.includes('party') && keys.includes('firstname') && keys.includes('lastname');

      if (!isNew && !isOld) {
        this.error =
          'Unrecognized columns. Use either: ' +
          'InviteName, CompanionName, ContactEmail, ContactPhone, RSVP, MealChoice, Notes, InviteNotes ' +
          'OR Party, FirstName, LastName, Email, Phone, RSVP, MealChoice, Notes.';
        return;
      }

      const cleaned: NewFormatRow[] = (isNew
        ? this.cleanNew(rawRows as NewFormatRow[])
        : this.convertOldToNew(this.cleanOld(rawRows as OldFormatRow[]))
      ).filter(r => r.InviteName);

      if (!cleaned.length) {
        this.error = 'No valid rows found. Make sure InviteName is filled (or Party + FirstName + LastName for old format).';
        return;
      }

      this.parsed = cleaned;

      this.preview = cleaned.slice(0, 250).map(r => ({
        InviteName: r.InviteName,
        CompanionName: r.CompanionName,
        ContactEmail: r.ContactEmail,
        RSVP: r.RSVP,
        MealChoice: r.MealChoice,
      }));

      if (cleaned.length > 250) {
        this.error = `Preview shows first 250 rows; all ${cleaned.length} rows will be imported.`;
      }
    } catch {
      this.error = 'Could not read the file. Please ensure it is a valid Excel .xlsx.';
    }
  }

  async import() {
    const normalizeRSVP = (val?: string): RSVPStatus => {
      const v = (val || '').toUpperCase().trim();
      if (v === 'YES' || v === 'Y') return 'YES';
      if (v === 'NO' || v === 'N') return 'NO';
      if (v === 'MAYBE' || v === 'M') return 'MAYBE';
      return 'PENDING';
    };

    const partyByInvite = new Map<string, Awaited<ReturnType<InvitesService['upsertParty']>>>();
    const addedCompanions = new Set<string>();

    for (const r of this.parsed) {
      const inviteName = String(r.InviteName || '').trim();
      const companionName = String(r.CompanionName || '').trim();

      if (!inviteName) continue;

      // Backend owns primary creation -> avoid duplicates by skipping row where companion == inviteName
      const isPrimaryRow = companionName.toLowerCase() === inviteName.toLowerCase();

      let party = partyByInvite.get(inviteName.toLowerCase());
      if (!party) {
        party = await this.svc.upsertParty(
          inviteName,
          {
            email: (r.ContactEmail ? String(r.ContactEmail).trim() : '') || undefined,
            phone: (r.ContactPhone !== undefined && r.ContactPhone !== null && String(r.ContactPhone).trim() !== '')
              ? String(r.ContactPhone).trim()
              : undefined,
          },
          (r.InviteNotes ? String(r.InviteNotes).trim() : '') || undefined
        );
        partyByInvite.set(inviteName.toLowerCase(), party);
      }

      if (!companionName || isPrimaryRow) {
        // Do nothing: backend will create the primary person automatically
        continue;
      }

      const companionKey = `${party.id}::${companionName.toLowerCase()}`;
      if (addedCompanions.has(companionKey)) continue;
      addedCompanions.add(companionKey);

      await this.svc.addInvitee({
        partyId: party.id,
        fullName: companionName,
        rsvp: normalizeRSVP(r.RSVP),
        mealChoice: (r.MealChoice ? String(r.MealChoice).trim() : '') || undefined,
        notes: (r.Notes ? String(r.Notes).trim() : '') || undefined,
      });
    }

    this.ref.close(true);
  }

  // ---------- Cleaning helpers ----------

  private cleanNew(rows: NewFormatRow[]): NewFormatRow[] {
    return rows.map(r => ({
      InviteName: String((r as any).InviteName || '').trim(),
      CompanionName: String((r as any).CompanionName || '').trim(),
      ContactEmail: String((r as any).ContactEmail || '').trim() || undefined,
      ContactPhone: (r as any).ContactPhone ?? undefined, // keep raw, convert later
      RSVP: String((r as any).RSVP || '').trim() || undefined,
      MealChoice: String((r as any).MealChoice || '').trim() || undefined,
      Notes: String((r as any).Notes || '').trim() || undefined,
      InviteNotes: String((r as any).InviteNotes || '').trim() || undefined,
    }));
  }

  private cleanOld(rows: OldFormatRow[]): OldFormatRow[] {
    return rows.map(r => ({
      Party: String((r as any).Party || '').trim(),
      FirstName: String((r as any).FirstName || '').trim(),
      LastName: String((r as any).LastName || '').trim(),
      Email: String((r as any).Email || '').trim() || undefined,
      Phone: (r as any).Phone ?? undefined,
      RSVP: String((r as any).RSVP || '').trim() || undefined,
      MealChoice: String((r as any).MealChoice || '').trim() || undefined,
      Notes: String((r as any).Notes || '').trim() || undefined,
    }));
  }

  private convertOldToNew(rows: OldFormatRow[]): NewFormatRow[] {
    return rows
      .filter(r => r.Party && r.FirstName && r.LastName)
      .map(r => ({
        InviteName: r.Party,
        CompanionName: `${r.FirstName} ${r.LastName}`.trim(),
        ContactEmail: r.Email,
        ContactPhone: r.Phone,
        RSVP: r.RSVP,
        MealChoice: r.MealChoice,
        Notes: r.Notes,
        InviteNotes: undefined,
      }));
  }

  private normalizeRowKeys<T extends Record<string, any>>(row: T): Record<string, any> {
    const normalized: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[String(key).trim()] = value;
    }
    return normalized;
  }
}
