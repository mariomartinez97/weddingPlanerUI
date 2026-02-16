import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SeatingAssignment, TableDef } from '../models';
import { loadFromStorage, saveToStorage, uid } from './storage.util';
import { InvitesService } from './invites.service';

type SeatingStore = {
  tables: TableDef[];
  assignments: SeatingAssignment[];
};

const KEY = 'wp_seating_v1';

@Injectable({ providedIn: 'root' })
export class SeatingService {
  private store$ = new BehaviorSubject<SeatingStore>(
    loadFromStorage<SeatingStore>(KEY, { tables: [], assignments: [] })
  );

  storeObs$ = this.store$.asObservable();
  get snapshot(): SeatingStore { return this.store$.value; }

  constructor(private invites: InvitesService) {}

  private persist(next: SeatingStore) {
    this.store$.next(next);
    saveToStorage(KEY, next);
  }

  setTables(tables: TableDef[]) {
    const s = this.snapshot;

    // prune assignments to removed tables
    const tableIds = new Set(tables.map(t => t.id));
    let assignments = s.assignments.filter(a => tableIds.has(a.tableId));

    // prune assignments to removed invitees (important if invites got deleted)
    const inviteeIds = new Set(this.invites.snapshot.invitees.map(i => i.id));
    assignments = assignments.filter(a => inviteeIds.has(a.inviteeId));

    this.persist({ tables, assignments });
  }

  clearAssignments() {
    const s = this.snapshot;
    this.persist({ ...s, assignments: [] });
  }

  assign(inviteeId: string, tableId: string) {
    const s = this.snapshot;

    // remove any existing assignment for that invitee
    const without = s.assignments.filter(a => a.inviteeId !== inviteeId);

    this.persist({ ...s, assignments: [{ inviteeId, tableId }, ...without] });
  }

  unassign(inviteeId: string) {
    const s = this.snapshot;
    this.persist({ ...s, assignments: s.assignments.filter(a => a.inviteeId !== inviteeId) });
  }

  clearAll() {
    this.persist({ tables: [], assignments: [] });
  }

  seedDemo() {
    const s = this.snapshot;
    if (s.tables.length) return;

    const t1: TableDef = { id: uid('tbl'), name: 'Table 1', seats: 8 };
    const t2: TableDef = { id: uid('tbl'), name: 'Table 2', seats: 8 };
    this.setTables([t1, t2]);

    // assign RSVP YES guests across tables (respect capacity)
    const yes = this.invites.snapshot.invitees.filter(i => i.rsvp === 'YES');
    const tables = [t1, t2];

    let ti = 0;
    const used = new Map<string, number>(tables.map(t => [t.id, 0]));

    for (const person of yes) {
      // find next table with space
      let placed = false;
      for (let attempts = 0; attempts < tables.length; attempts++) {
        const t = tables[ti % tables.length];
        ti++;

        const cnt = used.get(t.id) || 0;
        if (cnt < t.seats) {
          this.assign(person.id, t.id);
          used.set(t.id, cnt + 1);
          placed = true;
          break;
        }
      }
      if (!placed) break; // all tables full
    }
  }
}
