import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { AuditEntry } from '../models';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private http = inject(HttpClient);

  async list(): Promise<AuditEntry[]> {
    return await firstValueFrom(this.http.get<AuditEntry[]>('/api/audit'));
  }
}
