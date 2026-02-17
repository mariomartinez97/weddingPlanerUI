import { Routes } from '@angular/router';
import { ShellComponent } from './core/layout/shell.component';

import { DashboardPageComponent } from './features/dashboard/dashboard-page.component';
import { InvitesPageComponent } from './features/invites/invites-page.component';
import { BudgetPageComponent } from './features/budget/budget-page.component';
import { ChecklistPageComponent } from './features/checklist/checklist-page.component';
import { CalendarPageComponent } from './features/calendar/calendar-page.component';
import { SeatingPageComponent } from './features/seating/seating-page.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', component: DashboardPageComponent },
      { path: 'invites', component: InvitesPageComponent },
      { path: 'budget', component: BudgetPageComponent },
      { path: 'checklist', component: ChecklistPageComponent },
      { path: 'calendar', component: CalendarPageComponent },
      { path: 'seating', component: SeatingPageComponent },
    ]
  },
  { path: '**', redirectTo: '' }
];
