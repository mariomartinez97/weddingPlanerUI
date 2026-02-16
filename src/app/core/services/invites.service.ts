import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Invitee, Party, RSVPStatus } from '../models';
import { loadFromStorage, saveToStorage, uid } from './storage.util';

type InvitesStore = {
  parties: Party[];
  invitees: Invitee[];
};

const KEY = 'wp_invites_v1';

function normalize(s: string) {
  return (s || '').trim().toLowerCase();
}

function migrateIfNeeded(raw: any): InvitesStore {
  // Already new shape
  if (raw?.parties?.length && raw.parties[0]?.inviteName !== undefined) {
    return raw as InvitesStore;
  }

  // Old shape: Party {id,label} and Invitee {firstName,lastName,email,phone,partyId,rsvp,...}
  const oldParties = Array.isArray(raw?.parties) ? raw.parties : [];
  const oldInvitees = Array.isArray(raw?.invitees) ? raw.invitees : [];

  const parties: Party[] = oldParties.map((p: any) => ({
    id: p.id,
    inviteName: p.label ?? 'Invite',
    contact: { email: undefined, phone: undefined },
    notes: undefined,
  }));

  // If parties were just categories (Family/Friends/etc), we’ll upgrade them as “invites”
  // The UI will let you rename them later.

  const invitees: Invitee[] = oldInvitees.map((i: any) => ({
    id: i.id,
    partyId: i.partyId,
    fullName: `${i.firstName ?? ''} ${i.lastName ?? ''}`.trim() || 'Guest',
    rsvp: (i.rsvp ?? 'PENDING') as RSVPStatus,
    mealChoice: i.mealChoice,
    notes: i.notes,
  }));

  // Try to set party contact from first invitee that had email/phone in old data
  const byParty = new Map<string, any[]>();
  for (const i of oldInvitees) {
    if (!byParty.has(i.partyId)) byParty.set(i.partyId, []);
    byParty.get(i.partyId)!.push(i);
  }

  for (const p of parties) {
    const list = byParty.get(p.id) || [];
    const contactSource = list.find(x => x.email || x.phone);
    if (contactSource) {
      p.contact = {
        email: contactSource.email,
        phone: contactSource.phone,
      };
    }
  }

  return { parties, invitees };
}

@Injectable({ providedIn: 'root' })
export class InvitesService {
  private store$ = new BehaviorSubject<InvitesStore>(
    migrateIfNeeded(loadFromStorage<InvitesStore>(KEY, { parties: [], invitees: [] } as any))
  );

  store$obs = this.store$.asObservable();

  get snapshot(): InvitesStore {
    return this.store$.value;
  }

  private persist(next: InvitesStore) {
    this.store$.next(next);
    saveToStorage(KEY, next);
  }

  // ----- Parties (Main Invites / Households) -----

  upsertParty(inviteName: string, contact?: any, notes?: string) {
    const s = this.snapshot;
  
    const key = inviteName.trim().toLowerCase();
    const existing = s.parties.find(p => p.inviteName.trim().toLowerCase() === key);
    if (existing) return existing;
  
    const party = {
      id: uid('party'),
      inviteName: inviteName.trim(),
      contact,
      notes
    };
  
    this.persist({ ...s, parties: [party, ...s.parties] });
  
    // ✅ auto-create the first companion = invite name
    this.ensurePrimaryInvitee(party.id, party.inviteName);
  
    return party;
  }
  

  updateParty(id: string, patch: Partial<Omit<Party, 'id'>>) {
    const s = this.snapshot;
    this.persist({
      ...s,
      parties: s.parties.map(p => p.id === id ? { ...p, ...patch, contact: { ...p.contact, ...(patch as any).contact } } : p)
    });
  }

  deleteParty(id: string) {
    const s = this.snapshot;
    this.persist({
      parties: s.parties.filter(p => p.id !== id),
      invitees: s.invitees.filter(i => i.partyId !== id)
    });
  }

  // ----- Invitees (Companions / Individuals) -----

  addInvitee(input: Omit<Invitee, 'id'>): Invitee {
    const s = this.snapshot;
    const inv: Invitee = { ...input, id: uid('inv') };
    this.persist({ ...s, invitees: [inv, ...s.invitees] });
    return inv;
  }

  addCompanion(partyId: string, fullName: string) {
    return this.addInvitee({
      partyId,
      fullName: fullName.trim(),
      rsvp: 'PENDING',
      mealChoice: undefined,
      notes: undefined,
    });
  }

  updateInvitee(id: string, patch: Partial<Omit<Invitee, 'id'>>) {
    const s = this.snapshot;
    this.persist({
      ...s,
      invitees: s.invitees.map(i => i.id === id ? { ...i, ...patch } : i)
    });
  }

  deleteInvitee(id: string) {
    const s = this.snapshot;
    this.persist({ ...s, invitees: s.invitees.filter(i => i.id !== id) });
  }

  setRSVP(id: string, rsvp: RSVPStatus) {
    this.updateInvitee(id, { rsvp });
  }

  clearAll() {
    this.persist({ parties: [], invitees: [] });
  }

  seedDemo() {
    if (this.snapshot.invitees.length || this.snapshot.parties.length) return;

    const p1 = this.upsertParty('Mario & Maria Martinez', { email: 'mario@example.com', phone: '+1 555-0101' });
    const p2 = this.upsertParty('The Gomez Family', { email: 'gomez@example.com' });
    const p3 = this.upsertParty('Work Friends', { phone: '+1 555-0202' });

    this.addInvitee({ partyId: p1.id, fullName: 'Mario Martinez', rsvp: 'YES', mealChoice: 'Beef' });
    this.addInvitee({ partyId: p1.id, fullName: 'Maria Paula', rsvp: 'YES', mealChoice: 'Fish' });

    this.addInvitee({ partyId: p2.id, fullName: 'Ana Gomez', rsvp: 'PENDING' });
    this.addInvitee({ partyId: p2.id, fullName: 'Luis Gomez', rsvp: 'NO' });

    this.addInvitee({ partyId: p3.id, fullName: 'Sofia Chen', rsvp: 'YES', mealChoice: 'Vegetarian' });
  }

  private ensurePrimaryInvitee(partyId: string, inviteName: string) {
    const s = this.snapshot;
  
    const normalized = (inviteName || '').trim().toLowerCase();
    const already = s.invitees.some(i =>
      i.partyId === partyId &&
      (i.fullName || '').trim().toLowerCase() === normalized
    );
  
    if (already) return;
  
    this.addInvitee({
      partyId,
      fullName: inviteName.trim(),
      rsvp: 'PENDING',
      mealChoice: undefined,
      notes: undefined,
    });
  }
  upsertPrimaryInvitee(partyId: string, fullName: string) {
    const s = this.snapshot;
    const normalized = fullName.trim().toLowerCase();
  
    const existing = s.invitees.find(i =>
      i.partyId === partyId && i.fullName.trim().toLowerCase() === normalized
    );
  
    if (existing) return existing;
  
    return this.addInvitee({
      partyId,
      fullName: fullName.trim(),
      rsvp: 'PENDING',
      mealChoice: undefined,
      notes: undefined,
    });
  }  

}
