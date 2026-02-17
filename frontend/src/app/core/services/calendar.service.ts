import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Appointment } from '../models';
import { loadFromStorage, saveToStorage, uid } from './storage.util';

type CalendarStore = { appointments: Appointment[] };
const KEY = 'wp_calendar_v1';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private store$ = new BehaviorSubject<CalendarStore>(loadFromStorage<CalendarStore>(KEY, { appointments: [] }));
  storeObs$ = this.store$.asObservable();
  get snapshot(): CalendarStore { return this.store$.value; }

  private persist(next: CalendarStore) {
    this.store$.next(next);
    saveToStorage(KEY, next);
  }

  addAppointment(input: Omit<Appointment, 'id'>) {
    const s = this.snapshot;
    const appt: Appointment = { ...input, id: uid('appt') };
    this.persist({ appointments: [appt, ...s.appointments] });
  }

  updateAppointment(id: string, patch: Partial<Appointment>) {
    const s = this.snapshot;
    this.persist({ appointments: s.appointments.map(a => a.id === id ? { ...a, ...patch } : a) });
  }

  deleteAppointment(id: string) {
    const s = this.snapshot;
    this.persist({ appointments: s.appointments.filter(a => a.id !== id) });
  }

  clearAll() { this.persist({ appointments: [] }); }

  seedDemo() {
    if (this.snapshot.appointments.length) return;
    this.addAppointment({
      type: 'WEDDING_PLANNER',
      title: 'Planning meeting',
      withWhom: 'Olivia (Planner)',
      start: '2026-03-05T18:00:00',
      end: '2026-03-05T18:45:00',
      location: 'Zoom',
      notes: 'Discuss timeline & vendor shortlist'
    });
    this.addAppointment({
      type: 'VENUE_MANAGER',
      title: 'Venue walkthrough',
      withWhom: 'Venue Manager',
      start: '2026-03-12T14:00:00',
      end: '2026-03-12T15:00:00',
      location: 'Green Hall',
    });
    this.addAppointment({
      type: 'PROVIDER',
      title: 'Cake tasting',
      withWhom: 'Sweet Cakes',
      start: '2026-03-20T16:00:00',
      end: '2026-03-20T16:45:00',
      location: 'Downtown',
    });
  }
}
