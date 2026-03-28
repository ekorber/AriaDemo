# MongoDB Backend Migration Design

## Overview

Migrate AriaDemo from client-side localStorage to a MongoDB-backed Django API. All state (leads, chat history) moves server-side. Shared state across all visitors, no authentication. Docker Compose for local dev and single-instance cloud deployment.

## Data Model

### `leads` collection

```json
{
  "_id": "ObjectId (auto)",
  "name": "string | null",
  "project_type": "string",
  "timeline": "string",
  "budget_signal": "low | medium | high",
  "decision_authority": "string",
  "intent_score": 0,
  "conversation_summary": "string",
  "hot_signals": ["string"],
  "status": "active | qualified | unqualified | handed_off | closed",
  "created_at": "datetime"
}
```

### `messages` collection

```json
{
  "_id": "ObjectId",
  "lead_id": "ObjectId (ref to leads)",
  "role": "user | assistant",
  "content": "string",
  "created_at": "datetime"
}
```

Index on `messages.lead_id` for efficient chat history retrieval.

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/leads/` | List all leads |
| POST | `/api/leads/` | Create a lead |
| GET | `/api/leads/<id>/` | Get single lead |
| PATCH | `/api/leads/<id>/` | Update lead fields |
| DELETE | `/api/leads/<id>/` | Delete a lead |
| GET | `/api/leads/<id>/messages/` | Get chat history for a lead |
| POST | `/api/chat/` | Stream chat (existing, modified to persist messages) |

### Request/Response Details

**POST /api/leads/**: Body contains lead fields (all optional except none — server generates `_id` and `created_at`). Returns the created lead with `id` as a string.

**PATCH /api/leads/<id>/**: Body contains only the fields to update. Returns the updated lead.

**GET /api/leads/<id>/messages/**: Returns messages ordered by `created_at` ascending.

**POST /api/chat/**: Existing streaming endpoint. Modified to:
1. Persist the user message to `messages` collection before streaming
2. Accumulate the streamed assistant response
3. Persist the full assistant message to `messages` collection after streaming completes
4. Continue to parse `<score_update>` tags and update the lead document in MongoDB

All endpoints return JSON. Lead `_id` is serialized as string `id` in responses.

## Backend Changes

### New: `db.py` — MongoDB connection module

- Initializes a PyMongo `MongoClient` from `MONGODB_URI` environment variable
- Exposes `get_db()` function returning the database instance
- Creates index on `messages.lead_id` on first access

### New: `views/leads.py` — Lead CRUD views

- Standard Django views (function-based) for the 5 lead endpoints
- Handles ObjectId serialization/deserialization
- Validates `budget_signal` and `status` enum values

### Modified: `views/chat.py` (existing chat endpoint)

- Persist user message before streaming
- Accumulate assistant response chunks
- Persist assistant message after stream completes
- Update lead document when `<score_update>` tags are parsed

### New: `management/commands/seed_leads.py`

- Management command `python manage.py seed_leads`
- Currently empty (no seed data) but provides the hook for future seeding

### Dependencies

- Add `pymongo>=4.7` to `pyproject.toml`

## Frontend Changes

### Modified: `useLeads.ts`

- Remove all localStorage logic (`getItem`, `setItem`, `STORAGE_KEY`)
- Remove seed data constants
- Replace with API calls:
  - `GET /api/leads/` on mount
  - `POST /api/leads/` for creation
  - `PATCH /api/leads/<id>/` for updates
  - `DELETE /api/leads/<id>/` for deletion

### Modified: Chat component(s)

- Load chat history from `GET /api/leads/<id>/messages/` when opening a conversation
- Messages are persisted by the backend during streaming, no frontend save needed

### Removed

- Seed data constants from `useLeads.ts`
- All localStorage references

## Docker Compose

```yaml
services:
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  backend:
    build: .
    ports:
      - "8000:8000"
    depends_on:
      - mongo
    env_file: .env

  frontend:
    build: ./client
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  mongo_data:
```

### Environment Variables (`.env`)

```
MONGODB_URI=mongodb://mongo:27017/ariademo
ANTHROPIC_API_KEY=<key>
```

## Deployment

Docker Compose runs identically on a single cloud instance. For deployment:
- Push the repo to the instance
- `docker compose up -d`
- Update `MONGODB_URI` if using a managed MongoDB service

No changes to the Compose file needed for single-instance deployment.

## Out of Scope

- Authentication / user sessions
- Seed data
- MongoDB replica sets or sharding
- Database migrations tooling (schemaless)
