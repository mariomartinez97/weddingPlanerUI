# Wedding Planner UI/API Deployment Context

This file captures the key implementation and deployment decisions from this setup so future updates are faster and safer.

## Project Structure

- Frontend: Angular 17 app in `frontend/`
- Backend: Spring Boot 3.3.5 (Java 21) in `backend/`
- Database: PostgreSQL (managed, previously local)

## Architecture Chosen

- Backend deployed as a Docker service on Render.
- Database deployed as managed Postgres on Render.
- Frontend deployed as Render Static Site.
- Frontend calls API using relative base path `'/api'` (`frontend/src/app/core/api/api.config.ts`), and Render rewrite routes `/api/*` to backend.

## Backend Deployment (Render)

### Docker

- Language/runtime: `DOCKER`
- Dockerfile path: `backend/Dockerfile`

Current `backend/Dockerfile`:

- Build stage: Maven + Temurin 21
- Runtime stage: Temurin 21 JRE
- Entrypoint binds Spring server port from `PORT` env var

### Environment Variables

Use these in Render service settings:

- `SPRING_DATASOURCE_URL=jdbc:postgresql://<host>:5432/<database>`
- `SPRING_DATASOURCE_USERNAME=<db_user>`
- `SPRING_DATASOURCE_PASSWORD=<db_password>`

Important:

- Do **not** include `user:password@` inside the JDBC URL.
- Credentials must be in separate env vars.

### Health Check

- Endpoint: `/api/health`
- Example: `https://weddingplanerui.onrender.com/api/health`

## Database Notes

- Recommended naming used:
- Instance/service name: `wedding-planner-prod`
- Database: `wedding_planner`
- User: `wedding_app`
- Password exposure occurred once via logs when credentials were embedded in URL; password was rotated.

## Frontend Deployment (Render Static Site)

### Static Site Settings

- Root Directory: `frontend`
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist/wedding-planner-ui/browser`

### Rewrites (order matters)

1. `/api/*` -> `https://weddingplanerui.onrender.com/api/*` (Rewrite)
2. `/*` -> `/index.html` (Rewrite)

Reason:

- Rule 1 proxies API calls from frontend to backend.
- Rule 2 supports Angular SPA routing on refresh/direct URL entry.

## Dependency Issue Resolved

During frontend deploy, npm failed with Angular peer dependency conflict:

- Angular 17 requires `zone.js ~0.14.x`
- Project had `zone.js ^0.16.0`

Fix applied:

- Updated `frontend/package.json` to:
- `"zone.js": "~0.14.10"`

Recommended follow-up:

- Run `npm install` in `frontend/` locally to refresh `package-lock.json`.
- Commit both `frontend/package.json` and `frontend/package-lock.json`.

## CORS Note

- Backend CORS currently allows `http://localhost:4200` for local development.
- In production with same-origin rewrite (`/api` via static site), CORS is typically not hit by browser as cross-origin.
- If frontend calls backend domain directly in future, update CORS allowed origins accordingly.

## Practical Runbook (Future Deploys)

1. Push code changes to repo.
2. Backend Render service auto-builds from `backend/Dockerfile`.
3. Ensure DB env vars are present and correct.
4. Verify backend health endpoint.
5. Frontend Render static site builds from `frontend/`.
6. Confirm rewrite rules still exist in correct order.
7. Validate app flows (load data, create/update/delete invite data).

## Security Notes

- Keep DB password only in Render secrets.
- Never paste credentials in logs/screenshots/chat.
- Rotate credentials immediately if exposed.

