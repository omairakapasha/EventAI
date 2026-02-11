# Event-AI Platform

An intelligent event planning platform that connects users with vendors for seamless event management, powered by an Agentic AI Orchestrator. Built with modern technologies and best practices.

## 🏗️ Architecture

The platform follows a monorepo structure with the following components:

```
Event-AI/
├── packages/
│   ├── backend/                      # Fastify API server with Prisma & pgvector
│   ├── agentic_event_orchestrator/   # Python AI Agent (FastAPI + OpenAI Agent SDK)
│   ├── user/                         # Next.js User Portal
│   ├── admin/                        # Next.js Admin Portal
│   ├── frontend/                     # Next.js Vendor Portal
│   └── ui/                           # Shared UI components
├── docs/                             # Documentation & Guides
├── docker-compose.yml                # Docker orchestration (Postgres + pgvector, Redis)
├── package.json                      # Root package configuration
└── turbo.json                        # Turborepo configuration
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **Python** >= 3.12
- **uv** (Python package manager)
- **Docker & Docker Compose** (Recommended for Database & Redis)

### 1. Root Setup (Install all dependencies)

```bash
# Install all dependencies from root (uses pnpm workspaces)
pnpm install

# Start Database and Redis containers only
sudo docker compose up -d postgres redis
```

### 2. Backend Setup

```bash
cd packages/backend
# Copy environment file
cp .env.example .env
# Generate Prisma client
pnpm run generate
# Run migrations
pnpm run migrate:dev
# Start server (runs on port 3001)
pnpm run dev
```

### 3. AI Agent Setup

```bash
cd packages/agentic_event_orchestrator
# Install dependencies with uv
uv sync
# Start FastAPI server
uv run python server.py
# Or start Chainlit UI
uv run chainlit run app.py
```
*FastAPI runs on port 8000, Chainlit on port 8001*

### 4. Frontend Setup

**User Portal (Event Planners):**
```bash
cd packages/user
# Copy environment file
cp .env.example .env.local
pnpm install
pnpm run dev
```
*Runs on http://localhost:3000*

**Vendor Portal:**
```bash
cd packages/frontend
cp .env.example .env.local
pnpm install
pnpm run dev
```
*Runs on http://localhost:3003*

**Admin Portal:**
```bash
cd packages/admin
cp .env.example .env.local
pnpm install
pnpm run dev
```
*Runs on http://localhost:3002*

### 🚀 Quick Start (All Services)

Open 4 separate terminals and run:

```bash
# Terminal 1 - Backend
cd packages/backend && pnpm run dev

# Terminal 2 - AI Agent
cd packages/agentic_event_orchestrator && uv run python server.py

# Terminal 3 - User Portal
cd packages/user && pnpm run dev

# Terminal 4 - Admin Portal
cd packages/admin && pnpm run dev
```

## 📦 Packages Overview

### Backend (`packages/backend`)
Fastify-based REST/WebSocket API.
- **Features**: Auth (JWT/2FA), Vendor Management, Message Routing.
- **AI Integration**: Proxies requests to the Python Orchestrator via `/api/v1/ai`.

### AI Orchestrator (`packages/agentic_event_orchestrator`)
Python-based Agentic AI using **OpenAI Agent SDK** with agent handoffs and function tools.
- **Agents**: Triage, Vendor Discovery, Scheduler, Approval, Mail, Orchestrator
- **Tools**: Vendor search, Availability check, Schedule optimization, Budget calculation
- **Stack**: Python 3.12, `openai-agents`, `uv`, `fastapi`, `pydantic`, `pgvector`

### User Portal (`packages/user`)
Next.js application for end-users to plan events.
- **Features**: Event Dashboard, AI Chat (`/chat`), Vendor Marketplace.

### Admin Portal (`packages/admin`)
Next.js application for system administration.
- **Features**: User/Vendor Approval, System/Audit Logs.

## 📚 Documentation

- [Agentic Orchestrator Guide](docs/AGENTIC_EVENT_ORCHESTRATOR_IMPLEMENTATION_GUIDE.md)
- [Practical Implementation Guide](docs/PRACTICAL_IMPLEMENTATION_GUIDE_PAKISTAN.md)
- [Comparison Guide](docs/QUICK_COMPARISON_GUIDE.md)

## 🛠️ Troubleshooting

- **Database Error**: Ensure Docker containers are running: `sudo docker compose up -d`
- **Python Import Error**: Run with `uv` (e.g., `uv run python server.py`)
- **AI Connection Error**: Ensure Python server is running on port 8000

## 🤝 Contributing

Fork, branch, commit, push, and open a PR.

---

**Event-AI Platform**
