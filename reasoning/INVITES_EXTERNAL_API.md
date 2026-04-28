# Invites External API

Base URL (production example):
- `https://weddingplanerui.onrender.com/api`

## Authentication And Plan Headers

All invite endpoints are now authenticated and plan-scoped.

Required headers for invite API calls:
- `X-Auth-Token: <session-token>`
- `X-Plan-Id: <active-plan-id>`

Notes:
- Missing or invalid auth token returns `401`.
- Missing `X-Plan-Id` on invite endpoints returns `401`.
- Inactive or archived plans are rejected.
- Admin endpoints are the only API family that does not require `X-Plan-Id`.

Example:
```bash
curl "https://weddingplanerui.onrender.com/api/invites" \
  -H "X-Auth-Token: <session-token>" \
  -H "X-Plan-Id: <plan-id>"
```

## Invite Response Shape

`GET /invites` and `GET /invites/search` return:

```json
[
  {
    "id": "inv_abcd1234",
    "inviteName": "Mario Martinez",
    "contact": {
      "email": "mario@example.com",
      "phone": null
    },
    "notes": null,
    "companions": [
      {
        "id": "pers_1111",
        "inviteId": "inv_abcd1234",
        "fullName": "Mario Martinez",
        "rsvp": "YES",
        "mealChoice": null,
        "notes": null
      },
      {
        "id": "pers_2222",
        "inviteId": "inv_abcd1234",
        "fullName": "Maria Paula",
        "rsvp": "PENDING",
        "mealChoice": null,
        "notes": null
      }
    ]
  }
]
```

Notes:
- `companions` includes the primary invitee too, not only extra companions.
- Companion rows are sorted by `fullName`.
- Invites are sorted by `inviteName`.

## Endpoints

### 1) List Invites

- `GET /invites`

Returns all invites for the selected plan.

### 2) Search Invites By Name

- `GET /invites/search?q=<text>`

Searches by:
- `inviteName`
- `companions[].fullName`

Matching rules:
- case-insensitive
- partial match (`contains`)
- blank `q` returns the same result as `GET /invites`

Example:
```bash
curl "https://weddingplanerui.onrender.com/api/invites/search?q=mar" \
  -H "X-Auth-Token: <session-token>" \
  -H "X-Plan-Id: <plan-id>"
```

### 3) Create Invite

- `POST /invites`

Request body:
```json
{
  "inviteName": "Mario Martinez",
  "contact": {
    "email": "mario@example.com",
    "phone": "555-555-5555"
  },
  "notes": "Cousins table",
  "companions": [
    {
      "fullName": "Maria Paula",
      "rsvp": "PENDING",
      "mealChoice": null,
      "notes": null
    }
  ]
}
```

Behavior:
- The backend always tries to ensure a primary invitee exists with `fullName == inviteName`.
- If `companions` already includes a person with the same name as `inviteName`, that row is treated as the primary one and a duplicate is not created.
- If `rsvp` is omitted or unrecognized, it is normalized to `PENDING`.

Response:
- Returns the created invite in the standard invite shape.

### 4) Update Invite

- `PUT /invites/{inviteId}`

Request body:
```json
{
  "inviteName": "Mario A. Martinez",
  "contact": {
    "email": "mario@example.com",
    "phone": "555-555-5555"
  },
  "notes": "Front family section"
}
```

Behavior:
- If `inviteName` changes, the backend tries to rename the primary invitee too.
- If no primary invitee exists yet, the backend creates one for the new invite name when needed.

Response:
- Returns the updated invite in the standard invite shape.

### 5) Delete Invite

- `DELETE /invites/{inviteId}`

Behavior:
- Deletes the invite for the selected plan.
- Returns `204 No Content`.

### 6) Add Invitee

- `POST /invites/{inviteId}/invitees`

Request body:
```json
{
  "fullName": "Maria Paula",
  "rsvp": "YES",
  "mealChoice": "Vegetarian",
  "notes": "Gluten free dessert"
}
```

Response:
- Returns the created invitee:

```json
{
  "id": "pers_2222",
  "inviteId": "inv_abcd1234",
  "fullName": "Maria Paula",
  "rsvp": "YES",
  "mealChoice": "Vegetarian",
  "notes": "Gluten free dessert"
}
```

### 7) Update Invitee

- `PUT /invitees/{inviteeId}`

Request body:
```json
{
  "fullName": "Maria Paula",
  "rsvp": "NO",
  "mealChoice": null,
  "notes": "Cannot travel"
}
```

Behavior:
- `fullName` is updated only when present and non-blank.
- `rsvp` is normalized.
- blank `mealChoice` and `notes` are stored as `null`.

Response:
- Returns the updated invitee.

### 8) Patch RSVP For One Invitee

- `PATCH /invitees/{inviteeId}/rsvp`

Request body:
```json
{ "rsvp": "YES" }
```

Response:
- Returns the updated invitee.

### 9) Patch RSVP For An Invite

- `PATCH /invites/{inviteId}/rsvp`

Request body:
```json
{ "rsvp": "YES", "includeCompanions": false }
```

Behavior:
- `includeCompanions=false`: updates only the primary invitee for that invite.
- `includeCompanions=true`: updates the primary invitee plus all companions in that invite.
- The primary invitee is resolved by exact name match with `inviteName`; if not found, the backend falls back to the first invitee row.

Accepted RSVP values:
- `YES`
- `NO`
- `MAYBE`
- `PENDING`
- shortcuts also accepted: `Y`, `N`, `M`

Normalization:
- invalid or blank values become `PENDING`

Examples:
```bash
curl -X PATCH "https://weddingplanerui.onrender.com/api/invites/inv_abcd1234/rsvp" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: <session-token>" \
  -H "X-Plan-Id: <plan-id>" \
  -d '{"rsvp":"YES","includeCompanions":false}'
```

```bash
curl -X PATCH "https://weddingplanerui.onrender.com/api/invites/inv_abcd1234/rsvp" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: <session-token>" \
  -H "X-Plan-Id: <plan-id>" \
  -d '{"rsvp":"NO","includeCompanions":true}'
```

Response:
- `includeCompanions=false`: returns a one-item list with the updated primary invitee.
- `includeCompanions=true`: returns all updated invitees for that invite, sorted by `fullName`.

Example response:
```json
[
  {
    "id": "pers_1111",
    "inviteId": "inv_abcd1234",
    "fullName": "Mario Martinez",
    "rsvp": "YES",
    "mealChoice": null,
    "notes": null
  }
]
```

### 10) Delete Invitee

- `DELETE /invitees/{inviteeId}`

Behavior:
- Deletes the invitee for the selected plan.
- Returns `204 No Content`.

## Public RSVP API

This is intended for an external RSVP-only frontend that does not have planner login credentials.

Required headers:
- `X-Public-Rsvp-Token: <shared-public-token>`
- `X-Plan-Id: <active-plan-id>`

Configuration:
- backend property: `app.public-rsvp.token`
- environment variable example: `PUBLIC_RSVP_TOKEN`

Important tradeoff:
- this is a shared token model, not per-guest authentication
- if the token is bundled into a public frontend, it should be treated as low-security access
- the public endpoints intentionally return a reduced response shape and do not expose invite contact info or notes

### Search Public RSVP Invites

- `GET /public/rsvp/invites/search?q=<text>`

Searches by:
- `inviteName`
- `companions[].fullName`

Response shape:
```json
[
  {
    "id": "inv_abcd1234",
    "inviteName": "Mario Martinez",
    "companions": [
      {
        "id": "pers_1111",
        "fullName": "Mario Martinez",
        "rsvp": "PENDING"
      },
      {
        "id": "pers_2222",
        "fullName": "Maria Paula",
        "rsvp": "YES"
      }
    ]
  }
]
```

Example:
```bash
curl "https://weddingplanerui.onrender.com/api/public/rsvp/invites/search?q=mario" \
  -H "X-Public-Rsvp-Token: <shared-public-token>" \
  -H "X-Plan-Id: <plan-id>"
```

### Patch Public RSVP For An Invite

- `PATCH /public/rsvp/invites/{inviteId}/rsvp`

Request body:
```json
{ "rsvp": "YES", "includeCompanions": true }
```

Response shape:
```json
[
  {
    "id": "pers_1111",
    "fullName": "Mario Martinez",
    "rsvp": "YES"
  },
  {
    "id": "pers_2222",
    "fullName": "Maria Paula",
    "rsvp": "YES"
  }
]
```

### Patch Public RSVP For One Invitee

- `PATCH /public/rsvp/invitees/{inviteeId}/rsvp`

Request body:
```json
{ "rsvp": "NO" }
```
