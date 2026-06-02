# Frontend Module Guide

## Overview

The frontend is organized into two main areas:

- `core`: shared application plumbing, services, models, auth, and layout
- `features`: page-level modules for each functional area

This document explains what each frontend module does and how the modules fit together.

## Application Shell Modules

### App bootstrap

Files:

- `src/main.ts`
- `src/app/app.component.ts`
- `src/app/app.routes.ts`

Responsibilities:

- bootstraps the Angular application
- registers router and HTTP interceptor providers
- declares the application route tree
- mounts the shell for authenticated routes

### Shell layout

File:

- `src/app/core/layout/shell.component.ts`

Responsibilities:

- renders the top toolbar and side navigation
- shows the subscription selector
- lets authenticated users switch between accessible subscriptions
- provides navigation to the main feature pages
- exposes logout and language toggle actions

Important behavior:

- the subscription selector uses the auth session’s accessible subscriptions
- the shell now handles authenticated users with zero accessible subscriptions without crashing the UI

## Core Auth Modules

### Auth service

File:

- `src/app/core/services/auth.service.ts`

Responsibilities:

- stores the auth session in local storage
- stores the active subscription ID in local storage
- performs login, refresh, and logout
- exposes the current user, admin status, and accessible subscriptions
- preserves the selected subscription when still valid after refresh

### Auth interceptor

File:

- `src/app/core/auth/auth.interceptor.ts`

Responsibilities:

- adds `X-Auth-Token` to authenticated requests
- adds `X-Plan-Id` to plan-scoped API requests when an active subscription exists

### Auth guard

File:

- `src/app/core/auth/auth.guard.ts`

Responsibilities:

- protects authenticated routes
- refreshes the session before allowing access
- redirects unauthenticated users to the login page

## Core Model And Utility Modules

### Models

File:

- `src/app/core/models.ts`

Responsibilities:

- defines shared TypeScript interfaces used across the app
- holds DTO shapes for auth, admin users, subscriptions, invites, budget, checklist, calendar, seating, and audit

### API config and helper modules

Files:

- `src/app/core/api/api.config.ts`
- `src/app/core/api/invites.api.ts`
- `src/app/core/services/storage.util.ts`

Responsibilities:

- holds API-related helper configuration
- supports request mapping helpers where used
- provides shared storage utilities for browser persistence

### Internationalization

Files:

- `src/app/core/services/i18n.service.ts`
- `src/app/core/pipes/translate.pipe.ts`

Responsibilities:

- stores the active language
- provides translation lookup for templates
- drives language toggling in the shell

## Core Domain Service Modules

### Admin service

File:

- `src/app/core/services/admin.service.ts`

Responsibilities:

- talks to `/api/admin/users`
- talks to `/api/admin/plans`
- fetches admin subscription records
- creates and updates subscriptions
- manages user access, password reset, and user deletion

### Audit service

File:

- `src/app/core/services/audit.service.ts`

Responsibilities:

- loads activity data for the current subscription
- provides the audit page with recent change history

### Invites service

File:

- `src/app/core/services/invites.service.ts`

Responsibilities:

- loads invite groups and invitees from the backend
- maps backend invite payloads into frontend-friendly stores
- supports invite CRUD, invitee CRUD, search support, and RSVP updates
- serves as the invite state source for invites UI and seating interactions

### Budget service

File:

- `src/app/core/services/budget.service.ts`

Responsibilities:

- loads current budget state and expense list
- supports total budget updates
- supports create, update, delete, and clear operations for expenses

### Checklist service

File:

- `src/app/core/services/checklist.service.ts`

Responsibilities:

- loads checklist items
- supports create, update, delete, and clear operations

### Calendar service

File:

- `src/app/core/services/calendar.service.ts`

Responsibilities:

- loads appointments
- supports create, update, delete, and clear operations

### Seating service

File:

- `src/app/core/services/seating.service.ts`

Responsibilities:

- loads seating tables and assignments
- replaces the table list
- assigns and unassigns invitees
- clears seating data
- coordinates with the invites store so seat assignments stay aligned to valid invitees

## Feature Page Modules

### Login feature

File:

- `features/auth/login-page.component.ts`

Responsibilities:

- collects credentials
- calls the auth service login flow
- transitions the user into the authenticated app shell

### Dashboard feature

File:

- `features/dashboard/dashboard-page.component.ts`

Responsibilities:

- aggregates data from invites, budget, checklist, and calendar services
- shows summary widgets such as RSVP distribution, budget breakdown, appointments, and top tasks

### Invites feature

Files:

- `features/invites/invites-page.component.ts`
- `features/invites/invite-form-dialog.component.ts`
- `features/invites/excel-import-dialog.component.ts`

Responsibilities:

- lists and edits invite groups
- manages invitees and RSVP state
- supports Excel import workflows
- handles invite-specific dialogs and forms

### Budget feature

Files:

- `features/budget/budget-page.component.ts`
- `features/budget/expense-dialog.component.ts`
- `features/budget/budget-settings-dialog.component.ts`

Responsibilities:

- shows budget summary and expenses
- opens dialogs for expense editing and budget settings

### Checklist feature

Files:

- `features/checklist/checklist-page.component.ts`
- `features/checklist/checklist-item-dialog.component.ts`

Responsibilities:

- displays checklist tasks
- opens item dialogs for create and update flows

### Calendar feature

Files:

- `features/calendar/calendar-page.component.ts`
- `features/calendar/appointment-dialog.component.ts`

Responsibilities:

- shows calendar appointments
- opens appointment dialogs for create and update flows

### Seating feature

Files:

- `features/seating/seating-page.component.ts`
- `features/seating/table-editor-dialog.component.ts`

Responsibilities:

- displays seating tables and guest assignments
- supports editing table structures
- supports seating assignment workflows

### Audit feature

File:

- `features/audit/audit-page.component.ts`

Responsibilities:

- renders recent activity for the currently selected subscription

### Admin feature

File:

- `features/admin/admin-page.component.ts`

Responsibilities:

- creates subscriptions
- edits subscription name, status, and assigned users
- shows lifecycle metadata such as deactivated, archived, and purge timestamps
- manages users and their subscription access

Important behavior:

- admin subscription management uses the richer `/api/admin/plans` responses
- user access assignment is limited to active subscriptions

## Data Flow Summary

Typical frontend flow:

1. the user logs in through the login page
2. `AuthService` stores the session and active subscription
3. `authInterceptor` adds auth headers to API requests
4. feature services load subscription-scoped data from the backend
5. feature pages render state from those services
6. the shell lets the user change the active subscription and refresh feature data

## Current Limitations

- there are currently no frontend spec files in `src/app`
- generated build output is committed separately under `frontend/dist`
- the backend still uses `plans` in some payload names even though the UI now uses the term `subscription`
