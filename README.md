# Vendor Management System

A comprehensive B2B2C marketplace module for the Agentic Event Orchestrator, enabling vendors to register, manage profiles, submit pricing, and participate in event planning.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Python 3.10+ (for Agentic Orchestrator)
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis (or use Docker)

### Development Setup

1. **Clone and install dependencies**

```bash
# Install all dependencies (root + all subprojects)
npm run install:all
```

2. **Start everything with a single command** 🚀

```bash
# Start Docker infrastructure (Postgres + Redis) and all dev servers
npm run dev:docker
```

This single command will:
- Start PostgreSQL and Redis in Docker
- Start the Backend API (port 3001)
- Start the Vendor Portal (port 3000)
- Start Admin & User Portals (ports 3002 & 3003)

**Alternative: Start services separately**

```bash
# Terminal 1: Start infrastructure
docker compose up -d postgres redis

# Terminal 2: Start all development servers
npm run dev
```

**Manual approach (multiple terminals)**

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Vendor Frontend
cd frontend && npm run dev

# Terminal 3: Admin/User Portals
cd event-orchestrator-frontend && npm run dev
```

3. **Access the application**

- Vendor Portal: http://localhost:3000
- Admin Portal: http://localhost:3002
- User Portal: http://localhost:3003
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/docs

## 📁 Project Structure

```
├── backend/                    # Vendor Portal Backend (Node.js)
│   ├── src/
│   │   ├── config/            # Database, Redis, environment config
│   │   ├── db/migrations/     # SQL migration scripts
│   │   ├── middleware/        # Auth, RBAC, validation, rate limiting
│   │   ├── routes/            # API route handlers
│   │   ├── services/          # Business logic
│   │   ├── schemas/           # Zod validation schemas
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Helpers and utilities
│   └── Dockerfile
│
├── frontend/                   # Vendor Portal Frontend (Next.js)
│   ├── src/
│   │   ├── app/               # Next.js App Router pages
│   │   ├── components/        # React components
│   │   ├── lib/               # API client, auth store, utilities
│   │   └── styles/            # Global CSS and Tailwind config
│   └── Dockerfile
│
├── agentic_event_orchestrator/ # AI Multi-Agent System (Python)
│   ├── agents/                # AI Agents (Orchestration, Planner, Mail)
│   │   └── mcp_server.py      # MCP Server for tool exposure
│   ├── nlp_processor/         # Intent extraction (Gemini API)
│   ├── scheduler/             # Optimizer and constraint solver
│   ├── vendor_integration/    # API/Manual vendor handlers
│   ├── approval_workflow/     # Human-in-the-loop approvals
│   ├── app.py                 # Chainlit UI
│   └── test_mcp.py            # MCP integration test
│
├── event-orchestrator-frontend/ # Admin & User Portals (Turborepo)
│   ├── apps/
│   │   ├── admin/             # Admin Portal (Next.js 16)
│   │   └── user/              # User Portal (Next.js 16)
│   └── packages/
│       └── ui/                # Shared Shadcn/ui components
│
├── docs/
│   └── openapi.yaml           # API documentation
│
├── docker-compose.yml         # Local development setup
└── README.md
```

## 🤖 Agentic Event Orchestrator

AI-powered multi-agent system for automated event planning.

### Features
- **NLP Processing**: Natural language intent extraction using Google Gemini API
- **Multi-Agent System**: Orchestration, Planner, and Mail agents
- **MCP Integration**: Model Context Protocol for agent communication
- **Vendor Matching**: Automatic vendor search and optimization
- **Human-in-the-Loop**: Approval workflows via Chainlit UI

### Running the Orchestrator

```bash
cd agentic_event_orchestrator

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export GEMINI_API_KEY=your_key_here

# Run Chainlit UI
chainlit run app.py

# Or run MCP server
python3 agents/mcp_server.py
```

### MCP Tools
- `plan_event`: Plan an event with vendor matching
- `search_vendors`: Search vendors by query

## 🖥️ Admin & User Portals

Modern frontend system built with Turborepo and Next.js 16.

### Admin Portal Features
- Dashboard with metrics
- Vendor management (approve/reject)
- User management

### User Portal Features
- Event creation wizard
- AI chat interface
- Vendor marketplace
- Real-time updates (Socket.io)

### Running the Portals

```bash
cd event-orchestrator-frontend
npm run dev     # Run all apps
npm run build   # Build for production
```

## 🔑 API Endpoints

### Authentication
- `POST /api/v1/vendors/register` - Register new vendor
- `POST /api/v1/vendors/login` - Login with email/password
- `POST /api/v1/vendors/logout` - Logout
- `POST /api/v1/vendors/refresh-token` - Refresh access token
- `POST /api/v1/vendors/verify-2fa` - Verify 2FA code

### Profile
- `GET /api/v1/vendors/me` - Get current vendor profile
- `PUT /api/v1/vendors/me` - Update vendor profile
- `GET /api/v1/vendors/:id/public` - Get public vendor profile

### Services
- `GET /api/v1/vendors/me/services` - List services
- `POST /api/v1/vendors/me/services` - Create service
- `PUT /api/v1/vendors/me/services/:id` - Update service
- `DELETE /api/v1/vendors/me/services/:id` - Delete service

### Pricing
- `GET /api/v1/vendors/me/pricing` - List pricing
- `POST /api/v1/vendors/me/pricing` - Create pricing
- `PUT /api/v1/vendors/me/pricing/:id` - Update pricing
- `GET /api/v1/vendors/me/pricing/history` - Price history

## 🔒 Security Features

- **JWT Authentication** with 15-minute access tokens
- **Refresh Token Rotation** stored in Redis
- **2FA Support** using TOTP (Google Authenticator compatible)
- **RBAC** with owner, admin, staff, readonly roles
- **Rate Limiting** per vendor/IP
- **Audit Logging** for all mutations
- **Password Hashing** with bcrypt (12 rounds)
- **Input Validation** with Zod schemas

## 🛠️ Technology Stack

### Backend (Vendor Portal)
- Node.js 20 + Express + TypeScript
- PostgreSQL 15 + pg client
- Redis for caching/sessions
- JWT + speakeasy (2FA)
- Zod for validation

### Agentic Orchestrator
- Python 3.10+
- Google Gemini API (NLP)
- MCP (Model Context Protocol)
- Chainlit (UI)
- OR-Tools (optimization)

### Frontend
- Next.js 14/16 (App Router)
- React 18 + TypeScript
- Tailwind CSS + Shadcn/ui
- React Query + Zustand
- Socket.io (real-time)

## 📊 Database Schema

Core tables:
- `vendors` - Business profiles
- `vendor_users` - User accounts with 2FA
- `services` - Service offerings
- `pricing` - Price entries with effective dates
- `price_history` - Price change tracking
- `vendor_documents` - Document verification
- `audit_logs` - All mutation tracking
- `bookings` - Event bookings
- `api_keys` - API integration keys
- `webhooks` - Webhook configurations

## 🐳 Docker Deployment

### Development

```bash
docker-compose up
```

### Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 📄 License

MIT License - see LICENSE file for details.
