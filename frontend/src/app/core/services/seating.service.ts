import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { SeatingAssignment, TableDef } from '../models';
import { InvitesService } from './invites.service';

type SeatingStore = {
  tables: TableDef[];
  assignments: SeatingAssignment[];
};

const API_BASE = '/api';

type SeatingPayloadApi = {
  tables?: TableDef[];
  assignments?: SeatingAssignment[];
};

@Injectable({ providedIn: 'root' })
export class SeatingService {
  private store$ = new BehaviorSubject<SeatingStore>({ tables: [], assignments: [] });

  storeObs$ = this.store$.asObservable();
  get snapshot(): SeatingStore { return this.store$.value; }

  constructor(private invites: InvitesService, private http: HttpClient) {
    void this.load();
  }

  private async load() {
    const payload = await firstValueFrom(this.http.get<SeatingPayloadApi>(`${API_BASE}/seating`)).catch(() => null);
    if (!payload) return;

    this.store$.next({
      tables: Array.isArray(payload.tables) ? payload.tables : [],
      assignments: Array.isArray(payload.assignments) ? payload.assignments : [],
    });
  }

  private async reload() {
    await this.load();
  }

  setTables(tables: TableDef[]) {
    // prune assignments to removed invitees locally before sending full table replacement
    const inviteeIds = new Set(this.invites.snapshot.invitees.map(i => i.id));
    const validAssignments = this.snapshot.assignments.filter(a => inviteeIds.has(a.inviteeId));
    this.store$.next({ tables, assignments: validAssignments });

    void firstValueFrom(this.http.put(`${API_BASE}/seating/tables`, tables))
      .then(() => this.reload());
  }

  clearAssignments() {
    void firstValueFrom(this.http.delete(`${API_BASE}/seating/assignments`))
      .then(() => this.reload());
  }

  assign(inviteeId: string, tableId: string) {
    void firstValueFrom(this.http.put(`${API_BASE}/seating/assignments/${inviteeId}`, { tableId }))
      .then(() => this.reload());
  }

  unassign(inviteeId: string) {
    void firstValueFrom(this.http.delete(`${API_BASE}/seating/assignments/${inviteeId}`))
      .then(() => this.reload());
  }

  clearAll() {
    void this.setTables([]);
  }

  seedDemo() {
    return;
  }
}
