import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { Invitee, Party, RSVPStatus } from '../models';

type InvitesStore = {
  parties: Party[];
  invitees: Invitee[];
};

// With Angular proxy.conf.json, keep this as '/api' and proxy to http://localhost:8080
const API_BASE = '/api';

/**
 * Backend API shapes (current backend returns contact object + companions array)
 */
type InviteApi = {
  id: string;
  inviteName: string;
  contact?: { email?: string | null; phone?: string | null } | null;
  notes?: string | null;
  companions: InviteeApi[];
};

type InviteeApi = {
  id: string;
  inviteId: string;
  fullName: string;
  rsvp: RSVPStatus;
  mealChoice?: string | null;
  notes?: string | null;
};

type CreateInviteRequest = {
  inviteName: string;
  contact?: { email?: string; phone?: string };
  notes?: string;
};

type UpdateInviteRequest = {
  inviteName: string;
  contact?: { email?: string; phone?: string };
  notes?: string;
};

type CreateInviteeRequest = {
  fullName: string;
  rsvp: RSVPStatus;
  mealChoice?: string;
  notes?: string;
};

type UpdateInviteeRequest = {
  fullName: string;
  rsvp: RSVPStatus;
  mealChoice?: string;
  notes?: string;
};

@Injectable({ providedIn: 'root' })
export class InvitesService {
  private store$ = new BehaviorSubject<InvitesStore>({ parties: [], invitees: [] });

  storeObs$ = this.store$.asObservable();
  get snapshot(): InvitesStore { return this.store$.value; }

  constructor(private http: HttpClient) {}

  // ----------------------
  // Loading / mapping
  // ----------------------

  async load(): Promise<void> {
    const safe = await firstValueFrom(this.http.get<InviteApi[]>(`${API_BASE}/invites`)).catch(() => []);
    const invites = Array.isArray(safe) ? safe : [];

    const parties: Party[] = invites.map(i => ({
      id: i.id,
      inviteName: i.inviteName,
      contact: {
        email: i.contact?.email ?? undefined,
        phone: i.contact?.phone ?? undefined,
      },
      notes: i.notes ?? undefined,
    }));

    const invitees: Invitee[] = invites.flatMap(i => (i.companions ?? []).map(c => ({
      id: c.id,
      partyId: i.id,
      fullName: c.fullName,
      rsvp: (c.rsvp as RSVPStatus) ?? 'PENDING',
      mealChoice: c.mealChoice ?? undefined,
      notes: c.notes ?? undefined,
    })));

    this.store$.next({ parties, invitees });
  }

  private async reload(): Promise<void> {
    await this.load();
  }

  // ----------------------
  // Invite (Party) CRUD
  // ----------------------

  /**
   * Create a new invite (or if your UI treats it as "upsert", we keep the name).
   */
  async upsertParty(inviteName: string, contact?: { email?: string; phone?: string }, notes?: string): Promise<Party> {
    const body: CreateInviteRequest = {
      inviteName: inviteName.trim(),
      contact: { email: contact?.email, phone: contact?.phone },
      notes,
    };

    // Backend may return the created Invite OR the full list. Support both.
    const resp = await firstValueFrom(this.http.post<any>(`${API_BASE}/invites`, body));

    await this.reload();

    // Try to resolve the created party id
    if (resp && typeof resp === 'object') {
      if (Array.isArray(resp)) {
        const found = resp.find((x: any) => (x?.inviteName || '').toLowerCase() === body.inviteName.toLowerCase());
        if (found?.id) return { id: found.id, inviteName: found.inviteName, contact: { email: found.contact?.email ?? undefined, phone: found.contact?.phone ?? undefined }, notes: found.notes ?? undefined };
      } else if (resp.id) {
        return { id: resp.id, inviteName: resp.inviteName ?? body.inviteName, contact: { email: resp.contact?.email ?? undefined, phone: resp.contact?.phone ?? undefined }, notes: resp.notes ?? undefined };
      }
    }

    // Fallback: find by name in current store
    const fromStore = this.snapshot.parties.find(p => p.inviteName.toLowerCase() === body.inviteName.toLowerCase());
    if (fromStore) return fromStore;

    // Last resort
    return { id: 'unknown', inviteName: body.inviteName, contact, notes };
  }

  async updateParty(partyId: string, patch: Partial<Party>): Promise<void> {
    const body: UpdateInviteRequest = {
      inviteName: (patch.inviteName ?? '').trim(),
      contact: { email: patch.contact?.email, phone: patch.contact?.phone },
      notes: patch.notes,
    };
    await firstValueFrom(this.http.put(`${API_BASE}/invites/${partyId}`, body));
    await this.reload();
  }

  async deleteParty(partyId: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_BASE}/invites/${partyId}`));
    await this.reload();
  }

  // ----------------------
  // Companion (Invitee) CRUD
  // ----------------------

  async addInvitee(input: Omit<Invitee, 'id'>): Promise<Invitee> {
    const body: CreateInviteeRequest = {
      fullName: input.fullName.trim(),
      rsvp: input.rsvp,
      mealChoice: input.mealChoice,
      notes: input.notes,
    };

    const created = await firstValueFrom(this.http.post<InviteeApi>(`${API_BASE}/invites/${input.partyId}/invitees`, body));
    await this.reload();

    return {
      id: created.id,
      partyId: input.partyId,
      fullName: created.fullName,
      rsvp: created.rsvp,
      mealChoice: created.mealChoice ?? undefined,
      notes: created.notes ?? undefined,
    };
  }

  async upsertInviteeByName(
    partyId: string,
    fullName: string,
    patch: { rsvp?: RSVPStatus; mealChoice?: string; notes?: string } = {}
  ): Promise<Invitee> {
    const normalized = fullName.trim().toLowerCase();
    const existing = this.snapshot.invitees.find(i =>
      i.partyId === partyId &&
      i.fullName.trim().toLowerCase() === normalized
    );

    if (existing) {
      await this.updateInvitee(existing.id, {
        fullName: existing.fullName,
        rsvp: patch.rsvp ?? existing.rsvp,
        mealChoice: patch.mealChoice,
        notes: patch.notes,
      });
      return this.snapshot.invitees.find(i => i.id === existing.id) ?? existing;
    }

    return this.addInvitee({
      partyId,
      fullName: fullName.trim(),
      rsvp: patch.rsvp ?? 'PENDING',
      mealChoice: patch.mealChoice,
      notes: patch.notes,
    });
  }

  /**
   * Returns the primary invitee for a party. Backend normally auto-creates this
   * as fullName === inviteName; if missing, create it as a fallback.
   */
  async upsertPrimaryInvitee(partyId: string, inviteName: string): Promise<Invitee> {
    const normalized = inviteName.trim().toLowerCase();
    const existing = this.snapshot.invitees.find(i =>
      i.partyId === partyId &&
      i.fullName.trim().toLowerCase() === normalized
    );
    if (existing) return existing;

    return this.addInvitee({
      partyId,
      fullName: inviteName.trim(),
      rsvp: 'PENDING',
      mealChoice: undefined,
      notes: undefined,
    });
  }

  async updateInvitee(id: string, patch: Partial<Invitee>): Promise<void> {
    // Need partyId to build URL. Prefer patch.partyId else find from store.
    const existing = this.snapshot.invitees.find(i => i.id === id);
    const partyId = patch.partyId ?? existing?.partyId;
    if (!partyId) throw new Error('Could not resolve partyId for invitee update');

    const body: UpdateInviteeRequest = {
      fullName: (patch.fullName ?? existing?.fullName ?? '').trim(),
      rsvp: (patch.rsvp ?? existing?.rsvp ?? 'PENDING') as RSVPStatus,
      mealChoice: patch.mealChoice,
      notes: patch.notes,
    };

    await firstValueFrom(this.http.put(`${API_BASE}/invites/${partyId}/invitees/${id}`, body));
    await this.reload();
  }

  async deleteInvitee(inviteeId: string): Promise<void> {
    const partyId = this.snapshot.invitees.find(i => i.id === inviteeId)?.partyId;
    if (!partyId) return;

    await firstValueFrom(this.http.delete(`${API_BASE}/invites/${partyId}/invitees/${inviteeId}`));
    await this.reload();
  }

  async setRSVP(inviteeId: string, rsvp: RSVPStatus): Promise<void> {
    await this.updateInvitee(inviteeId, { rsvp });
  }

  // Convenience used by InvitesPage when adding companion via prompt
  async addCompanion(partyId: string, fullName: string): Promise<void> {
    await this.addInvitee({ partyId, fullName, rsvp: 'PENDING', mealChoice: undefined, notes: undefined });
  }

  clearAll() {
    // Server-side clear endpoint could be added later; for now keep UI action disabled or implement per-invite delete.
    this.store$.next({ parties: [], invitees: [] });
  }

  // Optional: keep for shell.component.ts if you still call it
  async seedDemo(): Promise<void> {
    // No-op in server mode; you can add a /api/dev/seed endpoint later if desired.
    return;
  }
}
