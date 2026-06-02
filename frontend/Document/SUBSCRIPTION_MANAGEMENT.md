# Subscription Management Frontend

## Overview

The frontend now supports:

- displaying accessible subscriptions to valid users
- switching between subscriptions from the toolbar
- allowing admins to create subscriptions
- allowing admins to rename subscriptions
- allowing admins to assign users to subscriptions
- allowing admins to mark subscriptions as active, inactive, or archived

## Session And Subscription Selection

The active subscription comes from the authenticated session.

### Session payload

The auth session includes:

- `token`
- `user`
- `plans`

Even though the backend path still uses `plans`, the UI treats these records as subscriptions.

### Selector behavior

- the toolbar selector shows the subscriptions returned by auth
- the selected subscription is stored locally
- if the stored subscription is still valid after refresh, it is preserved
- if the stored subscription disappears, the first valid accessible subscription becomes active
- if the user has no accessible subscriptions, the UI avoids forcing an invalid selection

## Admin Subscription Management

The admin page includes a subscription management area that uses:

- `GET /api/admin/plans?includeInactive=true`
- `GET /api/admin/plans/{planId}`
- `POST /api/admin/plans`
- `PUT /api/admin/plans/{planId}`

### Admin subscription fields shown in the UI

- `name`
- `status`
- `assignedUserIds`
- `assignedUserCount`
- `updatedAt`
- `deactivatedAt`
- `archivedAt`
- `purgeAfter`

### Statuses

- `ACTIVE`
- `INACTIVE`
- `ARCHIVED`

## User Access Management

The user-management section still exists on the admin page.

Important rule:

- when assigning subscription access to a user, the selectable list should come from active subscriptions only

This keeps the UI aligned with the backend rule that inactive or archived subscriptions cannot be assigned for normal access.

## Routing And Empty States

The shell layout is designed to handle authenticated users who currently have no accessible subscriptions.

Expected behavior:

- admins can still access the admin page
- non-admin users see that no subscriptions are assigned
- subscription-scoped pages should not assume a selector value exists when there are no accessible subscriptions

## Terminology

Frontend copy uses **subscription** for user-facing language.

Examples:

- toolbar selector label
- admin creation form
- admin management section
- user access labels

## Current Limitations

- the backend still uses `/api/admin/plans` paths and `plans` in auth session payloads
- subscription-scoped feature pages still depend on the currently selected active subscription
- hard delete and automated archive purge are not available yet
