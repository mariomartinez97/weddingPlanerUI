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
  styles: [`
    .admin-layout {
      display: grid;
      grid-template-columns: minmax(320px, 380px) minmax(0, 1fr);
      gap: 20px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 800;
      margin-bottom: 14px;
    }

    .stack {
      display: grid;
      gap: 12px;
    }

    .user-list {
      display: grid;
      gap: 14px;
    }

    .user-card {
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 16px;
      padding: 16px;
      background: rgba(255,255,255,0.55);
    }

    .user-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 220px;
      gap: 14px;
      align-items: start;
    }

    .user-actions {
      display: grid;
      gap: 10px;
    }

    .inline-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    @media (max-width: 1100px) {
      .admin-layout {
        grid-template-columns: 1fr;
      }

      .user-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
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

      <div class="admin-layout">
        <div class="card">
          <div class="section-title">New user</div>

          <div class="stack">
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

        <div class="card">
          <div class="section-title">Users</div>

          <div *ngIf="users().length===0" style="opacity:.75;">No users found.</div>

          <div class="user-list">
            <div *ngFor="let user of users()" class="user-card">
              <div class="user-grid">
                <div>
                  <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
                    <div>
                      <div style="font-weight:700;">{{ user.displayName }}</div>
                      <div style="opacity:.75; font-size:13px;">{{ user.email }}</div>
                    </div>
                    <mat-checkbox [ngModel]="user.isAdmin" (ngModelChange)="setAdmin(user, $event)">Admin</mat-checkbox>
                  </div>

                  <mat-form-field appearance="fill" style="width:100%; margin-top:12px;">
                    <mat-label>Plan access</mat-label>
                    <mat-select multiple [ngModel]="user.planIds" (ngModelChange)="setPlans(user, $event)">
                      <mat-option *ngFor="let plan of plans()" [value]="plan.id">{{ plan.name }}</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="fill" style="width:100%;">
                    <mat-label>New password</mat-label>
                    <input matInput type="password" [(ngModel)]="passwordDrafts[user.id]">
                  </mat-form-field>
                </div>

                <div class="user-actions">
                  <button mat-stroked-button color="primary" (click)="resetPassword(user)">
                    <mat-icon>password</mat-icon>
                    Reset password
                  </button>

                  <button mat-stroked-button color="warn" (click)="deleteUser(user)">
                    <mat-icon>delete</mat-icon>
                    Delete user
                  </button>
                </div>
              </div>
            </div>
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
  passwordDrafts: Record<string, string> = {};

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

  async resetPassword(user: AdminUser) {
    const nextPassword = (this.passwordDrafts[user.id] || '').trim();
    if (!nextPassword) {
      this.message.set(`Enter a new password for ${user.email}.`);
      return;
    }

    try {
      await this.admin.resetPassword(user.id, nextPassword);
      this.passwordDrafts[user.id] = '';
      this.message.set(`Password reset for ${user.email}.`);
    } catch {
      this.message.set(`Could not reset password for ${user.email}.`);
    }
  }

  async deleteUser(user: AdminUser) {
    if (!confirm(`Delete ${user.email}?`)) return;

    try {
      await this.admin.deleteUser(user.id);
      delete this.passwordDrafts[user.id];
      this.message.set(`Deleted ${user.email}.`);
      await this.load();
    } catch {
      this.message.set(`Could not delete ${user.email}.`);
    }
  }
}
