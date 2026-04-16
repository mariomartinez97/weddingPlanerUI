import { Component, inject, signal } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';

import { AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';
import { AdminPlan, AdminUser, SubscriptionStatus } from '../../core/models';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [
    DatePipe,
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

    .subscription-list {
      display: grid;
      gap: 14px;
    }

    .user-card {
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 16px;
      padding: 16px;
      background: rgba(255,255,255,0.55);
    }

    .subscription-card {
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

    .subscription-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 220px;
      gap: 14px;
      align-items: start;
    }

    .user-actions {
      display: grid;
      gap: 10px;
    }

    .subscription-actions {
      display: grid;
      gap: 10px;
      align-content: start;
    }

    .inline-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      background: rgba(0,0,0,0.06);
    }

    .pill.active {
      background: rgba(16,185,129,0.16);
      color: #0f766e;
    }

    .pill.inactive {
      background: rgba(245,158,11,0.16);
      color: #b45309;
    }

    .pill.archived {
      background: rgba(148,163,184,0.2);
      color: #475569;
    }

    .meta-grid {
      display: grid;
      gap: 4px;
      font-size: 12px;
      opacity: .8;
      margin-top: 8px;
    }

    @media (max-width: 1100px) {
      .admin-layout {
        grid-template-columns: 1fr;
      }

      .user-grid {
        grid-template-columns: 1fr;
      }

      .subscription-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Admin</div>
          <div class="page-subtitle">Create subscriptions, assign users, and manage account access.</div>
        </div>
        <button mat-stroked-button (click)="load()">
          <mat-icon>refresh</mat-icon>
          Refresh
        </button>
      </div>

      <div class="admin-layout">
        <div class="card">
          <div class="section-title">New subscription</div>

          <div class="stack">
            <mat-form-field appearance="fill">
              <mat-label>Subscription name</mat-label>
              <input matInput [(ngModel)]="subscriptionDraft.name">
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Assigned users</mat-label>
              <mat-select multiple [(ngModel)]="subscriptionDraft.assignedUserIds">
                <mat-option *ngFor="let user of users()" [value]="user.id">
                  {{ user.displayName }} · {{ user.email }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <button mat-flat-button color="primary" (click)="createSubscription()">Create subscription</button>
            <div *ngIf="message()" style="font-size:13px; opacity:.8;">{{ message() }}</div>
          </div>
        </div>

        <div class="card">
          <div class="section-title">Subscriptions</div>

          <div *ngIf="subscriptions().length===0" style="opacity:.75;">No subscriptions found.</div>

          <div class="subscription-list">
            <div *ngFor="let plan of subscriptions()" class="subscription-card">
              <div class="subscription-grid">
                <div>
                  <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:flex-start;">
                    <div>
                      <div style="font-weight:700;">{{ plan.name }}</div>
                      <div class="meta-grid">
                        <div>Users: {{ plan.assignedUserCount }}</div>
                        <div *ngIf="plan.updatedAt">Updated: {{ plan.updatedAt | date:'medium' }}</div>
                      </div>
                    </div>
                    <span class="pill" [class.active]="plan.status==='ACTIVE'" [class.inactive]="plan.status==='INACTIVE'" [class.archived]="plan.status==='ARCHIVED'">
                      {{ plan.status }}
                    </span>
                  </div>

                  <mat-form-field appearance="fill" style="width:100%; margin-top:12px;">
                    <mat-label>Subscription name</mat-label>
                    <input matInput [ngModel]="plan.name" (ngModelChange)="setSubscriptionName(plan, $event)">
                  </mat-form-field>

                  <mat-form-field appearance="fill" style="width:100%;">
                    <mat-label>Status</mat-label>
                    <mat-select [ngModel]="plan.status" (ngModelChange)="setSubscriptionStatus(plan, $event)">
                      <mat-option *ngFor="let status of statuses" [value]="status">{{ status }}</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="fill" style="width:100%;">
                    <mat-label>Assigned users</mat-label>
                    <mat-select multiple [ngModel]="plan.assignedUserIds" (ngModelChange)="setSubscriptionUsers(plan, $event)">
                      <mat-option *ngFor="let user of users()" [value]="user.id">
                        {{ user.displayName }} · {{ user.email }}
                      </mat-option>
                    </mat-select>
                  </mat-form-field>

                  <div class="meta-grid" *ngIf="plan.deactivatedAt || plan.archivedAt || plan.purgeAfter">
                    <div *ngIf="plan.deactivatedAt">Deactivated: {{ plan.deactivatedAt | date:'medium' }}</div>
                    <div *ngIf="plan.archivedAt">Archived: {{ plan.archivedAt | date:'medium' }}</div>
                    <div *ngIf="plan.purgeAfter">Eligible purge after: {{ plan.purgeAfter | date:'medium' }}</div>
                  </div>
                </div>

                <div class="subscription-actions">
                  <button mat-stroked-button color="primary" (click)="saveSubscription(plan)">
                    <mat-icon>save</mat-icon>
                    Save changes
                  </button>

                  <button mat-stroked-button (click)="reloadSubscription(plan.id)">
                    <mat-icon>refresh</mat-icon>
                    Reload
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:20px;">
        <div class="section-title">New user</div>

        <div class="stack" style="max-width:380px;">
          <mat-form-field appearance="fill">
            <mat-label>Email</mat-label>
            <input matInput [(ngModel)]="userDraft.email">
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Display name</mat-label>
            <input matInput [(ngModel)]="userDraft.displayName">
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Password</mat-label>
            <input matInput type="password" [(ngModel)]="userDraft.password">
          </mat-form-field>

          <mat-checkbox [(ngModel)]="userDraft.isAdmin">Admin user</mat-checkbox>

          <mat-form-field appearance="fill">
            <mat-label>Subscription access</mat-label>
            <mat-select multiple [(ngModel)]="userDraft.planIds">
              <mat-option *ngFor="let plan of activeSubscriptions()" [value]="plan.id">{{ plan.name }}</mat-option>
            </mat-select>
          </mat-form-field>

          <button mat-flat-button color="primary" (click)="createUser()">Create user</button>
        </div>
      </div>

      <div class="card" style="margin-top:20px;">
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
                  <mat-label>Subscription access</mat-label>
                  <mat-select multiple [ngModel]="user.planIds" (ngModelChange)="setPlans(user, $event)">
                    <mat-option *ngFor="let plan of activeSubscriptions()" [value]="plan.id">{{ plan.name }}</mat-option>
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
  `
})
export class AdminPageComponent {
  private admin = inject(AdminService);
  private auth = inject(AuthService);

  users = signal<AdminUser[]>([]);
  subscriptions = signal<AdminPlan[]>([]);
  activeSubscriptions = signal<AdminPlan[]>([]);
  message = signal('');
  passwordDrafts: Record<string, string> = {};
  statuses: SubscriptionStatus[] = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];
  private subscriptionDrafts: Record<string, { name: string; status: SubscriptionStatus; assignedUserIds: string[] }> = {};

  subscriptionDraft = {
    name: '',
    assignedUserIds: [] as string[],
  };

  userDraft = {
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
    const [subscriptions, activeSubscriptions] = await Promise.all([
      this.admin.listPlans(true),
      this.admin.listPlans(false),
    ]);
    this.subscriptions.set(subscriptions);
    this.activeSubscriptions.set(activeSubscriptions);
    this.subscriptionDrafts = Object.fromEntries(
      subscriptions.map(plan => [plan.id, {
        name: plan.name,
        status: plan.status,
        assignedUserIds: [...plan.assignedUserIds],
      }]),
    );
  }

  async createSubscription() {
    try {
      await this.admin.createPlan(this.subscriptionDraft);
      this.message.set('Subscription created.');
      this.subscriptionDraft = { name: '', assignedUserIds: [] };
      await this.auth.refresh();
      await this.load();
    } catch {
      this.message.set('Could not create subscription.');
    }
  }

  async saveSubscription(plan: AdminPlan) {
    const draft = this.subscriptionDrafts[plan.id];
    if (!draft) return;

    try {
      await this.admin.updatePlan(plan.id, draft);
      this.message.set(`Saved subscription ${draft.name}.`);
      await this.auth.refresh();
      await this.load();
    } catch {
      this.message.set(`Could not save subscription ${plan.name}.`);
    }
  }

  async reloadSubscription(planId: string) {
    try {
      const plan = await this.admin.getPlan(planId);
      this.subscriptionDrafts[planId] = {
        name: plan.name,
        status: plan.status,
        assignedUserIds: [...plan.assignedUserIds],
      };
      this.message.set(`Reloaded subscription ${plan.name}.`);
      await this.load();
    } catch {
      this.message.set('Could not reload subscription.');
    }
  }

  setSubscriptionName(plan: AdminPlan, name: string) {
    this.ensureSubscriptionDraft(plan);
    this.subscriptionDrafts[plan.id].name = name;
  }

  setSubscriptionStatus(plan: AdminPlan, status: SubscriptionStatus) {
    this.ensureSubscriptionDraft(plan);
    this.subscriptionDrafts[plan.id].status = status;
  }

  setSubscriptionUsers(plan: AdminPlan, assignedUserIds: string[]) {
    this.ensureSubscriptionDraft(plan);
    this.subscriptionDrafts[plan.id].assignedUserIds = assignedUserIds;
  }

  async createUser() {
    try {
      await this.admin.createUser(this.userDraft);
      this.message.set('User created.');
      this.userDraft = { email: '', displayName: '', password: '', isAdmin: false, planIds: [] };
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

  private ensureSubscriptionDraft(plan: AdminPlan) {
    if (!this.subscriptionDrafts[plan.id]) {
      this.subscriptionDrafts[plan.id] = {
        name: plan.name,
        status: plan.status,
        assignedUserIds: [...plan.assignedUserIds],
      };
    }
  }
}
