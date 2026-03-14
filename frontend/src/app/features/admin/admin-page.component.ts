import { Component, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';

import { AdminService } from '../../core/services/admin.service';
import { AccessiblePlan, AdminUser } from '../../core/models';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Admin</div>
          <div class="page-subtitle">Create users and manage plan access.</div>
        </div>
        <button mat-stroked-button (click)="load()">
          <mat-icon>refresh</mat-icon>
          Refresh
        </button>
      </div>

      <div class="grid">
        <div class="col-5 card">
          <div style="font-weight:800; margin-bottom:12px;">New user</div>

          <div style="display:grid; gap:12px;">
            <mat-form-field appearance="fill">
              <mat-label>Email</mat-label>
              <input matInput [(ngModel)]="draft.email">
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Display name</mat-label>
              <input matInput [(ngModel)]="draft.displayName">
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Password</mat-label>
              <input matInput type="password" [(ngModel)]="draft.password">
            </mat-form-field>

            <mat-checkbox [(ngModel)]="draft.isAdmin">Admin user</mat-checkbox>

            <mat-form-field appearance="fill">
              <mat-label>Plan access</mat-label>
              <mat-select multiple [(ngModel)]="draft.planIds">
                <mat-option *ngFor="let plan of plans()" [value]="plan.id">{{ plan.name }}</mat-option>
              </mat-select>
            </mat-form-field>

            <button mat-flat-button color="primary" (click)="createUser()">Create user</button>
            <div *ngIf="message()" style="font-size:13px; opacity:.8;">{{ message() }}</div>
          </div>
        </div>

        <div class="col-7 card">
          <div style="font-weight:800; margin-bottom:12px;">Users</div>

          <div *ngIf="users().length===0" style="opacity:.75;">No users found.</div>

          <div *ngFor="let user of users()" style="padding:14px 0; border-bottom:1px solid rgba(0,0,0,0.06);">
            <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
              <div>
                <div style="font-weight:700;">{{ user.displayName }}</div>
                <div style="opacity:.75; font-size:13px;">{{ user.email }}</div>
              </div>
              <mat-checkbox [ngModel]="user.isAdmin" (ngModelChange)="setAdmin(user, $event)">Admin</mat-checkbox>
            </div>

            <mat-form-field appearance="fill" style="width:100%; margin-top:10px;">
              <mat-label>Plan access</mat-label>
              <mat-select multiple [ngModel]="user.planIds" (ngModelChange)="setPlans(user, $event)">
                <mat-option *ngFor="let plan of plans()" [value]="plan.id">{{ plan.name }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminPageComponent {
  private admin = inject(AdminService);

  users = signal<AdminUser[]>([]);
  plans = signal<AccessiblePlan[]>([]);
  message = signal('');

  draft = {
    email: '',
    displayName: '',
    password: '',
    isAdmin: false,
    planIds: [] as string[],
  };

  constructor() {
    void this.load();
  }

  async load() {
    this.users.set(await this.admin.listUsers());
    this.plans.set(await this.admin.listPlans());
  }

  async createUser() {
    try {
      await this.admin.createUser(this.draft);
      this.message.set('User created.');
      this.draft = { email: '', displayName: '', password: '', isAdmin: false, planIds: [] };
      await this.load();
    } catch {
      this.message.set('Could not create user.');
    }
  }

  async setAdmin(user: AdminUser, isAdmin: boolean) {
    await this.admin.updateUserAccess(user.id, { isAdmin, planIds: user.planIds });
    await this.load();
  }

  async setPlans(user: AdminUser, planIds: string[]) {
    await this.admin.updateUserAccess(user.id, { isAdmin: user.isAdmin, planIds });
    await this.load();
  }
}
