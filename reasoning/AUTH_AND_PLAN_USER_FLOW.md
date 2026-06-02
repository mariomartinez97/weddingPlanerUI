# Auth And Plan User Flow

## Overview

The application now supports:

- login with database-backed users
- admin and non-admin users
- access to one or multiple wedding plans
- active/inactive/archived plan lifecycle management
- switching between plans from the UI
- audit visibility for changes made inside the selected plan

“Subscription” is currently implemented as lifecycle metadata on the `plans` record itself. There is no separate `subscriptions` table in this phase.

## Main User Flow

### 1. Login

- The user lands on the login page.
- They enter email and password.
- The backend validates credentials against users stored in the same database.
- If valid, the backend returns:
  - the auth token
  - the logged-in user
  - the list of plans the user can access

### 2. Session Setup

- The frontend stores the token locally.
- The frontend selects an active plan.
- API calls include:
  - `X-Auth-Token`
  - `X-Plan-Id`

This means all plan data requests are scoped to the selected plan.

### 3. Plan Selection

- After login, the user sees a `Plan` selector in the toolbar.
- If the user has access to multiple plans, they can switch between them.
- When they switch:
  - the active plan changes
  - data pages reload against the newly selected plan

### 4. Daily Usage

Within the selected plan, the user can work with:

- invites
- budget
- checklist
- calendar
- seating
- activity log

All reads and writes are scoped to the currently selected plan.

### 5. Activity / Traceability

- Changes are written to the audit log.
- The `Activity` page shows recent changes for the current plan.
- This provides a basic trace of who changed what and when.

## Admin Flow

### Admin Capabilities Today

Admin users can access the `Admin` page.

From there they can:

- create new users
- mark a user as admin or non-admin
- assign which active plans a user can access
- create a new plan and assign users at creation time
- rename plans
- deactivate plans
- archive plans
- view plan lifecycle metadata for admin management

## Plan Lifecycle

Each plan now has:

- `status`: `ACTIVE`, `INACTIVE`, or `ARCHIVED`
- `createdAt`
- `updatedAt`
- `deactivatedAt`
- `archivedAt`
- `purgeAfter`

Lifecycle rules:

- `ACTIVE` plans are visible to end users and can be used as `X-Plan-Id`.
- `INACTIVE` plans are hidden from end-user plan lists and rejected for plan-scoped API requests.
- `ARCHIVED` plans are also hidden/rejected and store a `purgeAfter` timestamp for future cleanup work.
- reactivating a plan clears `deactivatedAt`, `archivedAt`, and `purgeAfter`
- deactivating a plan sets `deactivatedAt`
- archiving a plan sets `archivedAt` and computes `purgeAfter` from backend config

Current retention behavior:

- retention is prepared in the schema and backend config
- there is no hard-delete or purge job yet

## Backend Admin API

### Plan Endpoints

- `GET /api/admin/plans`
  - returns active plans only by default
- `GET /api/admin/plans?includeInactive=true`
  - returns active, inactive, and archived plans
- `GET /api/admin/plans/{planId}`
  - returns full plan detail
- `POST /api/admin/plans`
  - creates a new active plan
  - request body:
    - `name`
    - `assignedUserIds`
  - behavior:
    - the creating admin is automatically added to the plan access list
- `PUT /api/admin/plans/{planId}`
  - full replacement of editable plan state
  - request body:
    - `name`
    - `status`
    - `assignedUserIds`

### Plan DTO Returned By Admin API

Admin plan responses now include:

- `id`
- `name`
- `status`
- `createdAt`
- `updatedAt`
- `deactivatedAt`
- `archivedAt`
- `purgeAfter`
- `assignedUserIds`
- `assignedUserCount`

### User Access Rules

- user-access management endpoints only allow assignment to `ACTIVE` plans
- inactive/archived plans may still have existing access rows in the database, but they are ignored by login/auth plan selection

## Auth Behavior

- `POST /api/auth/login` returns only active plans in the session payload
- `GET /api/auth/me` returns only active plans in the session payload
- any plan-scoped request using `X-Plan-Id` for an inactive or archived plan is rejected
- admin endpoints do not require `X-Plan-Id`; they only require a valid admin auth token

## Summary

Current state:

- authentication exists
- users exist in the database
- plan-based access exists
- plan lifecycle management exists
- plan switching exists
- audit tracing exists
- admin can manage user access to active plans
- admin can create and manage plans/subscriptions themselves

Still not implemented:

- hard deletion of plans
- automated purge of archived plans after `purgeAfter`
