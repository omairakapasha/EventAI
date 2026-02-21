# Event-AI Platform

An intelligent event planning platform that connects users with vendors for seamless event management, powered by an Agentic AI Orchestrator. Built with modern technologies and best practices.

## 🏗️ Architecture

The platform follows a monorepo structure with the following components:

```
Event-AI/
├── packages/
│   ├── backend/                      # Fastify API server with Prisma & Supabase
│   ├── agentic_event_orchestrator/   # Python AI Agent (Chainlit + OpenAI Agents SDK + LiteLLM + Gemini)
│   ├── user/                         # Next.js User Portal (port 3003) with native AI chat
│   ├── admin/                        # Next.js Admin Portal
│   ├── frontend/                     # Next.js Vendor Portal
│   └── ui/                           # Shared UI components
├── package.json                      # Root package configuration
├── turbo.json                        # Turborepo configuration
└── docker-compose.yml                # Docker orchestration (optional)
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **Python** >= 3.12
- **uv** (Python package manager)

### 1. Root Setup

```bash
# Install all dependencies
pnpm install

# Start all services (from root)
pnpm run dev
```

### 2. Environment Configuration

**Backend (`packages/backend/.env`):**
```env
DATABASE_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
JWT_SECRET=your-jwt-secret
```

**User Portal (`packages/user/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXTAUTH_SECRET=dev-nextauth-secret
NEXTAUTH_URL=http://localhost:3003
GEMINI_API_KEY=your-gemini-api-key
```

**Agentic Orchestrator (`packages/agentic_event_orchestrator/.env`):**
```env
GEMINI_API_KEY=your-gemini-api-key
APP_DATABASE_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres
BACKEND_API_URL=http://localhost:3001/api/v1
```

### 3. Database Setup

Using **Supabase Cloud PostgreSQL**:
1. Create project at https://supabase.com
2. Get connection string from Settings > Database
3. Run migrations:
```bash
cd packages/backend
pnpm run db:migrate
```

### 4. Start Services

```bash
# Terminal 1 - All frontend + backend (from root)
pnpm run dev

# Terminal 2 - AI Agent Orchestrator
cd packages/agentic_event_orchestrator
uv run chainlit run app.py --port 8003
```

---

## 🪟 Windows Setup (No Docker)

If you are on Windows without Docker, follow these steps to run everything portably from inside the project directory.

### 1. Install Dependencies

```powershell
# Install Node.js dependencies from root
pnpm install
```

### 2. Portable PostgreSQL

Download the PostgreSQL 15 **zip binaries** (no installer needed):

```powershell
# Download and extract PostgreSQL 15 binaries
Invoke-WebRequest -Uri "https://get.enterprisedb.com/postgresql/postgresql-15.11-1-windows-x64-binaries.zip" -OutFile "$env:TEMP\pgsql.zip" -UseBasicParsing
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory("$env:TEMP\pgsql.zip", "$env:TEMP\pgsql_extract")
New-Item -ItemType Directory -Path ".local\pgsql" -Force
Copy-Item -Path "$env:TEMP\pgsql_extract\pgsql\*" -Destination ".local\pgsql\" -Recurse -Force

# Initialize database
.local\pgsql\bin\initdb.exe -D .local\pgsql\data -U postgres -E UTF8 --no-locale

# Start PostgreSQL
.local\pgsql\bin\pg_ctl.exe -D .local\pgsql\data -l .local\pgsql\pgsql.log start

# Create the database
.local\pgsql\bin\createdb.exe -U postgres event_ai
```

### 3. Portable Redis

```powershell
# Download and extract Redis
Invoke-WebRequest -Uri "https://github.com/tporadowski/redis/releases/download/v5.0.14.1/Redis-x64-5.0.14.1.zip" -OutFile "$env:TEMP\redis.zip" -UseBasicParsing
New-Item -ItemType Directory -Path ".local\redis" -Force
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory("$env:TEMP\redis.zip", ".local\redis")

# Start Redis (in a separate terminal)
.local\redis\redis-server.exe .local\redis\redis.windows.conf
```

### 4. Python Virtual Environment

```powershell
# Create venv with Python 3.12 (openai-agents requires 3.12+)
python -m venv venv

# Install AI orchestrator dependencies
venv\Scripts\pip.exe install pydantic python-dotenv requests chainlit ortools google-generativeai psycopg2-binary mcp fastapi uvicorn openai-agents
```

### 5. Backend Setup

```powershell
cd packages\backend
copy .env.example .env
# Edit .env and set CORS_ORIGIN to include all frontend ports:
# CORS_ORIGIN=http://localhost:3000,http://localhost:3002,http://localhost:3003,http://localhost:5173
pnpm run generate
pnpm run migrate:dev
pnpm run dev
```

### 6. Frontend Environment Files

Create `.env.local` for each frontend package:

**`packages\user\.env.local`:**
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXTAUTH_SECRET=dev-nextauth-secret
NEXTAUTH_URL=http://localhost:3003
```

**`packages\admin\.env.local`:**
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXTAUTH_SECRET=dev-nextauth-secret
NEXTAUTH_URL=http://localhost:3002
```

### 7. AI Orchestrator Environment

Create `packages\agentic_event_orchestrator\.env`:
```
GEMINI_API_KEY=your-gemini-api-key-here
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/event_ai
VENDOR_PORTAL_API_URL=http://localhost:3001/api/v1
```

### 8. Start All Services (Windows)

Open 5 separate terminals from the project root:

```powershell
# Terminal 1 - PostgreSQL (if not already running)
.local\pgsql\bin\pg_ctl.exe -D .local\pgsql\data -l .local\pgsql\pgsql.log start

# Terminal 2 - Redis
.local\redis\redis-server.exe .local\redis\redis.windows.conf

# Terminal 3 - Backend API (port 3001)
cd packages\backend; pnpm run dev

# Terminal 4 - AI Agent (port 8000)
cd packages\agentic_event_orchestrator; ..\..\venv\Scripts\python.exe server.py

# Terminal 5 - User Portal (port 3003)
cd packages\user; pnpm run dev

# Terminal 6 - Admin Portal (port 3002)
cd packages\admin; pnpm run dev
```

| Service | Port | Windows Command |
|---------|------|-----------------|
| PostgreSQL | 5432 | `.local\pgsql\bin\pg_ctl.exe -D .local\pgsql\data start` |
| Redis | 6379 | `.local\redis\redis-server.exe .local\redis\redis.windows.conf` |
| Backend API | 3001 | `cd packages\backend && pnpm run dev` |
| AI Agent | 8000 | `cd packages\agentic_event_orchestrator && ..\..\venv\Scripts\python.exe server.py` |
| User Portal | 3003 | `cd packages\user && pnpm run dev` |
| Admin Portal | 3002 | `cd packages\admin && pnpm run dev` |

**To stop PostgreSQL:** `.local\pgsql\bin\pg_ctl.exe -D .local\pgsql\data stop`

---

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
- **Features**: Event Dashboard, Native AI Chat (`/chat`), Vendor Marketplace, Notifications
- **AI Integration**: Direct Gemini API with fallback to agent service
- **Port**: 3003

### Admin Portal (`packages/admin`)
Next.js application for system administration.
- **Features**: User/Vendor Approval, System/Audit Logs
- **Port**: 3002

## 🌐 Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| User Portal | http://localhost:3003 | Event planning with native AI chat |
| Admin Portal | http://localhost:3002 | System administration |
| Vendor Portal | http://localhost:3000 | Vendor management |
| Backend API | http://localhost:3001/api/v1 | REST API |
| AI Agent | http://localhost:8003 | Chainlit agent interface |

## 📚 Documentation

- [Agentic Orchestrator Guide](docs/AGENTIC_EVENT_ORCHESTRATOR_IMPLEMENTATION_GUIDE.md)
- [Practical Implementation Guide](docs/PRACTICAL_IMPLEMENTATION_GUIDE_PAKISTAN.md)
- [Comparison Guide](docs/QUICK_COMPARISON_GUIDE.md)

## 🛠️ Troubleshooting

### Common Issues

**AI Agent not responding:**
- Check GEMINI_API_KEY is set in `.env`
- Verify agent service is running on port 8003
- Check LiteLLM model configuration

**Database connection errors:**
- Verify DATABASE_URL format (use direct connection for Supabase)
- Check Supabase dashboard for connection limits

**Hydration warnings:**
- Normal with browser extensions (Grammarly, etc.)
- `suppressHydrationWarning` is enabled in layout

**Async event loop errors:**
- Fixed with `nest_asyncio` in agent service
- All runner functions use `Runner.run_sync()`

**LiteLLM authentication errors:**
- Ensure GEMINI_API_KEY is set (not OPENAI_API_KEY for Gemini)
- Check model format: `gemini/gemini-2.0-flash`

### Port Conflicts
If ports are in use:
```bash
# Windows: Find and kill process
netstat -ano | findstr :3003
taskkill /PID <PID> /F
```

## 🚧 Development Status

### ✅ Implemented
- [x] Backend API with Fastify + Prisma
- [x] Supabase cloud database integration
- [x] Native AI chat in user portal
- [x] Multi-agent orchestration with Gemini
- [x] LiteLLM integration
- [x] nest_asyncio for async handling
- [x] Notification system
- [x] User/Admin/Vendor portals

### 🔄 In Progress
- [ ] Payment integration (Stripe/JazzCash/EasyPaisa)
- [ ] Email/SMS notifications
- [ ] File upload for event images
- [ ] Human-to-human messaging

### 📋 Planned
- [ ] Mobile app
- [ ] Real-time notifications via WebSocket
- [ ] Advanced analytics dashboard
- [ ] Multi-language support

## 🤝 Contributing

Fork, branch, commit, push, and open a PR.

---

**Event-AI Platform** - Intelligent Event Planning for Pakistan
