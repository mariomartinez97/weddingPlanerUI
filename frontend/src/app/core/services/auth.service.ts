import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AccessiblePlan, AuthSession } from '../models';

const STORAGE_KEY = 'wedding-planner.auth';
const ACTIVE_PLAN_KEY = 'wedding-planner.active-plan';

type LoginPayload = { email: string; password: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private storedSession = this.readSession();
  readonly session = signal<AuthSession | null>(this.storedSession);
  readonly activePlanId = signal<string | null>(this.readActivePlan());

  isAuthenticated() {
    return !!this.session()?.token;
  }

  token() {
    return this.session()?.token ?? null;
  }

  plans(): AccessiblePlan[] {
    return this.session()?.plans ?? [];
  }

  hasAccessiblePlans() {
    return this.plans().length > 0;
  }

  isAdmin() {
    return !!this.session()?.user?.isAdmin;
  }

  async login(payload: LoginPayload) {
    const session = await firstValueFrom(this.http.post<AuthSession>('/api/auth/login', payload));
    this.session.set(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this.applyActivePlan(session.plans, null);
  }

  async refresh() {
    const token = this.token();
    if (!token) return;
    try {
      const session = await firstValueFrom(this.http.get<AuthSession>('/api/auth/me'));
      this.session.set(session);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

      this.applyActivePlan(session.plans, this.activePlanId());
    } catch {
      this.clearLocal();
    }
  }

  async logout() {
    try {
      if (this.token()) await firstValueFrom(this.http.post('/api/auth/logout', {}));
    } catch {
      // best effort
    }
    this.clearLocal();
    await this.router.navigateByUrl('/login');
  }

  setActivePlan(planId: string) {
    if (!this.plans().some(plan => plan.id === planId)) return;
    this.activePlanId.set(planId);
    localStorage.setItem(ACTIVE_PLAN_KEY, planId);
  }

  private clearLocal() {
    this.session.set(null);
    this.activePlanId.set(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_PLAN_KEY);
  }

  private readSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) as AuthSession : null;
    } catch {
      return null;
    }
  }

  private readActivePlan(): string | null {
    return localStorage.getItem(ACTIVE_PLAN_KEY);
  }

  private applyActivePlan(plans: AccessiblePlan[], preferredPlanId: string | null) {
    const nextPlanId = plans.some(plan => plan.id === preferredPlanId)
      ? preferredPlanId
      : plans[0]?.id ?? null;

    this.activePlanId.set(nextPlanId);
    if (nextPlanId) localStorage.setItem(ACTIVE_PLAN_KEY, nextPlanId);
    else localStorage.removeItem(ACTIVE_PLAN_KEY);
  }
}
