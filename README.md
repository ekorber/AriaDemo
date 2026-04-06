# Aria

An AI-powered sales and marketing platform. Aria qualifies leads through natural conversation, manages your pipeline, and generates multi-platform social content — all from one interface.

A demo by **Eric Korber** for **MetaEngines**.

## Features

- **Conversational Lead Qualification** — An AI sales agent chats with prospects, scores intent in real time across four dimensions (project clarity, timeline, budget signals, decision authority), and hands off qualified leads automatically.
- **Industry Archetypes** — Pre-built business personas (music studio, dental practice, real estate agency, SaaS company) with tailored conversation flows, scoring rubrics, and handoff scripts.
- **Lead Pipeline** — A drag-and-drop Kanban board tracks leads from first contact through qualification to handoff and close.
- **Social Content Engine** — Generate AI-written posts for Instagram, X, Facebook, Threads, and LinkedIn with AI image generation, scheduling, and an approval workflow.

## Architecture

| Layer | Stack |
|-------|-------|
| Frontend | React + TypeScript (Vite), Tailwind CSS |
| Backend | Django, streaming SSE for real-time chat |
| Database | MongoDB |
| AI | Claude API (sales agent + content generation), OpenAI DALL-E (image generation) |
| Infra | Docker Compose |

## Getting Started

### Prerequisites

- Python 3.14+
- Node.js 18+
- MongoDB (or use Docker Compose)
- API keys: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`

### Environment

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
```

### Run with Docker Compose

```bash
docker compose up --build
```

This starts MongoDB and the backend (which serves the built frontend) on port 8000.

### Run Locally

**Backend:**

```bash
uv sync
uv run python manage.py runserver
```

**Frontend (dev):**

```bash
cd client
npm install
npm run dev
```

## License

All rights reserved.
