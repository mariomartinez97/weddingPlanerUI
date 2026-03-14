import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ChecklistItem } from '../models';

type ChecklistStore = { items: ChecklistItem[] };
const API_BASE = '/api';

type ChecklistItemApi = {
  id: string;
  title: string;
  owner: string;
  dueDate?: string | null;
  done: boolean;
  notes?: string | null;
};

@Injectable({ providedIn: 'root' })
export class ChecklistService {
  private store$ = new BehaviorSubject<ChecklistStore>({ items: [] });
  storeObs$ = this.store$.asObservable();
  get snapshot(): ChecklistStore { return this.store$.value; }

  constructor(private http: HttpClient) {
    void this.load();
  }

  private async load() {
    const safe = await firstValueFrom(this.http.get<ChecklistItemApi[]>(`${API_BASE}/checklist/items`)).catch(() => []);
    const items = Array.isArray(safe) ? safe : [];
    this.store$.next({
      items: items.map(i => ({
        id: i.id,
        title: i.title,
        owner: i.owner,
        dueDate: i.dueDate ?? undefined,
        done: !!i.done,
        notes: i.notes ?? undefined,
      })),
    });
  }

  private async reload() {
    await this.load();
  }

  addItem(input: Omit<ChecklistItem, 'id'>) {
    void firstValueFrom(this.http.post(`${API_BASE}/checklist/items`, input))
      .then(() => this.reload());
  }

  updateItem(id: string, patch: Partial<ChecklistItem>) {
    const existing = this.snapshot.items.find(it => it.id === id);
    if (!existing) return;

    const next: ChecklistItem = { ...existing, ...patch, id };
    void firstValueFrom(this.http.put(`${API_BASE}/checklist/items/${id}`, next))
      .then(() => this.reload());
  }

  deleteItem(id: string) {
    void firstValueFrom(this.http.delete(`${API_BASE}/checklist/items/${id}`))
      .then(() => this.reload());
  }

  clearAll() {
    void firstValueFrom(this.http.delete(`${API_BASE}/checklist/items`))
      .then(() => this.reload());
  }

  seedDemo() {
    return;
  }
}
