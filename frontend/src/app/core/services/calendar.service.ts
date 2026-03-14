import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Appointment } from '../models';

type CalendarStore = { appointments: Appointment[] };
const API_BASE = '/api';

type AppointmentApi = {
  id: string;
  type: Appointment['type'];
  title: string;
  withWhom: string;
  start: string;
  end: string;
  location?: string | null;
  notes?: string | null;
};

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private store$ = new BehaviorSubject<CalendarStore>({ appointments: [] });
  storeObs$ = this.store$.asObservable();
  get snapshot(): CalendarStore { return this.store$.value; }

  constructor(private http: HttpClient) {
    void this.load();
  }

  private async load() {
    const safe = await firstValueFrom(this.http.get<AppointmentApi[]>(`${API_BASE}/calendar/appointments`)).catch(() => []);
    const appointments = Array.isArray(safe) ? safe : [];
    this.store$.next({
      appointments: appointments.map(a => ({
        id: a.id,
        type: a.type,
        title: a.title,
        withWhom: a.withWhom,
        start: a.start,
        end: a.end,
        location: a.location ?? undefined,
        notes: a.notes ?? undefined,
      })),
    });
  }

  private async reload() {
    await this.load();
  }

  addAppointment(input: Omit<Appointment, 'id'>) {
    void firstValueFrom(this.http.post(`${API_BASE}/calendar/appointments`, input))
      .then(() => this.reload());
  }

  updateAppointment(id: string, patch: Partial<Appointment>) {
    const existing = this.snapshot.appointments.find(a => a.id === id);
    if (!existing) return;

    const next: Appointment = { ...existing, ...patch, id };
    void firstValueFrom(this.http.put(`${API_BASE}/calendar/appointments/${id}`, next))
      .then(() => this.reload());
  }

  deleteAppointment(id: string) {
    void firstValueFrom(this.http.delete(`${API_BASE}/calendar/appointments/${id}`))
      .then(() => this.reload());
  }

  clearAll() {
    void firstValueFrom(this.http.delete(`${API_BASE}/calendar/appointments`))
      .then(() => this.reload());
  }

  seedDemo() {
    return;
  }
}
