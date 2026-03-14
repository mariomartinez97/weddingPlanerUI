import { Routes } from '@angular/router';
import { ShellComponent } from './core/layout/shell.component';
import { authGuard } from './core/auth/auth.guard';

import { DashboardPageComponent } from './features/dashboard/dashboard-page.component';
import { InvitesPageComponent } from './features/invites/invites-page.component';
import { BudgetPageComponent } from './features/budget/budget-page.component';
import { ChecklistPageComponent } from './features/checklist/checklist-page.component';
import { CalendarPageComponent } from './features/calendar/calendar-page.component';
import { SeatingPageComponent } from './features/seating/seating-page.component';
import { LoginPageComponent } from './features/auth/login-page.component';
import { AuditPageComponent } from './features/audit/audit-page.component';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: DashboardPageComponent },
      { path: 'invites', component: InvitesPageComponent },
      { path: 'budget', component: BudgetPageComponent },
      { path: 'checklist', component: ChecklistPageComponent },
      { path: 'calendar', component: CalendarPageComponent },
      { path: 'seating', component: SeatingPageComponent },
      { path: 'activity', component: AuditPageComponent },
    ]
  },
  { path: '**', redirectTo: '' }
];
