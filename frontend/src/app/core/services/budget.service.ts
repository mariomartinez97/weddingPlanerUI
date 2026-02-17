import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BudgetState, Expense } from '../models';
import { loadFromStorage, saveToStorage, uid } from './storage.util';

type BudgetStore = {
  state: BudgetState;
  expenses: Expense[];
};

const KEY = 'wp_budget_v1';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private store$ = new BehaviorSubject<BudgetStore>(
    loadFromStorage<BudgetStore>(KEY, {
      state: { totalBudget: 0, currency: 'CAD' },
      expenses: [],
    })
  );

  storeObs$ = this.store$.asObservable();

  get snapshot(): BudgetStore {
    return this.store$.value;
  }

  private persist(next: BudgetStore) {
    this.store$.next(next);
    saveToStorage(KEY, next);
  }

  setTotalBudget(totalBudget: number, currency: BudgetState['currency']) {
    const s = this.snapshot;
    this.persist({ ...s, state: { totalBudget, currency } });
  }

  addExpense(input: Omit<Expense, 'id'>) {
    const s = this.snapshot;
    const exp: Expense = { ...input, id: uid('exp') };
    this.persist({ ...s, expenses: [exp, ...s.expenses] });
  }

  updateExpense(id: string, patch: Partial<Expense>) {
    const s = this.snapshot;
    this.persist({
      ...s,
      expenses: s.expenses.map(e => (e.id === id ? { ...e, ...patch } : e)),
    });
  }

  deleteExpense(id: string) {
    const s = this.snapshot;
    this.persist({ ...s, expenses: s.expenses.filter(e => e.id !== id) });
  }

  clearAll() {
    this.persist({ state: { totalBudget: 0, currency: 'CAD' }, expenses: [] });
  }

  seedDemo() {
    if (this.snapshot.expenses.length || this.snapshot.state.totalBudget > 0) return;

    this.setTotalBudget(25000, 'CAD');
    this.addExpense({
      category: 'Venue',
      vendor: 'Green Hall',
      amount: 9000,
      paid: true,
      date: '2026-02-01',
    });
    this.addExpense({
      category: 'Catering',
      vendor: 'Taste Co',
      amount: 7000,
      paid: false,
      date: '2026-03-15',
    });
    this.addExpense({
      category: 'Photography',
      vendor: 'Lens Studio',
      amount: 2500,
      paid: false,
      date: '2026-04-10',
    });
  }
}
