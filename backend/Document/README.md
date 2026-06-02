# Backend Documentation

This folder contains backend-facing documentation for the Spring Boot API.

## Contents

- [Module Guide](./MODULE_GUIDE.md)
- [Subscription Management](./SUBSCRIPTION_MANAGEMENT.md)

## Backend Summary

The backend is responsible for:

- authentication and session validation
- plan-based multi-tenant data access
- admin user management
- subscription lifecycle management
- audit logging

## Current Stack

- Spring Boot 3
- Java 21
- Spring Data JPA
- Flyway migrations
- PostgreSQL in deployed environments

## Important Concepts

- The user-facing term **subscription** is currently implemented on the backend as lifecycle metadata on the `plans` table.
- Normal application data remains scoped by `X-Plan-Id`.
- Admin endpoints under `/api/admin/*` do not require an active selected plan.

## Related Source Areas

- `src/main/java/com/example/weddingplanner/api`
- `src/main/java/com/example/weddingplanner/service`
- `src/main/java/com/example/weddingplanner/persistence`
- `src/main/resources/db/migration`
