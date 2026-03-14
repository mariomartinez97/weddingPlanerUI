import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { BudgetState, Expense } from '../models';

type BudgetStore = {
  state: BudgetState;
  expenses: Expense[];
};

const API_BASE = '/api';

type BudgetPayloadApi = {
  state?: { totalBudget?: number; currency?: BudgetState['currency'] };
  expenses?: ExpenseApi[];
};

type ExpenseApi = {
  id: string;
  category: string;
  vendor?: string | null;
  amount: number;
  paid: boolean;
  date?: string | null;
  notes?: string | null;
};

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private store$ = new BehaviorSubject<BudgetStore>({
    state: { totalBudget: 0, currency: 'CAD' },
    expenses: [],
  });

  storeObs$ = this.store$.asObservable();

  get snapshot(): BudgetStore {
    return this.store$.value;
  }

  constructor(private http: HttpClient) {
    void this.load();
  }

  private async load() {
    const payload = await firstValueFrom(this.http.get<BudgetPayloadApi>(`${API_BASE}/budget`)).catch(() => null);
    if (!payload) return;

    const state = payload.state ?? {};
    const expenses = Array.isArray(payload.expenses) ? payload.expenses : [];

    this.store$.next({
      state: {
        totalBudget: Number(state.totalBudget ?? 0),
        currency: (state.currency ?? 'CAD') as BudgetState['currency'],
      },
      expenses: expenses.map(e => ({
        id: e.id,
        category: e.category,
        vendor: e.vendor ?? undefined,
        amount: Number(e.amount ?? 0),
        paid: !!e.paid,
        date: e.date ?? undefined,
        notes: e.notes ?? undefined,
      })),
    });
  }

  private async reload() {
    await this.load();
  }

  async refresh() {
    await this.load();
  }

  setTotalBudget(totalBudget: number, currency: BudgetState['currency']) {
    void firstValueFrom(this.http.put(`${API_BASE}/budget/state`, { totalBudget, currency }))
      .then(() => this.reload());
  }

  addExpense(input: Omit<Expense, 'id'>) {
    void firstValueFrom(this.http.post(`${API_BASE}/budget/expenses`, {
      category: input.category,
      vendor: input.vendor,
      amount: input.amount,
      paid: input.paid,
      date: input.date,
      notes: input.notes,
    })).then(() => this.reload());
  }

  updateExpense(id: string, patch: Partial<Expense>) {
    const existing = this.snapshot.expenses.find(e => e.id === id);
    if (!existing) return;

    const next: Expense = { ...existing, ...patch, id };

    void firstValueFrom(this.http.put(`${API_BASE}/budget/expenses/${id}`, {
      category: next.category,
      vendor: next.vendor,
      amount: next.amount,
      paid: next.paid,
      date: next.date,
      notes: next.notes,
    })).then(() => this.reload());
  }

  deleteExpense(id: string) {
    void firstValueFrom(this.http.delete(`${API_BASE}/budget/expenses/${id}`))
      .then(() => this.reload());
  }

  clearAll() {
    void firstValueFrom(this.http.delete(`${API_BASE}/budget/expenses`))
      .then(() => this.reload());
  }

  seedDemo() {
    // Keep backend as source of truth in deployed mode.
    return;
  }
}
