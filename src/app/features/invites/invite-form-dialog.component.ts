import { Component, Inject, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';

import { Invitee, Party, RSVPStatus } from '../../core/models';
import { InvitesService } from '../../core/services/invites.service';

type DialogData = {
  existingInvitee?: Invitee;   // editing a companion/person
  existingParty?: Party;       // editing invite (main)
};

@Component({
  selector: 'app-invite-form-dialog',
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatInputModule, MatSelectModule, MatDividerModule
  ],
  template: `
  <h2 mat-dialog-title>{{ title() }}</h2>

  <div mat-dialog-content>
    <!-- ============================
         EDIT COMPANION ONLY
         (do NOT show invite editing)
         ============================ -->
    <ng-container *ngIf="isEditingPerson(); else inviteFlow">
      <div class="section">
        <div class="section-title">Companion (person)</div>

        <form [formGroup]="personForm" class="grid">
          <div class="col-12">
            <mat-form-field appearance="fill">
              <mat-label>Companion full name</mat-label>
              <input matInput formControlName="fullName" placeholder="e.g., Juan Gomez">
            </mat-form-field>
          </div>

          <div class="col-6">
            <mat-form-field appearance="fill">
              <mat-label>RSVP</mat-label>
              <mat-select formControlName="rsvp">
                <mat-option value="PENDING">Pending</mat-option>
                <mat-option value="YES">Yes</mat-option>
                <mat-option value="NO">No</mat-option>
                <mat-option value="MAYBE">Maybe</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="col-6">
            <mat-form-field appearance="fill">
              <mat-label>Meal choice</mat-label>
              <input matInput formControlName="mealChoice" placeholder="Optional">
            </mat-form-field>
          </div>

          <div class="col-12">
            <mat-form-field appearance="fill">
              <mat-label>Person notes</mat-label>
              <textarea matInput rows="2" formControlName="personNotes" placeholder="Optional"></textarea>
            </mat-form-field>
          </div>
        </form>
      </div>
    </ng-container>

    <!-- ============================
         NEW INVITE / EDIT INVITE FLOW
         ============================ -->
    <ng-template #inviteFlow>
      <!-- INVITE (Main) -->
      <div class="section">
        <div class="section-title">Invite (main)</div>

        <form [formGroup]="partyForm" class="grid">
          <div class="col-12">
            <mat-form-field appearance="fill">
              <mat-label>Invite name</mat-label>
              <input matInput formControlName="inviteName" placeholder="e.g., Juan Gomez">
            </mat-form-field>
          </div>

          <div class="col-6">
            <mat-form-field appearance="fill">
              <mat-label>Contact email</mat-label>
              <input matInput formControlName="email" placeholder="Optional">
            </mat-form-field>
          </div>

          <div class="col-6">
            <mat-form-field appearance="fill">
              <mat-label>Contact phone</mat-label>
              <input matInput formControlName="phone" placeholder="Optional">
            </mat-form-field>
          </div>

          <div class="col-12">
            <mat-form-field appearance="fill">
              <mat-label>Invite notes</mat-label>
              <textarea matInput rows="2" formControlName="partyNotes" placeholder="Optional"></textarea>
            </mat-form-field>
          </div>
        </form>
      </div>

      <mat-divider style="margin: 14px 0;"></mat-divider>

      <!-- OPTIONAL extra companion (never used for the primary) -->
      <div class="section">
        <div class="section-title">Add companion (optional)</div>

        <form [formGroup]="companionAddForm" class="grid">
          <div class="col-12">
            <mat-form-field appearance="fill">
              <mat-label>Companion full name</mat-label>
              <input matInput formControlName="fullName" placeholder="Optional (e.g., Sofia Chen)">
            </mat-form-field>
          </div>

          <div class="col-6">
            <mat-form-field appearance="fill">
              <mat-label>RSVP</mat-label>
              <mat-select formControlName="rsvp">
                <mat-option value="PENDING">Pending</mat-option>
                <mat-option value="YES">Yes</mat-option>
                <mat-option value="NO">No</mat-option>
                <mat-option value="MAYBE">Maybe</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="col-6">
            <mat-form-field appearance="fill">
              <mat-label>Meal choice</mat-label>
              <input matInput formControlName="mealChoice" placeholder="Optional">
            </mat-form-field>
          </div>

          <div class="col-12">
            <mat-form-field appearance="fill">
              <mat-label>Person notes</mat-label>
              <textarea matInput rows="2" formControlName="personNotes" placeholder="Optional"></textarea>
            </mat-form-field>
          </div>

          <div class="col-12" style="opacity:.75; font-size:13px;">
            The invite name is automatically saved as the first person. Use this only for extra companions.
          </div>
        </form>
      </div>
    </ng-template>
  </div>

  <div mat-dialog-actions align="end" style="gap:10px;">
    <button mat-button (click)="ref.close()">Cancel</button>
    <button mat-flat-button color="primary" [disabled]="saveDisabled()" (click)="save()">Save</button>
  </div>
  `,
  styles: [`
    .section-title { font-weight: 800; margin: 0 0 10px 0; }
    .section { padding-top: 6px; }
  `]
})
export class InviteFormDialogComponent {
  private svc = inject(InvitesService);
  ref = inject(MatDialogRef<InviteFormDialogComponent>);

  // INVITE (main)
  partyForm = new FormGroup({
    inviteName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    partyNotes: new FormControl('', { nonNullable: true }),
  });

  // Editing companion (required)
  personForm = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    rsvp: new FormControl<RSVPStatus>('PENDING', { nonNullable: true }),
    mealChoice: new FormControl('', { nonNullable: true }),
    personNotes: new FormControl('', { nonNullable: true }),
  });

  // Optional extra companion for new/edit invite
  companionAddForm = new FormGroup({
    fullName: new FormControl('', { nonNullable: true }), // optional
    rsvp: new FormControl<RSVPStatus>('PENDING', { nonNullable: true }),
    mealChoice: new FormControl('', { nonNullable: true }),
    personNotes: new FormControl('', { nonNullable: true }),
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {
    // If editing party
    if (data.existingParty) {
      this.partyForm.patchValue({
        inviteName: data.existingParty.inviteName,
        email: data.existingParty.contact?.email ?? '',
        phone: data.existingParty.contact?.phone ?? '',
        partyNotes: data.existingParty.notes ?? '',
      });
    }

    // If editing companion: ONLY load companion fields
    if (data.existingInvitee) {
      this.personForm.patchValue({
        fullName: data.existingInvitee.fullName,
        rsvp: data.existingInvitee.rsvp,
        mealChoice: data.existingInvitee.mealChoice ?? '',
        personNotes: data.existingInvitee.notes ?? '',
      });
    }
  }

  // ---------- UI helpers ----------
  isEditingPerson() { return !!this.data.existingInvitee; }
  isEditingParty() { return !!this.data.existingParty && !this.data.existingInvitee; }
  isCreatingNewInvite() { return !this.data.existingInvitee && !this.data.existingParty; }

  title() {
    if (this.isEditingPerson()) return 'Edit Companion';
    if (this.isEditingParty()) return 'Edit Invite';
    return 'New Invite';
  }

  saveDisabled() {
    if (this.isEditingPerson()) return this.personForm.invalid;
    return this.partyForm.invalid; // invite is required for new/edit invite
  }

  // ---------- Save ----------
  save() {
    // EDIT COMPANION ONLY
    if (this.data.existingInvitee) {
      const v = this.personForm.getRawValue();
      this.svc.updateInvitee(this.data.existingInvitee.id, {
        fullName: v.fullName.trim(),
        rsvp: v.rsvp,
        mealChoice: v.mealChoice || undefined,
        notes: v.personNotes || undefined,
      });
      this.ref.close(true);
      return;
    }

    // NEW INVITE / EDIT INVITE
    const p = this.partyForm.getRawValue();
    const inviteName = p.inviteName.trim();

    const party = this.svc.upsertParty(
      inviteName,
      { email: p.email || undefined, phone: p.phone || undefined },
      p.partyNotes || undefined
    );

    // ✅ ensure primary person exists = inviteName
    this.svc.upsertPrimaryInvitee(party.id, inviteName);

    // Optional extra companion
    const c = this.companionAddForm.getRawValue();
    const extraName = (c.fullName || '').trim();
    if (extraName) {
      this.svc.addInvitee({
        partyId: party.id,
        fullName: extraName,
        rsvp: c.rsvp,
        mealChoice: c.mealChoice || undefined,
        notes: c.personNotes || undefined,
      });
    }

    this.ref.close(true);
  }
}
