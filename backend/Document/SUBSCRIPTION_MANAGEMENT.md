# Subscription Management Backend

## Overview

The backend supports subscription management through the existing `plans` model.

There is no separate `subscriptions` table in this phase. Instead, the `plans` table carries lifecycle fields that allow the application to treat a plan as an active subscription, inactive subscription, or archived subscription.

## Data Model

The `plans` table now includes:

- `id`
- `name`
- `status`
- `created_at`
- `updated_at`
- `deactivated_at`
- `archived_at`
- `purge_after`

### Status Values

- `ACTIVE`
- `INACTIVE`
- `ARCHIVED`

### Status Rules

- `ACTIVE`: visible to valid users and usable as `X-Plan-Id`
- `INACTIVE`: hidden from user session plan lists and rejected for plan-scoped requests
- `ARCHIVED`: hidden from user session plan lists, rejected for plan-scoped requests, and marked for future purge handling

## Admin API

### List subscriptions

- `GET /api/admin/plans`
- returns active subscriptions only

- `GET /api/admin/plans?includeInactive=true`
- returns active, inactive, and archived subscriptions

### Get subscription

- `GET /api/admin/plans/{planId}`

### Create subscription

- `POST /api/admin/plans`

Request body:

```json
{
  "name": "Premium Wedding Package",
  "assignedUserIds": ["usr_123", "usr_456"]
}
```

Behavior:

- creates an `ACTIVE` subscription
- automatically assigns the creating admin to the subscription

### Update subscription

- `PUT /api/admin/plans/{planId}`

Request body:

```json
{
  "name": "Premium Wedding Package - Updated",
  "status": "ACTIVE",
  "assignedUserIds": ["usr_123", "usr_456"]
}
```

Behavior:

- fully replaces editable subscription state
- updates the name
- updates the lifecycle status
- synchronizes assigned users

## Authentication Behavior

- `POST /api/auth/login` returns only active accessible subscriptions
- `GET /api/auth/me` returns only active accessible subscriptions
- plan-scoped API calls still require `X-Plan-Id`
- admin API calls require only `X-Auth-Token`

## User Access Rules

- user access can only be assigned to active subscriptions
- historical access rows may still exist for inactive or archived subscriptions
- inactive and archived subscriptions are ignored for end-user selection

## Audit Behavior

Admin subscription actions are written to the audit log against the affected plan ID.

Examples:

- create subscription
- update subscription
- rename subscription
- lifecycle changes

## Current Limitations

- no hard delete endpoint for subscriptions
- no automated purge job for archived subscriptions
- retention is prepared through `purge_after`, but cleanup is a later feature
