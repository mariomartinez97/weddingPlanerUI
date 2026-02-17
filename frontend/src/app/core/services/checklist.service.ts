import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ChecklistItem } from '../models';
import { loadFromStorage, saveToStorage, uid } from './storage.util';

type ChecklistStore = { items: ChecklistItem[] };
const KEY = 'wp_checklist_v1';

@Injectable({ providedIn: 'root' })
export class ChecklistService {
  private store$ = new BehaviorSubject<ChecklistStore>(loadFromStorage<ChecklistStore>(KEY, { items: [] }));
  storeObs$ = this.store$.asObservable();
  get snapshot(): ChecklistStore { return this.store$.value; }

  private persist(next: ChecklistStore) {
    this.store$.next(next);
    saveToStorage(KEY, next);
  }

  addItem(input: Omit<ChecklistItem, 'id'>) {
    const s = this.snapshot;
    const item: ChecklistItem = { ...input, id: uid('task') };
    this.persist({ items: [item, ...s.items] });
  }

  updateItem(id: string, patch: Partial<ChecklistItem>) {
    const s = this.snapshot;
    this.persist({ items: s.items.map(it => it.id === id ? { ...it, ...patch } : it) });
  }

  deleteItem(id: string) {
    const s = this.snapshot;
    this.persist({ items: s.items.filter(it => it.id !== id) });
  }

  clearAll() { this.persist({ items: [] }); }

  seedDemo() {
    if (this.snapshot.items.length) return;
    this.addItem({ title: 'Book venue', owner: 'Mario', dueDate: '2026-03-01', done: true });
    this.addItem({ title: 'Finalize guest list', owner: 'Maria Paula', dueDate: '2026-03-10', done: false });
    this.addItem({ title: 'Schedule tasting', owner: 'Planner', dueDate: '2026-03-20', done: false });
  }
}
