# Invites External API (Search + RSVP Patch)

Base URL (production example):
- `https://weddingplanerui.onrender.com/api`

## 1) Search Invites by Name

Searches by:
- main invite name (`inviteName`)
- companion name (`companions[].fullName`)

Matching rules:
- case-insensitive (ignored)
- partial match (`contains`)

Endpoint:
- `GET /invites/search?q=<text>`

Example:
```bash
curl "https://weddingplanerui.onrender.com/api/invites/search?q=mar"
```

Response (same shape as `/invites`):
```json
[
  {
    "id": "inv_abcd1234",
    "inviteName": "Mario Martinez",
    "contact": { "email": "mario@example.com", "phone": null },
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

## 2) Patch RSVP for One Invite (primary only) OR Invite + Companions

Endpoint:
- `PATCH /invites/{inviteId}/rsvp`

Request body:
```json
{ "rsvp": "YES", "includeCompanions": false }
```

Behavior:
- `includeCompanions=false`: updates only the main invitee (primary person).
- `includeCompanions=true`: updates the main invitee + all companions in that invite.

Accepted RSVP values:
- `YES`, `NO`, `MAYBE`, `PENDING`
- also accepted shortcuts: `Y`, `N`, `M`

Examples:
```bash
curl -X PATCH "https://weddingplanerui.onrender.com/api/invites/inv_abcd1234/rsvp" \
  -H "Content-Type: application/json" \
  -d '{"rsvp":"YES","includeCompanions":false}'
```

```bash
curl -X PATCH "https://weddingplanerui.onrender.com/api/invites/inv_abcd1234/rsvp" \
  -H "Content-Type: application/json" \
  -d '{"rsvp":"NO","includeCompanions":true}'
```

Response:
- Returns the updated invitees as a list.

```json
[
  {
    "id": "pers_2222",
    "inviteId": "inv_abcd1234",
    "fullName": "Mario Martinez",
    "rsvp": "YES",
    "mealChoice": null,
    "notes": null
  }
]
```

Optional endpoint (still available for person-level patch):
- `PATCH /invitees/{inviteeId}/rsvp`
- body: `{ "rsvp": "YES" }`
