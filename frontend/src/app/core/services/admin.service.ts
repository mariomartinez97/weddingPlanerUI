import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { AdminPlan, AdminUser } from '../models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);

  async listUsers(): Promise<AdminUser[]> {
    return await firstValueFrom(this.http.get<AdminUser[]>('/api/admin/users'));
  }

  async listPlans(includeInactive = false): Promise<AdminPlan[]> {
    return await firstValueFrom(this.http.get<AdminPlan[]>('/api/admin/plans', {
      params: { includeInactive: String(includeInactive) },
    }));
  }

  async getPlan(planId: string): Promise<AdminPlan> {
    return await firstValueFrom(this.http.get<AdminPlan>(`/api/admin/plans/${planId}`));
  }

  async createPlan(payload: { name: string; assignedUserIds: string[] }): Promise<AdminPlan> {
    return await firstValueFrom(this.http.post<AdminPlan>('/api/admin/plans', payload));
  }

  async updatePlan(planId: string, payload: { name: string; status: string; assignedUserIds: string[] }): Promise<AdminPlan> {
    return await firstValueFrom(this.http.put<AdminPlan>(`/api/admin/plans/${planId}`, payload));
  }

  async createUser(payload: {
    email: string;
    displayName: string;
    password: string;
    isAdmin: boolean;
    planIds: string[];
  }): Promise<AdminUser> {
    return await firstValueFrom(this.http.post<AdminUser>('/api/admin/users', payload));
  }

  async updateUserAccess(userId: string, payload: { isAdmin: boolean; planIds: string[] }): Promise<AdminUser> {
    return await firstValueFrom(this.http.put<AdminUser>(`/api/admin/users/${userId}/access`, payload));
  }

  async resetPassword(userId: string, password: string): Promise<void> {
    await firstValueFrom(this.http.post<void>(`/api/admin/users/${userId}/reset-password`, { password }));
  }

  async deleteUser(userId: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`/api/admin/users/${userId}`));
  }
}
