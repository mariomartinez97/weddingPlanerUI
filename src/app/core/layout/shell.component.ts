import { Component, ViewChild, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { NgIf } from '@angular/common';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    NgIf,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
  ],
  styles: [`
    .app-wrap { height: 100vh; }

    .toolbar {
      background: rgba(255,255,255,0.65);
      border-bottom: 1px solid rgba(0,0,0,0.06);
      backdrop-filter: blur(8px);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      letter-spacing: .2px;
    }

    .brand-badge {
      width: 34px;
      height: 34px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: rgba(255,255,255,0.7);
      border: 1px solid rgba(0,0,0,0.05);
    }

    .sidenav {
      width: 270px;
      background: rgba(255,255,255,0.7);
      border-right: 1px solid rgba(0,0,0,0.06);
      backdrop-filter: blur(12px);
    }

    .nav-item {
      border-radius: 12px;
      margin: 6px 12px;
    }

    .nav-item.active {
      background: rgba(110,170,255,0.18);
      font-weight: 600;
    }

    .content {
      background: transparent;
    }
  `],
  template: `
  <mat-sidenav-container class="app-wrap">

    <!-- SIDENAV -->
    <mat-sidenav #sidenav class="sidenav"
                 [mode]="isHandset() ? 'over' : 'side'"
                 [opened]="!isHandset()">

      <div style="padding:16px 16px 10px;">
        <div class="brand">
          <div class="brand-badge">💍</div>
          <div>Wedding Planner</div>
        </div>
      </div>

      <mat-nav-list>

        <!-- DASHBOARD -->
        <a mat-list-item
           class="nav-item"
           routerLink="/"
           routerLinkActive="active"
           [routerLinkActiveOptions]="{ exact: true }"
           (click)="closeIfMobile()">
          <mat-icon matListItemIcon>dashboard</mat-icon>
          <span matListItemTitle>Dashboard</span>
        </a>

        <!-- INVITES -->
        <a mat-list-item
           class="nav-item"
           routerLink="/invites"
           routerLinkActive="active"
           (click)="closeIfMobile()">
          <mat-icon matListItemIcon>mail</mat-icon>
          <span matListItemTitle>Invites</span>
        </a>

        <!-- BUDGET -->
        <a mat-list-item
           class="nav-item"
           routerLink="/budget"
           routerLinkActive="active"
           (click)="closeIfMobile()">
          <mat-icon matListItemIcon>account_balance_wallet</mat-icon>
          <span matListItemTitle>Budget</span>
        </a>

        <!-- CHECKLIST -->
        <a mat-list-item
           class="nav-item"
           routerLink="/checklist"
           routerLinkActive="active"
           (click)="closeIfMobile()">
          <mat-icon matListItemIcon>checklist</mat-icon>
          <span matListItemTitle>Checklist</span>
        </a>

        <!-- CALENDAR -->
        <a mat-list-item
           class="nav-item"
           routerLink="/calendar"
           routerLinkActive="active"
           (click)="closeIfMobile()">
          <mat-icon matListItemIcon>event</mat-icon>
          <span matListItemTitle>Calendar</span>
        </a>

        <!-- SEATING -->
        <a mat-list-item
           class="nav-item"
           routerLink="/seating"
           routerLinkActive="active"
           (click)="closeIfMobile()">
          <mat-icon matListItemIcon>table_restaurant</mat-icon>
          <span matListItemTitle>Seating</span>
        </a>

      </mat-nav-list>
    </mat-sidenav>

    <!-- CONTENT -->
    <mat-sidenav-content class="content">
      <mat-toolbar class="toolbar">
        <button mat-icon-button *ngIf="isHandset()" (click)="sidenav.toggle()">
          <mat-icon>menu</mat-icon>
        </button>

        <span style="flex:1 1 auto"></span>

        <button mat-stroked-button color="primary" (click)="seedDemo()">
          Seed demo data
        </button>
      </mat-toolbar>

      <router-outlet></router-outlet>
    </mat-sidenav-content>

  </mat-sidenav-container>
  `
})
export class ShellComponent {

  @ViewChild('sidenav') sidenav!: MatSidenav;

  private bp = inject(BreakpointObserver);
  private demoSeeded = signal(false);

  isHandset = signal(false);

  constructor() {
    this.bp.observe([Breakpoints.Handset])
      .subscribe(r => this.isHandset.set(r.matches));
  }

  closeIfMobile() {
    if (this.isHandset() && this.sidenav) {
      this.sidenav.close();
    }
  }

  async seedDemo() {
    if (this.demoSeeded()) return;

    const { InvitesService } = await import('../services/invites.service');
    const { BudgetService } = await import('../services/budget.service');
    const { ChecklistService } = await import('../services/checklist.service');
    const { CalendarService } = await import('../services/calendar.service');
    const { SeatingService } = await import('../services/seating.service');

    const invites = new InvitesService();
    const budget = new BudgetService();
    const checklist = new ChecklistService();
    const calendar = new CalendarService();
    const seating = new SeatingService(invites);

    invites.seedDemo();
    budget.seedDemo();
    checklist.seedDemo();
    calendar.seedDemo();
    seating.seedDemo();

    this.demoSeeded.set(true);
    alert('Demo data added ✅');
  }
}
