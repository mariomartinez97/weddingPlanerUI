# Backend Module Guide

## Overview

The backend is organized around a small set of application modules:

- API controllers for HTTP entry points
- services and facades for business logic
- persistence entities and repositories for data access
- auth/config plumbing for request scoping and security
- Flyway migrations for schema evolution

This document explains what each backend module is responsible for and how the modules work together.

## Application Entry Module

### `WeddingPlannerApiApplication`

File:

- `src/main/java/com/example/weddingplanner/WeddingPlannerApiApplication.java`

Responsibilities:

- bootstraps the Spring Boot application
- loads all controllers, services, repositories, and config
- starts the embedded server

## API Layer Modules

### Auth API

Files:

- `api/AuthController.java`
- `service/AuthService.java`
- `service/AuthContextService.java`

Responsibilities:

- handles login, current-session lookup, and logout
- resolves the authenticated user from `X-Auth-Token`
- returns the list of active accessible subscriptions in the auth session
- validates whether a request is allowed to use the selected `X-Plan-Id`

Important behavior:

- login returns only active accessible subscriptions
- inactive or archived subscriptions are rejected for plan-scoped requests
- admin requests do not require an active selected subscription

### Admin API

Files:

- `api/AdminController.java`
- `service/AdminService.java`
- `service/AdminPlanService.java`

Responsibilities:

- manages admin-only user operations
- manages subscription creation and lifecycle updates
- assigns user access to active subscriptions
- exposes subscription management for create, rename, assign, deactivate, and archive flows

#### `AdminService`

Focus:

- list users
- create users
- update admin flag and access list
- reset passwords
- delete users

#### `AdminPlanService`

Focus:

- list subscriptions for admin views
- fetch a single subscription
- create a subscription and auto-assign the creating admin
- update subscription name, status, and assigned users
- apply lifecycle timestamps such as `deactivatedAt`, `archivedAt`, and `purgeAfter`

### Invites API

Files:

- `api/InvitesController.java`
- `service/InvitesFacade.java`

Responsibilities:

- manages invite groups and invitees
- supports invite search
- supports invitee CRUD
- supports RSVP patching for individual invitees and entire invite groups
- records audit entries for invite-related changes

Important behavior:

- all invite operations are scoped to the current subscription via `auth.currentPlanId()`
- creating an invite auto-creates a primary invitee if needed
- invite rename attempts to keep the primary invitee aligned with the invite name

### Planning API

Files:

- `api/PlanningController.java`
- `service/PlanningFacade.java`

Responsibilities:

- groups the core planning modules under one facade
- exposes budget, checklist, calendar, and seating endpoints
- keeps all reads and writes scoped to the selected subscription
- records audit entries for planning changes

## Planning Submodules

### Budget Module

Inside `PlanningFacade`

Responsibilities:

- loads the current budget state
- creates a default budget state if one does not exist for the current subscription
- creates, updates, deletes, and clears budget expenses

Persistence:

- `BudgetStateEntity`
- `BudgetExpenseEntity`
- corresponding repositories

### Checklist Module

Inside `PlanningFacade`

Responsibilities:

- lists tasks for the current subscription
- creates, updates, deletes, and clears checklist items
- keeps sorting stable by completion, due date, and title

Persistence:

- `ChecklistItemEntity`
- `ChecklistItemRepository`

### Calendar Module

Inside `PlanningFacade`

Responsibilities:

- lists appointments for the current subscription
- creates, updates, deletes, and clears appointments
- normalizes appointment type and core fields

Persistence:

- `AppointmentEntity`
- `AppointmentRepository`

### Seating Module

Inside `PlanningFacade`

Responsibilities:

- returns tables and seat assignments for the current subscription
- replaces the table set
- assigns and unassigns invitees to tables
- clears seating data when needed

Persistence:

- `SeatingTableEntity`
- `SeatingAssignmentEntity`
- related repositories

Important behavior:

- seating assignment validates that both the invitee and table belong to the active subscription

## Audit Module

Files:

- `api/AuditController.java`
- `service/AuditService.java`
- `service/AuditQueryService.java`

Responsibilities:

- writes audit entries for user actions
- returns recent activity for the active subscription
- enriches audit responses with user display names and emails

Important behavior:

- normal plan-scoped writes use the current subscription from request context
- admin subscription actions can explicitly record audit rows against a target subscription without requiring `X-Plan-Id`

## Health And Bootstrap Modules

### Health Module

File:

- `api/HealthController.java`

Responsibilities:

- exposes a simple health endpoint for deployment checks

### Bootstrap Module

File:

- `service/BootstrapService.java`

Responsibilities:

- ensures the default subscription exists
- ensures the configured admin account exists
- ensures that admin has access to the default subscription

## Auth And Request Context Module

Files:

- `config/AuthFilter.java`
- `config/AuthPrincipal.java`
- `config/RequestContext.java`
- `service/AuthContextService.java`
- `config/CorsConfig.java`

Responsibilities:

- reads auth headers
- authenticates the current request
- stores the resolved user and plan context for downstream services
- makes authenticated user and selected subscription available to service code
- configures CORS for local/frontend access patterns

## Persistence Module

Folders:

- `persistence/entity`
- `persistence/repo`

Responsibilities:

- maps database tables to JPA entities
- exposes repository operations used by services
- provides plan-scoped and user-scoped query methods

Important entity groups:

- auth and admin: `AppUserEntity`, `AuthSessionEntity`, `UserPlanAccessEntity`, `PlanEntity`
- invites: `InviteEntity`, `InviteeEntity`
- planning: budget, checklist, calendar, seating entities
- audit: `AuditLogEntity`

## Database Migration Module

Folder:

- `src/main/resources/db/migration`

Responsibilities:

- creates and evolves the database schema
- adds plan/subscription lifecycle metadata
- keeps existing data compatible as the system grows

Important migrations:

- initial schema setup
- invite schema alignment
- planning-module tables
- auth and multi-plan support
- admin role support
- plan lifecycle metadata support

## Utility Module

### `IdService`

File:

- `service/IdService.java`

Responsibilities:

- generates stable prefixed IDs such as `usr_*`, `plan_*`, `inv_*`, and `audit_*`

## Request Flow Summary

Typical request flow:

1. `AuthFilter` reads `X-Auth-Token` and optional `X-Plan-Id`
2. `AuthService` validates the token and selected subscription
3. `RequestContext` stores the resolved principal
4. the controller delegates to the relevant service/facade
5. the service reads or writes through repositories
6. `AuditService` records activity when needed
7. DTOs are returned to the client
