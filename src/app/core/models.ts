export type RSVPStatus = 'PENDING' | 'YES' | 'NO' | 'MAYBE';

export interface PartyContact {
  email?: string;
  phone?: string;
}

export interface Party {
  id: string;
  inviteName: string;      // main invite name (family/couple)
  contact?: PartyContact;  // main contact for that invite
  notes?: string;
}

export interface Invitee {
  id: string;
  partyId: string;         // link to Party
  fullName: string;        // companion/person name
  rsvp: RSVPStatus;
  mealChoice?: string;
  notes?: string;
}

export interface BudgetState {
  totalBudget: number;
  currency: 'CAD' | 'USD' | 'EUR';
}

export interface Expense {
  id: string;
  category: string;
  vendor?: string;
  amount: number;
  paid: boolean;
  date?: string; // yyyy-mm-dd
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  owner: string;
  dueDate?: string; // yyyy-mm-dd
  done: boolean;
  notes?: string;
}

export type AppointmentType = 'WEDDING_PLANNER' | 'VENUE_MANAGER' | 'PROVIDER';

export interface Appointment {
  id: string;
  type: AppointmentType;
  title: string;
  withWhom: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
  location?: string;
  notes?: string;
}

export interface TableDef {
  id: string;
  name: string;
  seats: number;
}

export interface SeatingAssignment {
  inviteeId: string;
  tableId: string;
  seatNumber?: number;
}
