# Event-AI Platform

An intelligent event planning platform that connects users with vendors for seamless event management, powered by an Agentic AI Orchestrator. Built with modern technologies and production-ready security practices.

## 🏗️ Architecture

```
Event-AI/
├── packages/
│   ├── backend/                      # Fastify API server with Prisma ORM
│   │   ├── src/
│   │   │   ├── config/              # Database & app configuration
│   │   │   ├── middleware/          # Auth, validation, rate limiting
│   │   │   ├── routes/              # API route handlers
│   │   │   ├── schemas/             # Zod validation schemas
│   │   │   ├── services/            # Business logic
│   │   │   └── utils/               # Response helpers, logger
│   │   └── prisma/                  # Database schema & migrations
│   ├── agentic_event_orchestrator/   # Python AI Agent Service
│   │   ├── agents/                  # AI agent definitions
│   │   ├── tools/                   # Agent function tools
│   │   └── server.py                # FastAPI service entry
│   ├── user/                         # Next.js 14 User Portal
│   ├── admin/                        # Next.js 14 Admin Portal
│   ├── frontend/                     # Next.js 14 Vendor Portal
│   └── ui/                           # Shared UI component library
├── infra/                            # Infrastructure as Code
├── docs/                             # Documentation
└── scripts/                          # Deployment & utility scripts
```

## 🚀 Quick Start (Development)

### Prerequisites
- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **Python** >= 3.12
- **PostgreSQL** >= 15 (local or cloud)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Environment Setup
```bash
# Backend
cp packages/backend/.env.example packages/backend/.env

# User Portal
cp packages/user/.env.example packages/user/.env.local

# AI Orchestrator
cp packages/agentic_event_orchestrator/.env.example packages/agentic_event_orchestrator/.env
```

### 3. Database Setup
```bash
cd packages/backend
pnpm run generate      # Generate Prisma client
pnpm run migrate:dev   # Run migrations
```

### 4. Start Development
```bash
# Terminal 1: Backend API (port 3001)
cd packages/backend && pnpm run dev

# Terminal 2: AI Agent (port 8000)
cd packages/agentic_event_orchestrator && python server.py

# Terminal 3: User Portal (port 3003)
cd packages/user && pnpm run dev
```

---

## 🔒 Production Security

### Authentication & Authorization
- **JWT**: Cryptographically secure 256-bit secrets with expiration
- **Refresh Tokens**: Separate rotation mechanism for extended sessions
- **Rate Limiting**: Per-endpoint configurations
  - Auth endpoints: 5 requests/minute
  - Public APIs: 60 requests/minute
  - AI endpoints: 30 requests/minute
  - Booking creation: 10 requests/minute

### Input Validation
All public endpoints validate requests using Zod schemas:
- Path parameters (UUIDs, IDs)
- Query parameters (pagination, filters)
- Request bodies (create, update operations)

### Database Security
- Connection pooling with retry logic
- Parameterized queries (Prisma ORM)
- Transaction isolation for multi-step operations
- Row-level security via Supabase policies

### API Response Standardization
```typescript
// Success response
{ success: true, data: {...}, meta: {...} }

// Paginated response
{ success: true, data: [...], meta: { total, page, limit, pages } }

// Error response
{ success: false, error: { code: "ERROR_CODE", message: "..." } }
```

---

## 📦 Package Details

### Backend (`packages/backend`)
Fastify-based REST API with the following production features:

| Feature | Implementation |
|---------|---------------|
| Framework | Fastify 4.x |
| ORM | Prisma 5.x |
| Validation | Zod schemas |
| Auth | JWT + bcrypt |
| Rate Limit | @fastify/rate-limit |
| Logging | Pino (structured JSON) |
| Database | PostgreSQL 15 + pgvector |

**Key Endpoints:**
- `/api/v1/auth/*` - Authentication
- `/api/v1/vendors` - Vendor marketplace
- `/api/v1/events` - Event management
- `/api/v1/bookings` - Booking operations
- `/api/v1/ai/*` - AI agent proxy

### AI Orchestrator (`packages/agentic_event_orchestrator`)
Python-based agentic AI system:

| Component | Technology |
|-----------|-----------|
| Framework | FastAPI |
| Agent SDK | OpenAI Agents SDK |
| LLM | Gemini via LiteLLM |
| Async | nest_asyncio |
| Vector DB | pgvector (PostgreSQL) |

**Agent Types:**
- Triage Agent - Routes user requests
- Vendor Discovery - Finds suitable vendors
- Scheduler - Optimizes event timing
- Approval Agent - Handles booking confirmations

### User Portal (`packages/user`)
Next.js 14 application with:
- App Router architecture
- React Query for server state
- Tailwind CSS + shadcn/ui
- Native AI chat interface
- Server-side rendering for SEO

---

## 🌐 Service Configuration

### Port Allocation
| Service | Port | Purpose |
|---------|------|---------|
| Backend API | 3001 | REST API server |
| AI Agent | 8000 | Python orchestrator |
| User Portal | 3003 | End-user interface |
| Admin Portal | 3002 | System administration |
| Vendor Portal | 3000 | Vendor dashboard |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Caching & sessions |

### Environment Variables

**Backend (`packages/backend/.env`):**
```env
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Security
JWT_SECRET=<256-bit-hex-secret>
JWT_REFRESH_SECRET=<256-bit-hex-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://yourdomain.com,https://admin.yourdomain.com

# AI Service
AI_SERVICE_URL=http://localhost:8000
```

**User Portal (`packages/user/.env.local`):**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NEXTAUTH_SECRET=<secure-random-string>
NEXTAUTH_URL=https://yourdomain.com
```

---

## 🚢 Deployment

### Prerequisites
- Node.js 20+ runtime
- PostgreSQL 15+ with pgvector extension
- Python 3.12+ (for AI service)
- Redis (for caching/sessions)

### Build Process
```bash
# Backend
cd packages/backend
pnpm install
pnpm run generate
pnpm run build

# User Portal
cd packages/user
pnpm install
pnpm run build
```

### Database Migrations
```bash
cd packages/backend
pnpm run migrate:prod   # Production migrations
```

### Health Checks
All services expose health endpoints:
- Backend: `GET /api/v1/health`
- AI Agent: `GET /health`

---

## 📊 Monitoring & Observability

### Structured Logging
Backend outputs JSON logs with:
- Request ID correlation
- User context
- Timing metrics
- Error stack traces

### Metrics Collection
- API request rates
- Response times
- Error rates by endpoint
- Database query performance

### Health Checks
```bash
# Backend health
curl http://localhost:3001/api/v1/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🛡️ Security Checklist

- [x] JWT secrets rotated (256-bit)
- [x] Database connection retry logic
- [x] Input validation on all public endpoints
- [x] Rate limiting per endpoint type
- [x] API response standardization
- [x] Error codes with proper HTTP status
- [x] Booking conflict prevention (optimistic locking)
- [x] Database transactions for multi-step ops
- [ ] Production HTTPS certificates
- [ ] Environment variable encryption
- [ ] Web Application Firewall (WAF)

---

## 🧪 Testing

### Backend Tests
```bash
cd packages/backend
pnpm run test
pnpm run test:integration
```

### Frontend Tests
```bash
cd packages/user
pnpm run test
```

---

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Check connection
psql $DATABASE_URL -c "SELECT 1"

# Verify Prisma client
cd packages/backend && pnpm run generate
```

### Build Failures
```bash
# Clean and rebuild
pnpm run clean
pnpm install
pnpm run build
```

### AI Agent Not Responding
- Verify `GEMINI_API_KEY` is set
- Check AI service running: `curl http://localhost:8000/health`
- Review LiteLLM model configuration

---

## 📈 Development Status

### ✅ Production Ready
- Backend API with Fastify + Prisma
- JWT authentication with secure secrets
- Database connection resilience
- Input validation & rate limiting
- API response standardization
- Booking conflict prevention
- Structured logging

### 🔄 Planned Enhancements
- Payment integration (Stripe/JazzCash)
- Email/SMS notifications
- Real-time WebSocket updates
- Advanced analytics dashboard
- Mobile application

---

**Event-AI Platform** - Intelligent Event Planning
Built with security, scalability, and user experience in mind.
