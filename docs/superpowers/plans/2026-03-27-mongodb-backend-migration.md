# MongoDB Backend Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace client-side localStorage with a MongoDB-backed Django API so all state (leads, chat history) is server-side and shared across visitors.

**Architecture:** PyMongo connects Django to a MongoDB instance (Docker). New REST endpoints for lead CRUD and message retrieval. The existing chat streaming endpoint is extended to persist messages. Frontend hooks switch from localStorage to fetch calls.

**Tech Stack:** Django 6.0.3, PyMongo 4.7+, MongoDB 7 (Docker), React 18, TypeScript, Vite

---

## File Structure

### Backend — New Files
| File | Responsibility |
|------|---------------|
| `chat/db.py` | MongoDB client singleton, `get_db()` accessor, index creation |
| `chat/views/leads.py` | Lead CRUD endpoints (list, create, get, update, delete) |
| `chat/views/messages.py` | Message retrieval endpoint for a lead |
| `chat/views/__init__.py` | Re-exports for URL wiring |
| `docker-compose.yml` | MongoDB + backend + frontend services |
| `Dockerfile` | Django app container |
| `client/Dockerfile` | Vite dev/build container |

### Backend — Modified Files
| File | Change |
|------|--------|
| `pyproject.toml` | Add `pymongo>=4.7` dependency |
| `AriaDemo/settings.py` | Add `MONGODB_URI` from env |
| `chat/urls.py` | Add lead and message URL routes |
| `chat/views.py` → `chat/views/chat.py` | Move existing chat view, add message persistence |
| `.env` | Add `MONGODB_URI` |

### Frontend — Modified Files
| File | Change |
|------|--------|
| `client/src/hooks/useLeads.ts` | Replace localStorage with API calls |
| `client/src/hooks/useAgent.ts` | Load/persist messages via API, accept `leadId` prop |
| `client/src/services/anthropic.ts` | Send `lead_id` in chat request |
| `client/src/App.tsx` | Wire lead creation flow through API before chat starts |

### Frontend — New Files
| File | Responsibility |
|------|---------------|
| `client/src/services/api.ts` | Typed fetch helpers for lead and message endpoints |

---

## Task 1: Docker Compose and MongoDB Setup

**Files:**
- Create: `docker-compose.yml`
- Create: `Dockerfile`
- Create: `client/Dockerfile`
- Modify: `.env`

- [ ] **Step 1: Create `docker-compose.yml`**

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
    volumes:
      - .:/app
    command: python manage.py runserver 0.0.0.0:8000

  frontend:
    build: ./client
    ports:
      - "5173:5173"
    depends_on:
      - backend
    volumes:
      - ./client:/app
      - /app/node_modules

volumes:
  mongo_data:
```

- [ ] **Step 2: Create `Dockerfile` (backend)**

```dockerfile
FROM python:3.14-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install .
COPY . .
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

- [ ] **Step 3: Create `client/Dockerfile`**

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

- [ ] **Step 4: Add `MONGODB_URI` to `.env`**

Append to the existing `.env` file:

```
MONGODB_URI=mongodb://mongo:27017/ariademo
```

Also add a comment with the local (non-Docker) URI for reference:

```
# For local dev without Docker: MONGODB_URI=mongodb://localhost:27017/ariademo
```

- [ ] **Step 5: Verify Docker Compose starts MongoDB**

Run: `docker compose up mongo -d`
Run: `docker compose exec mongo mongosh --eval "db.runCommand({ping:1})"`
Expected: `{ ok: 1 }`

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml Dockerfile client/Dockerfile
git commit -m "Add Docker Compose with MongoDB, backend, and frontend services"
```

---

## Task 2: PyMongo Dependency and MongoDB Connection Module

**Files:**
- Modify: `pyproject.toml`
- Modify: `AriaDemo/settings.py`
- Create: `chat/db.py`

- [ ] **Step 1: Add `pymongo` to `pyproject.toml`**

Change the dependencies list to:

```toml
dependencies = [
    "django>=6.0.3",
    "anthropic>=0.39.0",
    "python-dotenv>=1.1.0",
    "pymongo>=4.7",
]
```

- [ ] **Step 2: Install the dependency**

Run: `pip install pymongo>=4.7`
Expected: Successfully installed pymongo

- [ ] **Step 3: Add `MONGODB_URI` to `AriaDemo/settings.py`**

Add after the `load_dotenv` line (after line 20):

```python
import os

MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/ariademo")
```

- [ ] **Step 4: Create `chat/db.py`**

```python
from pymongo import MongoClient
from django.conf import settings

_client = None
_db = None


def get_db():
    global _client, _db
    if _db is None:
        _client = MongoClient(settings.MONGODB_URI)
        _db = _client.get_default_database()
        _db.messages.create_index("lead_id")
    return _db
```

- [ ] **Step 5: Verify connection works**

Run: `python manage.py shell -c "from chat.db import get_db; db = get_db(); print(db.name)"`
Expected: `ariademo`

(Requires MongoDB running locally or via Docker)

- [ ] **Step 6: Commit**

```bash
git add pyproject.toml AriaDemo/settings.py chat/db.py
git commit -m "Add PyMongo dependency and MongoDB connection module"
```

---

## Task 3: Restructure Views Into Package

**Files:**
- Move: `chat/views.py` → `chat/views/chat.py`
- Create: `chat/views/__init__.py`

- [ ] **Step 1: Create `chat/views/` directory**

Run: `mkdir -p chat/views`

- [ ] **Step 2: Move existing chat view**

Run: `mv chat/views.py chat/views/chat.py`

- [ ] **Step 3: Create `chat/views/__init__.py`**

```python
from .chat import chat_stream

__all__ = ["chat_stream"]
```

- [ ] **Step 4: Verify existing URL still works**

Run: `python manage.py check`
Expected: System check identified no issues.

- [ ] **Step 5: Commit**

```bash
git add chat/views/ chat/views.py
git commit -m "Restructure chat views into package for extensibility"
```

Note: `git add chat/views.py` will stage the deletion of the old file.

---

## Task 4: Lead CRUD API Endpoints

**Files:**
- Create: `chat/views/leads.py`
- Modify: `chat/views/__init__.py`
- Modify: `chat/urls.py`

- [ ] **Step 1: Create `chat/views/leads.py`**

```python
import json
from datetime import datetime, timezone

from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from chat.db import get_db

VALID_STATUSES = {"active", "qualified", "unqualified", "handed_off", "closed"}
VALID_BUDGET_SIGNALS = {"low", "medium", "high"}


def _serialize_lead(doc):
    doc["id"] = str(doc.pop("_id"))
    doc["created_at"] = doc["created_at"].isoformat()
    return doc


@csrf_exempt
@require_http_methods(["GET", "POST"])
def lead_list(request):
    db = get_db()

    if request.method == "GET":
        leads = list(db.leads.find().sort("created_at", -1))
        return JsonResponse([_serialize_lead(l) for l in leads], safe=False)

    # POST — create a new lead
    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    lead = {
        "name": body.get("name"),
        "project_type": body.get("project_type", ""),
        "timeline": body.get("timeline", ""),
        "budget_signal": body.get("budget_signal", "low"),
        "decision_authority": body.get("decision_authority", ""),
        "intent_score": body.get("intent_score", 0),
        "conversation_summary": body.get("conversation_summary", "Chat in progress…"),
        "hot_signals": body.get("hot_signals", []),
        "status": body.get("status", "active"),
        "created_at": datetime.now(timezone.utc),
    }

    if lead["status"] not in VALID_STATUSES:
        return JsonResponse({"error": f"Invalid status: {lead['status']}"}, status=400)
    if lead["budget_signal"] not in VALID_BUDGET_SIGNALS:
        return JsonResponse({"error": f"Invalid budget_signal: {lead['budget_signal']}"}, status=400)

    result = db.leads.insert_one(lead)
    lead["_id"] = result.inserted_id
    return JsonResponse(_serialize_lead(lead), status=201)


@csrf_exempt
@require_http_methods(["GET", "PATCH", "DELETE"])
def lead_detail(request, lead_id):
    db = get_db()

    try:
        oid = ObjectId(lead_id)
    except Exception:
        return JsonResponse({"error": "Invalid lead ID"}, status=400)

    if request.method == "GET":
        lead = db.leads.find_one({"_id": oid})
        if not lead:
            return JsonResponse({"error": "Lead not found"}, status=404)
        return JsonResponse(_serialize_lead(lead))

    if request.method == "DELETE":
        result = db.leads.delete_one({"_id": oid})
        if result.deleted_count == 0:
            return JsonResponse({"error": "Lead not found"}, status=404)
        return JsonResponse({"deleted": True})

    # PATCH
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    if "status" in body and body["status"] not in VALID_STATUSES:
        return JsonResponse({"error": f"Invalid status: {body['status']}"}, status=400)
    if "budget_signal" in body and body["budget_signal"] not in VALID_BUDGET_SIGNALS:
        return JsonResponse({"error": f"Invalid budget_signal: {body['budget_signal']}"}, status=400)

    # Only allow updating known fields
    allowed = {
        "name", "project_type", "timeline", "budget_signal",
        "decision_authority", "intent_score", "conversation_summary",
        "hot_signals", "status",
    }
    updates = {k: v for k, v in body.items() if k in allowed}

    if not updates:
        return JsonResponse({"error": "No valid fields to update"}, status=400)

    db.leads.update_one({"_id": oid}, {"$set": updates})
    lead = db.leads.find_one({"_id": oid})
    if not lead:
        return JsonResponse({"error": "Lead not found"}, status=404)
    return JsonResponse(_serialize_lead(lead))
```

- [ ] **Step 2: Update `chat/views/__init__.py`**

```python
from .chat import chat_stream
from .leads import lead_list, lead_detail

__all__ = ["chat_stream", "lead_list", "lead_detail"]
```

- [ ] **Step 3: Update `chat/urls.py`**

```python
from django.urls import path

from . import views

urlpatterns = [
    path("chat/", views.chat_stream, name="chat_stream"),
    path("leads/", views.lead_list, name="lead_list"),
    path("leads/<str:lead_id>/", views.lead_detail, name="lead_detail"),
]
```

- [ ] **Step 4: Verify URL routing**

Run: `python manage.py check`
Expected: System check identified no issues.

- [ ] **Step 5: Manual smoke test — create and list a lead**

Run:
```bash
curl -s -X POST http://localhost:8000/api/leads/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Lead", "project_type": "EP", "status": "active"}' | python -m json.tool
```
Expected: JSON response with `id`, `name`, `created_at` fields.

Run:
```bash
curl -s http://localhost:8000/api/leads/ | python -m json.tool
```
Expected: Array containing the lead just created.

- [ ] **Step 6: Commit**

```bash
git add chat/views/leads.py chat/views/__init__.py chat/urls.py
git commit -m "Add lead CRUD API endpoints backed by MongoDB"
```

---

## Task 5: Message Retrieval Endpoint

**Files:**
- Create: `chat/views/messages.py`
- Modify: `chat/views/__init__.py`
- Modify: `chat/urls.py`

- [ ] **Step 1: Create `chat/views/messages.py`**

```python
from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from chat.db import get_db


def _serialize_message(doc):
    doc["id"] = str(doc.pop("_id"))
    doc["lead_id"] = str(doc["lead_id"])
    doc["created_at"] = doc["created_at"].isoformat()
    return doc


@require_GET
def message_list(request, lead_id):
    db = get_db()

    try:
        oid = ObjectId(lead_id)
    except Exception:
        return JsonResponse({"error": "Invalid lead ID"}, status=400)

    messages = list(
        db.messages.find({"lead_id": oid}).sort("created_at", 1)
    )
    return JsonResponse([_serialize_message(m) for m in messages], safe=False)
```

- [ ] **Step 2: Update `chat/views/__init__.py`**

```python
from .chat import chat_stream
from .leads import lead_list, lead_detail
from .messages import message_list

__all__ = ["chat_stream", "lead_list", "lead_detail", "message_list"]
```

- [ ] **Step 3: Update `chat/urls.py`**

```python
from django.urls import path

from . import views

urlpatterns = [
    path("chat/", views.chat_stream, name="chat_stream"),
    path("leads/", views.lead_list, name="lead_list"),
    path("leads/<str:lead_id>/", views.lead_detail, name="lead_detail"),
    path("leads/<str:lead_id>/messages/", views.message_list, name="message_list"),
]
```

- [ ] **Step 4: Commit**

```bash
git add chat/views/messages.py chat/views/__init__.py chat/urls.py
git commit -m "Add message retrieval endpoint for lead chat history"
```

---

## Task 6: Persist Messages in Chat Streaming Endpoint

**Files:**
- Modify: `chat/views/chat.py`

- [ ] **Step 1: Update `chat/views/chat.py` to persist messages**

Replace the full contents of `chat/views/chat.py` with:

```python
import json
import os
from datetime import datetime, timezone

from bson import ObjectId
import anthropic
from django.http import StreamingHttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from chat.db import get_db
from chat.system_prompt import SYSTEM_PROMPT


@csrf_exempt
@require_POST
def chat_stream(request):
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    messages = body.get("messages", [])
    lead_id = body.get("lead_id")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return JsonResponse({"error": "API key not configured"}, status=500)

    db = get_db()
    lead_oid = None

    if lead_id:
        try:
            lead_oid = ObjectId(lead_id)
        except Exception:
            pass

    # Persist the latest user message
    if lead_oid and messages:
        last_msg = messages[-1]
        if last_msg.get("role") == "user":
            db.messages.insert_one({
                "lead_id": lead_oid,
                "role": "user",
                "content": last_msg["content"],
                "created_at": datetime.now(timezone.utc),
            })

    def event_stream():
        client = anthropic.Anthropic(api_key=api_key)

        api_messages = [
            {"role": m["role"], "content": m["content"]}
            for m in messages
        ]
        if not api_messages:
            api_messages = [{"role": "user", "content": "[New visitor has connected to chat]"}]

        full_response = []

        with client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            system=SYSTEM_PROMPT,
            messages=api_messages,
        ) as stream:
            for text in stream.text_stream:
                full_response.append(text)
                yield text

        # Persist the full assistant response after streaming completes
        if lead_oid:
            db.messages.insert_one({
                "lead_id": lead_oid,
                "role": "assistant",
                "content": "".join(full_response),
                "created_at": datetime.now(timezone.utc),
            })

    response = StreamingHttpResponse(
        event_stream(),
        content_type="text/plain",
    )
    response["Cache-Control"] = "no-cache"
    return response
```

- [ ] **Step 2: Verify the chat endpoint still streams correctly**

Run the Django server and test with curl:
```bash
curl -N -X POST http://localhost:8000/api/chat/ \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hi"}]}'
```
Expected: Streamed text response from Claude.

- [ ] **Step 3: Commit**

```bash
git add chat/views/chat.py
git commit -m "Persist user and assistant messages to MongoDB during chat streaming"
```

---

## Task 7: Frontend API Service Layer

**Files:**
- Create: `client/src/services/api.ts`

- [ ] **Step 1: Create `client/src/services/api.ts`**

```typescript
import { Lead, Message } from "../types";

const BASE = "/api";

interface LeadResponse {
  id: string;
  name: string | null;
  project_type: string;
  timeline: string;
  budget_signal: "low" | "medium" | "high";
  decision_authority: string;
  intent_score: number;
  conversation_summary: string;
  hot_signals: string[];
  status: Lead["status"];
  created_at: string;
}

function toLead(r: LeadResponse): Lead {
  return {
    id: r.id,
    name: r.name,
    project_type: r.project_type,
    timeline: r.timeline,
    budget_signal: r.budget_signal,
    decision_authority: r.decision_authority,
    intent_score: r.intent_score,
    conversation_summary: r.conversation_summary,
    hot_signals: r.hot_signals,
    status: r.status,
    createdAt: new Date(r.created_at),
  };
}

interface MessageResponse {
  id: string;
  lead_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

function toMessage(r: MessageResponse): Message {
  return {
    id: r.id,
    role: r.role,
    content: r.content,
    createdAt: new Date(r.created_at),
  };
}

export async function fetchLeads(): Promise<Lead[]> {
  const res = await fetch(`${BASE}/leads/`);
  const data: LeadResponse[] = await res.json();
  return data.map(toLead);
}

export async function createLead(fields?: Partial<Lead>): Promise<Lead> {
  const res = await fetch(`${BASE}/leads/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields ?? {}),
  });
  const data: LeadResponse = await res.json();
  return toLead(data);
}

export async function updateLead(
  id: string,
  fields: Partial<Lead>
): Promise<Lead> {
  const res = await fetch(`${BASE}/leads/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  const data: LeadResponse = await res.json();
  return toLead(data);
}

export async function deleteLead(id: string): Promise<void> {
  await fetch(`${BASE}/leads/${id}/`, { method: "DELETE" });
}

export async function fetchMessages(leadId: string): Promise<Message[]> {
  const res = await fetch(`${BASE}/leads/${leadId}/messages/`);
  const data: MessageResponse[] = await res.json();
  return data.map(toMessage);
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/services/api.ts
git commit -m "Add typed API service layer for leads and messages"
```

---

## Task 8: Replace `useLeads` Hook with API-Backed Version

**Files:**
- Modify: `client/src/hooks/useLeads.ts`

- [ ] **Step 1: Rewrite `client/src/hooks/useLeads.ts`**

Replace the full contents with:

```typescript
import { useState, useCallback, useEffect } from "react";
import { Lead, LeadStatus } from "../types";
import * as api from "../services/api";

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    api.fetchLeads().then(setLeads).catch(console.error);
  }, []);

  const startChat = useCallback(async (): Promise<string> => {
    const lead = await api.createLead();
    setLeads((prev) => [lead, ...prev]);
    return lead.id;
  }, []);

  const updateLead = useCallback(
    async (id: string, fields: Partial<Lead>) => {
      const updated = await api.updateLead(id, fields);
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
    },
    []
  );

  const promoteToHandoff = useCallback(
    async (
      activeChatId: string,
      lead: Omit<Lead, "id" | "status" | "createdAt">
    ) => {
      const updated = await api.updateLead(activeChatId, {
        ...lead,
        status: "handed_off" as LeadStatus,
      });
      setLeads((prev) =>
        prev.map((l) => (l.id === activeChatId ? updated : l))
      );
    },
    []
  );

  const moveLead = useCallback(async (id: string, status: LeadStatus) => {
    const updated = await api.updateLead(id, { status });
    setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
  }, []);

  return { leads, startChat, updateLead, promoteToHandoff, moveLead };
}
```

- [ ] **Step 2: Verify no localStorage references remain**

Run: `grep -r "localStorage" client/src/`
Expected: No matches.

Run: `grep -r "SEED_LEADS" client/src/`
Expected: No matches.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useLeads.ts
git commit -m "Replace localStorage useLeads hook with MongoDB API-backed version"
```

---

## Task 9: Update `useAgent` to Accept `leadId` and Load History

**Files:**
- Modify: `client/src/hooks/useAgent.ts`
- Modify: `client/src/services/anthropic.ts`

- [ ] **Step 1: Update `client/src/services/anthropic.ts` to send `lead_id`**

Replace the full contents with:

```typescript
import { Message, ScoreUpdate, Lead } from "../types";

export async function streamMessage(
  messages: Message[],
  onChunk: (text: string) => void,
  onScoreUpdate: (update: ScoreUpdate) => void,
  onHandoff: (lead: Lead) => void,
  leadId?: string | null
): Promise<void> {
  try {
    const response = await fetch("/api/chat/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        lead_id: leadId ?? undefined,
      }),
    });

    if (!response.ok) {
      onChunk("Sorry, something went wrong. Please try again.");
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onChunk("Sorry, streaming is not supported.");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      emitSafe(buffer, onChunk, onScoreUpdate, onHandoff, false);
    }

    // Final pass — flush everything
    emitSafe(buffer, onChunk, onScoreUpdate, onHandoff, true);
  } catch (error) {
    console.error("Stream error:", error);
    onChunk("Connection error. Please check your network and try again.");
  }
}

function emitSafe(
  buffer: string,
  onChunk: (text: string) => void,
  onScoreUpdate: (update: ScoreUpdate) => void,
  onHandoff: (lead: Lead) => void,
  isFinal: boolean
) {
  // 1. Extract and fire complete score_update tags
  const scoreRegex = /<score_update>([\s\S]*?)<\/score_update>/g;
  let match: RegExpExecArray | null;
  while ((match = scoreRegex.exec(buffer)) !== null) {
    try {
      const update: ScoreUpdate = JSON.parse(match[1]);
      onScoreUpdate(update);
    } catch {
      // ignore malformed
    }
  }

  // 2. Strip complete score_update tags
  let display = buffer.replace(/<score_update>[\s\S]*?<\/score_update>/g, "");

  // 3. Check for handoff JSON
  const handoffRegex =
    /\{"event"\s*:\s*"handoff_triggered"\s*,\s*"lead"\s*:\s*\{[\s\S]*?\}\s*\}/;
  const handoffMatch = display.match(handoffRegex);

  if (handoffMatch) {
    try {
      const handoffData = JSON.parse(handoffMatch[0]);
      const textBefore = display
        .substring(0, display.indexOf(handoffMatch[0]))
        .trim();
      if (textBefore) onChunk(textBefore);
      onHandoff(handoffData.lead);
      return;
    } catch {
      // incomplete handoff JSON — hold it back below
    }
  }

  // 4. Hold back anything that looks like the start of metadata
  if (!isFinal) {
    const anyTag = display.indexOf("<");
    if (anyTag !== -1) {
      display = display.substring(0, anyTag);
    }

    const handoffStart = display.search(/\{\s*"event"/);
    if (handoffStart !== -1) {
      display = display.substring(0, handoffStart);
    }
  }

  if (display.trim()) {
    onChunk(display.trim());
  }
}
```

The only change from the original is adding the optional `leadId` parameter and passing `lead_id` in the request body.

- [ ] **Step 2: Update `client/src/hooks/useAgent.ts` to accept `leadId` and load history**

Replace the full contents with:

```typescript
import { useState, useCallback, useEffect, useRef } from "react";
import { Message, Lead, IntentPhase, ScoreUpdate } from "../types";
import { streamMessage } from "../services/anthropic";
import * as api from "../services/api";

interface AgentCallbacks {
  onChatStart?: () => void;
  onScoreUpdate?: (update: ScoreUpdate) => void;
  onHandoff?: (lead: Lead) => void;
}

export function useAgent(
  leadId: string | null,
  callbacks?: AgentCallbacks
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [intentScore, setIntentScore] = useState(0);
  const [phase, setPhase] = useState<IntentPhase>("open");
  const [handoffLead, setHandoffLead] = useState<Lead | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const initRan = useRef(false);

  // Load existing messages when leadId changes
  useEffect(() => {
    if (!leadId) return;
    api.fetchMessages(leadId).then((msgs) => {
      if (msgs.length > 0) {
        setMessages(msgs);
        setChatStarted(true);
        initRan.current = true;
      }
    });
  }, [leadId]);

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;

    const greeting: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      createdAt: new Date(),
    };
    setMessages([greeting]);
    setIsStreaming(true);

    const onChunk = (text: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === greeting.id ? { ...m, content: text } : m
        )
      );
    };

    const onScoreUpdate = (update: ScoreUpdate) => {
      setIntentScore(update.score);
      setPhase(update.phase);
      callbacks?.onScoreUpdate?.(update);
    };

    streamMessage([], onChunk, onScoreUpdate, () => {}, leadId).then(() => {
      setIsStreaming(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(
    async (content: string) => {
      if (isStreaming || phase === "handoff") return;

      if (!chatStarted) {
        setChatStarted(true);
        callbacks?.onChatStart?.();
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        createdAt: new Date(),
      };

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        createdAt: new Date(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages([...updatedMessages, assistantMessage]);
      setIsStreaming(true);

      const onChunk = (text: string) => {
        assistantMessage.content = text;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, content: text }
              : m
          )
        );
      };

      const onScoreUpdate = (update: ScoreUpdate) => {
        setIntentScore(update.score);
        setPhase(update.phase);
        callbacks?.onScoreUpdate?.(update);
      };

      const onHandoff = (lead: Lead) => {
        setHandoffLead(lead);
        setPhase("handoff");
        callbacks?.onHandoff?.(lead);
      };

      await streamMessage(updatedMessages, onChunk, onScoreUpdate, onHandoff, leadId);
      setIsStreaming(false);
    },
    [messages, isStreaming, phase, leadId]
  );

  return { messages, intentScore, phase, handoffLead, isStreaming, sendMessage };
}
```

Key changes:
- Added `leadId` as the first parameter
- Added `useEffect` to load existing messages when `leadId` is provided
- Pass `leadId` through to `streamMessage` calls

- [ ] **Step 3: Commit**

```bash
git add client/src/services/anthropic.ts client/src/hooks/useAgent.ts
git commit -m "Pass lead_id through chat flow and load message history from API"
```

---

## Task 10: Update `App.tsx` to Wire Async Lead Creation

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Update `client/src/App.tsx`**

Replace the full contents with:

```tsx
import { useState, useCallback, useRef } from "react";
import { useAgent } from "./hooks/useAgent";
import { useLeads } from "./hooks/useLeads";
import { ChatPanel } from "./components/ChatPanel";
import { IntentPanel } from "./components/IntentPanel";
import { PipelineView } from "./components/PipelineView";

type Tab = "chat" | "pipeline";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const { leads, startChat, updateLead, promoteToHandoff, moveLead } = useLeads();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const onChatStart = useCallback(async () => {
    const id = await startChat();
    setActiveChatId(id);
  }, [startChat]);

  const qualifiedRef = useRef(false);

  const onScoreUpdate = useCallback(
    (update: { score: number; phase?: string; name?: string | null; project_type?: string; timeline?: string; budget_signal?: "low" | "medium" | "high" }) => {
      if (activeChatId) {
        const fields: Record<string, unknown> = { intent_score: update.score };
        if (update.name !== undefined) fields.name = update.name;
        if (update.project_type) fields.project_type = update.project_type;
        if (update.timeline) fields.timeline = update.timeline;
        if (update.budget_signal) fields.budget_signal = update.budget_signal;

        if (update.phase === "disqualified") {
          fields.status = "unqualified";
          qualifiedRef.current = false;
        } else if (
          !qualifiedRef.current &&
          update.score >= 40 &&
          update.phase &&
          update.phase !== "open"
        ) {
          qualifiedRef.current = true;
          fields.status = "qualified";
        }

        updateLead(activeChatId, fields);
      }
    },
    [updateLead, activeChatId]
  );

  const onHandoff = useCallback(
    (lead: Parameters<typeof promoteToHandoff>[1]) => {
      if (activeChatId) {
        promoteToHandoff(activeChatId, lead);
        setActiveChatId(null);
      }
    },
    [promoteToHandoff, activeChatId]
  );

  const { messages, intentScore, phase, handoffLead, isStreaming, sendMessage } =
    useAgent(activeChatId, { onChatStart, onScoreUpdate, onHandoff });

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Top Bar */}
      <header className="flex items-center px-6 py-3 border-b border-zinc-800">
        <span className="text-sm font-semibold tracking-widest text-zinc-400">
          ARIA
        </span>
        <nav className="flex gap-6 ml-8">
          <button
            onClick={() => setActiveTab("chat")}
            className={`text-sm pb-0.5 border-b transition-colors ${
              activeTab === "chat"
                ? "text-white border-white"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`text-sm pb-0.5 border-b transition-colors ${
              activeTab === "pipeline"
                ? "text-white border-white"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            Pipeline
          </button>
        </nav>
        <span className="ml-auto text-sm text-zinc-500">Sales Agent</span>
      </header>

      {/* Main Content */}
      {activeTab === "chat" ? (
        <main className="flex flex-1 overflow-hidden">
          <div className="flex-1 border-r border-zinc-800">
            <ChatPanel
              messages={messages}
              isStreaming={isStreaming}
              phase={phase}
              sendMessage={sendMessage}
            />
          </div>
          <IntentPanel
            intentScore={intentScore}
            phase={phase}
            handoffLead={handoffLead}
          />
        </main>
      ) : (
        <PipelineView leads={leads} onMove={moveLead} />
      )}
    </div>
  );
}
```

Key changes:
- `activeChatId` is now `useState` instead of `useRef` (needs to trigger re-render for `useAgent`)
- `onChatStart` is now async, calls `await startChat()` (which hits the API)
- `activeChatId` is passed to `useAgent` as the first argument
- Added `activeChatId` to dependency arrays of `onScoreUpdate` and `onHandoff`

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd client && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/App.tsx
git commit -m "Wire App.tsx to async lead creation and pass leadId to useAgent"
```

---

## Task 11: Update Vite Proxy for New API Routes

**Files:**
- Modify: `client/vite.config.ts` (if proxy exists) or verify existing config handles `/api/*`

- [ ] **Step 1: Check current Vite config**

Read `client/vite.config.ts` to see if a proxy is already configured for `/api`.

- [ ] **Step 2: Ensure proxy covers all `/api/*` routes**

The proxy should forward all `/api/*` requests to `http://localhost:8000`. If it already does this with a prefix match, no changes needed. If it only proxies `/api/chat/`, update to proxy all of `/api/`.

Example config if needed:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 3: Commit (if changes were made)**

```bash
git add client/vite.config.ts
git commit -m "Ensure Vite proxy forwards all /api routes to Django backend"
```

---

## Task 12: End-to-End Verification

- [ ] **Step 1: Start MongoDB**

Run: `docker compose up mongo -d`

- [ ] **Step 2: Start Django backend**

Run: `MONGODB_URI=mongodb://localhost:27017/ariademo python manage.py runserver`

- [ ] **Step 3: Start Vite frontend**

Run: `cd client && npm run dev`

- [ ] **Step 4: Verify lead creation via chat**

1. Open `http://localhost:5173` in browser
2. The greeting message should stream in
3. Send a message — this should trigger `onChatStart`, creating a lead via API
4. Check the Pipeline tab — the new lead should appear in the "Active" column

- [ ] **Step 5: Verify message persistence**

1. Note the lead ID from the network tab (POST to `/api/leads/`)
2. Run: `curl -s http://localhost:8000/api/leads/<LEAD_ID>/messages/ | python -m json.tool`
3. Expected: Array containing the user message and assistant response

- [ ] **Step 6: Verify lead updates**

1. Continue the conversation until the intent score changes
2. Check Pipeline tab — lead fields should update
3. Run: `curl -s http://localhost:8000/api/leads/ | python -m json.tool`
4. Expected: Lead with updated `intent_score`, `name`, etc.

- [ ] **Step 7: Verify no localStorage usage remains**

Open browser DevTools > Application > Local Storage. The `aria-demo-leads` key should not exist.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "Complete MongoDB backend migration: leads and chat history persisted server-side"
```
