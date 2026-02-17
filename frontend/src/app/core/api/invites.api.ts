import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from './api.config';
import { Observable } from 'rxjs';
import { Invitee, Party } from '../models';

export type UpsertPartyRequest = {
  inviteName: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
};

export type CreateInviteeRequest = {
  partyId: string;
  fullName: string;
  rsvp: 'PENDING' | 'YES' | 'NO' | 'MAYBE';
  mealChoice?: string;
  notes?: string;
};

@Injectable({ providedIn: 'root' })
export class InvitesApi {
  private http = inject(HttpClient);

  // ---- Parties ----
  listParties(): Observable<Party[]> {
    return this.http.get<Party[]>(`${API_BASE}/parties`);
  }

  upsertParty(body: UpsertPartyRequest): Observable<Party> {
    return this.http.post<Party>(`${API_BASE}/parties/upsert`, body);
  }

  deleteParty(partyId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/parties/${partyId}`);
  }

  // ---- Invitees ----
  listInvitees(): Observable<Invitee[]> {
    return this.http.get<Invitee[]>(`${API_BASE}/invitees`);
  }

  createInvitee(body: CreateInviteeRequest): Observable<Invitee> {
    return this.http.post<Invitee>(`${API_BASE}/invitees`, body);
  }

  updateInvitee(inviteeId: string, patch: Partial<CreateInviteeRequest>): Observable<Invitee> {
    return this.http.patch<Invitee>(`${API_BASE}/invitees/${inviteeId}`, patch);
  }

  deleteInvitee(inviteeId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/invitees/${inviteeId}`);
  }
}
