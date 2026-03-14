import { Component, Inject, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

import { Invitee, Party, RSVPStatus } from '../../core/models';
import { InvitesService } from '../../core/services/invites.service';
import { I18nService } from '../../core/services/i18n.service';

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
    MatDialogModule, MatButtonModule, MatInputModule, MatSelectModule, MatDividerModule, TranslatePipe
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
        <div class="section-title">{{ 'companionPerson' | t }}</div>

        <form [formGroup]="personForm" class="grid">
          <div class="col-12">
            <mat-form-field appearance="fill">
              <mat-label>{{ 'companionFullName' | t }}</mat-label>
              <input matInput formControlName="fullName" placeholder="e.g., Juan Gomez">
            </mat-form-field>
          </div>

          <div class="col-6">
            <mat-form-field appearance="fill">
              <mat-label>RSVP</mat-label>
              <mat-select formControlName="rsvp">
                <mat-option value="PENDING">{{ 'pending' | t }}</mat-option>
                <mat-option value="YES">{{ 'yes' | t }}</mat-option>
                <mat-option value="NO">{{ 'no' | t }}</mat-option>
                <mat-option value="MAYBE">{{ 'maybe' | t }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="col-6">
            <mat-form-field appearance="fill">
              <mat-label>{{ 'mealChoice' | t }}</mat-label>
              <input matInput formControlName="mealChoice" [placeholder]="'optional' | t">
            </mat-form-field>
          </div>

          <div class="col-12">
            <mat-form-field appearance="fill">
              <mat-label>{{ 'personNotes' | t }}</mat-label>
              <textarea matInput rows="2" formControlName="personNotes" [placeholder]="'optional' | t"></textarea>
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
        <div class="section-title">{{ 'inviteMain' | t }}</div>

        <form [formGroup]="partyForm" class="grid">
          <div class="col-12">
            <mat-form-field appearance="fill">
              <mat-label>{{ 'inviteName' | t }}</mat-label>
              <input matInput formControlName="inviteName" placeholder="e.g., Juan Gomez">
            </mat-form-field>
          </div>

          <div class="col-6">
            <mat-form-field appearance="fill">
              <mat-label>{{ 'contactEmail' | t }}</mat-label>
              <input matInput formControlName="email" [placeholder]="'optional' | t">
            </mat-form-field>
          </div>

          <div class="col-6">
            <mat-form-field appearance="fill">
              <mat-label>{{ 'contactPhone' | t }}</mat-label>
              <input matInput formControlName="phone" [placeholder]="'optional' | t">
            </mat-form-field>
          </div>

          <div class="col-12">
            <mat-form-field appearance="fill">
              <mat-label>{{ 'inviteNotes' | t }}</mat-label>
              <textarea matInput rows="2" formControlName="partyNotes" [placeholder]="'optional' | t"></textarea>
            </mat-form-field>
          </div>
        </form>
      </div>

      <mat-divider style="margin: 14px 0;"></mat-divider>

      <!-- OPTIONAL extra companion (only for creating a new invite) -->
      <ng-container *ngIf="isCreatingNewInvite()">
        <div class="section">
          <div class="section-title">{{ 'addCompanionOptional' | t }}</div>

          <form [formGroup]="companionAddForm" class="grid">
            <div class="col-12">
              <mat-form-field appearance="fill">
                <mat-label>{{ 'companionFullName' | t }}</mat-label>
                <input matInput formControlName="fullName" [placeholder]="i18n.t('optional') + ' (e.g., Sofia Chen)'">
              </mat-form-field>
            </div>

            <div class="col-6">
              <mat-form-field appearance="fill">
                <mat-label>RSVP</mat-label>
                <mat-select formControlName="rsvp">
                  <mat-option value="PENDING">{{ 'pending' | t }}</mat-option>
                  <mat-option value="YES">{{ 'yes' | t }}</mat-option>
                  <mat-option value="NO">{{ 'no' | t }}</mat-option>
                  <mat-option value="MAYBE">{{ 'maybe' | t }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="col-6">
              <mat-form-field appearance="fill">
                <mat-label>{{ 'mealChoice' | t }}</mat-label>
                <input matInput formControlName="mealChoice" [placeholder]="'optional' | t">
              </mat-form-field>
            </div>

            <div class="col-12">
              <mat-form-field appearance="fill">
                <mat-label>{{ 'personNotes' | t }}</mat-label>
                <textarea matInput rows="2" formControlName="personNotes" [placeholder]="'optional' | t"></textarea>
              </mat-form-field>
            </div>

            <div class="col-12" style="opacity:.75; font-size:13px;">
              {{ 'inviteSavedHint' | t }}
            </div>
          </form>
        </div>
      </ng-container>
    </ng-template>
  </div>

  <div mat-dialog-actions align="end" style="gap:10px;">
    <div *ngIf="errorMsg()" style="margin-right:auto; color:#b00020; font-size:13px;">
      {{ errorMsg() }}
    </div>
    <button mat-button (click)="ref.close()">{{ 'cancel' | t }}</button>
    <button mat-flat-button color="primary" [disabled]="saveDisabled() || saving()" (click)="save()">
      {{ saving() ? i18n.t('saving') : i18n.t('save') }}
    </button>
  </div>
  `,
  styles: [`
    .section-title { font-weight: 800; margin: 0 0 10px 0; }
    .section { padding-top: 6px; }
  `]
})
export class InviteFormDialogComponent {
  private svc = inject(InvitesService);
  readonly i18n = inject(I18nService);
  ref = inject(MatDialogRef<InviteFormDialogComponent>);
  saving = signal(false);
  errorMsg = signal('');

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
    if (this.isEditingPerson()) return this.i18n.t('editCompanion');
    if (this.isEditingParty()) return this.i18n.t('editInviteTitle');
    return this.i18n.t('newInvite');
  }

  saveDisabled() {
    if (this.isEditingPerson()) return this.personForm.invalid;
    return this.partyForm.invalid; // invite is required for new/edit invite
  }

  // ---------- Save ----------
  async save() {
    this.errorMsg.set('');
    this.saving.set(true);
    try {
      // Editing a companion: ONLY update that person's fields.
      // Do not modify the invite (party) info from this dialog.
      if (this.data.existingInvitee) {
        const v = this.personForm.getRawValue();
        await this.svc.updateInvitee(this.data.existingInvitee.id, {
          fullName: v.fullName.trim(),
          rsvp: v.rsvp,
          mealChoice: v.mealChoice || undefined,
          notes: v.personNotes || undefined,
        });
        this.ref.close(true);
        return;
      }

      // Creating or editing an invite (party)
      const p = this.partyForm.getRawValue();
      const inviteName = p.inviteName.trim();

      // Editing existing invite must update by id only (avoid creating a new row when name changes).
      if (this.data.existingParty) {
        await this.svc.updateParty(this.data.existingParty.id, {
          inviteName,
          contact: { email: p.email || undefined, phone: p.phone || undefined },
          notes: p.partyNotes || undefined,
        });
        this.ref.close(true);
        return;
      }

      // New invite flow.
      // Backend owns primary companion creation (fullName = inviteName).
      const party = await this.svc.upsertParty(
        inviteName,
        { email: p.email || undefined, phone: p.phone || undefined },
        p.partyNotes || undefined
      );

      // Optional extra companion (user entered)
      const c = this.companionAddForm.getRawValue();
      const extraName = (c.fullName || '').trim();
      if (extraName && extraName.toLowerCase() !== inviteName.toLowerCase()) {
        await this.svc.addInvitee({
          partyId: party.id,
          fullName: extraName,
          rsvp: c.rsvp,
          mealChoice: c.mealChoice || undefined,
          notes: c.personNotes || undefined,
        });
      }

      this.ref.close(true);
    } catch (err: any) {
      const status = err?.status ? ` (HTTP ${err.status})` : '';
      this.errorMsg.set(`${this.i18n.t('couldNotSaveInvite')}${status}. ${this.i18n.t('checkApiSettings')}`);
      console.error('Invite save failed', err);
    } finally {
      this.saving.set(false);
    }
  }
  
}
