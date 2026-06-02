# Production Fixes Context (Invite Save Issue)

This document captures the exact changes required to make production deployment work and to diagnose the `Save` issue on the invite form.

## Symptom

- In deployed frontend, clicking **Save** in New Invite dialog appeared to do nothing.
- After adding error surfacing in UI, the dialog showed:
- `Could not save invite (HTTP 403).`

## Root Causes Identified

1. Frontend dependency mismatch during static build:
- Angular `17.3.x` requires `zone.js ~0.14.x`.
- Project had `zone.js ^0.16.0`, causing Render build failure.

2. Backend CORS blocked browser preflight:
- Browser `OPTIONS /api/invites` returned:
- `HTTP 403 Invalid CORS request`

## Code Changes Applied

### 1) Frontend dependency compatibility

File changed:
- `frontend/package.json`

Change:
- `zone.js` from `^0.16.0` to `~0.14.10`

Why:
- Align with Angular 17 peer dependency requirements.

---

### 2) Invite dialog error visibility and save-state UX

File changed:
- `frontend/src/app/features/invites/invite-form-dialog.component.ts`

Changes:
- Added `saving` state signal.
- Added `errorMsg` state signal.
- Wrapped save logic in `try/catch/finally`.
- Added inline error message in dialog actions area.
- Disabled Save button while request is in progress.
- Added console error for debugging.

Why:
- Previously failures were silent, making production diagnosis difficult.

---

### 3) Backend CORS made configurable for production

File changed:
- `backend/src/main/java/com/example/weddingplanner/config/CorsConfig.java`

Changes:
- Added property-driven origin list:
- `@Value("${app.cors.allowed-origins:http://localhost:4200}")`
- Switched from fixed `.allowedOrigins(...)` to `.allowedOriginPatterns(...)`.
- Added methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
- Added CSV parsing helper for multiple origins.

Why:
- Needed local + deployed frontend origins without code edits per environment.

## Render Configuration Required

### Backend env var

- Key: `APP_CORS_ALLOWED_ORIGINS`
- Value:
- `https://*.onrender.com,http://localhost:4200`

Notes:
- No quotes.
- No trailing slash in origins.
- Redeploy backend after changing env vars.

### Frontend rewrite rules (order matters)

1. Source: `/api/*`
- Destination: `https://weddingplanerui.onrender.com/api/*`
- Action: `Rewrite`

2. Source: `/*`
- Destination: `/index.html`
- Action: `Rewrite`

Note:
- Use `/index.html` (with leading slash).

## Verification Steps

1. Backend health:
- `GET https://weddingplanerui.onrender.com/api/health` => `{"status":"ok"}`

2. CORS preflight:
- `OPTIONS https://weddingplanerui.onrender.com/api/invites`
- with `Origin: https://<frontend>.onrender.com`
- should return `Access-Control-Allow-Origin` for that origin.

3. UI flow:
- Open Invites page -> New Invite -> Save.
- Dialog should close and new invite should appear after reload.

## Security Note

- A DB password was exposed earlier in pasted logs due to credentials embedded in JDBC URL.
- Password was rotated.
- Keep credentials only in:
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- and keep URL credential-free:
- `SPRING_DATASOURCE_URL=jdbc:postgresql://host:5432/db`

