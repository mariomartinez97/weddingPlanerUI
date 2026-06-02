# Frontend Documentation

This folder contains frontend-facing documentation for the Angular application.

## Contents

- [Module Guide](./MODULE_GUIDE.md)
- [Subscription Management](./SUBSCRIPTION_MANAGEMENT.md)

## Frontend Summary

The frontend is responsible for:

- login and session persistence
- switching between accessible subscriptions
- rendering subscription-scoped pages
- exposing admin tools for user and subscription management

## Current Stack

- Angular 17
- Angular Material
- RxJS

## Important Concepts

- The UI now uses the term **subscription** for the user-facing plan selector and admin management screens.
- End users only see subscriptions returned by `/api/auth/login` and `/api/auth/me`.
- Admin management uses the richer admin subscription API under `/api/admin/plans`.

## Related Source Areas

- `src/app/core/services`
- `src/app/core/layout`
- `src/app/features/admin`
- `src/app/core/models.ts`
