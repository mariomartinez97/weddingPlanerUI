import { Component, ViewChild, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '../pipes/translate.pipe';

import { InvitesService } from '../services/invites.service';
import { BudgetService } from '../services/budget.service';
import { ChecklistService } from '../services/checklist.service';
import { CalendarService } from '../services/calendar.service';
import { SeatingService } from '../services/seating.service';
import { AppLanguage, I18nService } from '../services/i18n.service';

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
    TranslatePipe,
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

    .language-toggle {
      position: fixed;
      left: 16px;
      bottom: 16px;
      z-index: 30;
      display: inline-flex;
      gap: 4px;
      padding: 4px;
      border-radius: 999px;
      background: rgba(255,255,255,0.88);
      border: 1px solid rgba(0,0,0,0.08);
      box-shadow: 0 14px 30px rgba(15, 23, 42, 0.14);
      backdrop-filter: blur(10px);
    }

    .language-toggle button.active {
      background: rgba(110,170,255,0.18);
      border-color: rgba(59,130,246,0.18);
      font-weight: 700;
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
          <div>{{ 'appTitle' | t }}</div>
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
          <span matListItemTitle>{{ 'navDashboard' | t }}</span>
        </a>

        <!-- INVITES -->
        <a mat-list-item
           class="nav-item"
           routerLink="/invites"
           routerLinkActive="active"
           (click)="closeIfMobile()">
          <mat-icon matListItemIcon>mail</mat-icon>
          <span matListItemTitle>{{ 'navInvites' | t }}</span>
        </a>

        <!-- BUDGET -->
        <a mat-list-item
           class="nav-item"
           routerLink="/budget"
           routerLinkActive="active"
           (click)="closeIfMobile()">
          <mat-icon matListItemIcon>account_balance_wallet</mat-icon>
          <span matListItemTitle>{{ 'navBudget' | t }}</span>
        </a>

        <!-- CHECKLIST -->
        <a mat-list-item
           class="nav-item"
           routerLink="/checklist"
           routerLinkActive="active"
           (click)="closeIfMobile()">
          <mat-icon matListItemIcon>checklist</mat-icon>
          <span matListItemTitle>{{ 'navChecklist' | t }}</span>
        </a>

        <!-- CALENDAR -->
        <a mat-list-item
           class="nav-item"
           routerLink="/calendar"
           routerLinkActive="active"
           (click)="closeIfMobile()">
          <mat-icon matListItemIcon>event</mat-icon>
          <span matListItemTitle>{{ 'navCalendar' | t }}</span>
        </a>

        <!-- SEATING -->
        <a mat-list-item
           class="nav-item"
           routerLink="/seating"
           routerLinkActive="active"
           (click)="closeIfMobile()">
          <mat-icon matListItemIcon>table_restaurant</mat-icon>
          <span matListItemTitle>{{ 'navSeating' | t }}</span>
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
          {{ 'seedDemoData' | t }}
        </button>
      </mat-toolbar>

      <router-outlet></router-outlet>

      <div class="language-toggle" aria-label="Language toggle">
        <button mat-stroked-button type="button" [class.active]="language() === 'en'" (click)="setLanguage('en')">
          {{ 'shortEn' | t }}
        </button>
        <button mat-stroked-button type="button" [class.active]="language() === 'es'" (click)="setLanguage('es')">
          {{ 'shortEs' | t }}
        </button>
      </div>
    </mat-sidenav-content>

  </mat-sidenav-container>
  `
})
export class ShellComponent {

  @ViewChild('sidenav') sidenav!: MatSidenav;

  private invites = inject(InvitesService);
  private budget = inject(BudgetService);
  private checklist = inject(ChecklistService);
  private calendar = inject(CalendarService);
  private seating = inject(SeatingService);
  private i18n = inject(I18nService);

  private bp = inject(BreakpointObserver);
  private demoSeeded = signal(false);

  isHandset = signal(false);
  language = this.i18n.language;

  constructor() {
    this.bp.observe([Breakpoints.Handset])
      .subscribe(r => this.isHandset.set(r.matches));
  }

  closeIfMobile() {
    if (this.isHandset() && this.sidenav) {
      this.sidenav.close();
    }
  }

  setLanguage(language: AppLanguage) {
    this.i18n.setLanguage(language);
  }

  async seedDemo() {
    if (this.demoSeeded()) return;
  
    await this.invites.seedDemo();
    this.budget.seedDemo();
    this.checklist.seedDemo();
    this.calendar.seedDemo();
    this.seating.seedDemo();
  
    this.demoSeeded.set(true);
    alert(`${this.i18n.t('demoDataAdded')} ✅`);
  }
  
}
