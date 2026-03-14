import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { AccessiblePlan, AdminUser } from '../models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);

  async listUsers(): Promise<AdminUser[]> {
    return await firstValueFrom(this.http.get<AdminUser[]>('/api/admin/users'));
  }

  async listPlans(): Promise<AccessiblePlan[]> {
    return await firstValueFrom(this.http.get<AccessiblePlan[]>('/api/admin/plans'));
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
}
