# Event-AI Platform

An intelligent event planning platform that connects users with vendors for seamless event management. Built with modern technologies and best practices.

## 🏗️ Architecture

The platform follows a monorepo structure with the following components:

```
Event-AI/
├── packages/
│   ├── backend/          # Express.js API server
│   ├── user/            # Next.js user portal
│   ├── admin/           # Next.js admin portal
│   ├── frontend/        # Next.js vendor portal
│   └── ui/              # Shared UI components
├── docker-compose.yml   # Docker orchestration
├── package.json         # Root package configuration
└── turbo.json          # Turborepo configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker & Docker Compose (optional, for database)

### Option 1: Docker Setup (Recommended)

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd Event-AI
   ```

2. **Copy environment files:**
   ```bash
   cp .env.example .env
   cp packages/backend/.env.example packages/backend/.env
   cp packages/user/.env.example packages/user/.env
   cp packages/admin/.env.example packages/admin/.env
   cp packages/frontend/.env.example packages/frontend/.env
   ```

3. **Start all services:**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

5. **Access the applications:**
   - User Portal: http://localhost:3000
   - Backend API: http://localhost:3001
   - Admin Portal: http://localhost:3002
   - Vendor Portal: http://localhost:3003

### Option 2: Local Development

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start database services:**
   ```bash
   npm run db:up
   ```

3. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

4. **Start all services:**
   ```bash
   pnpm dev
   ```

   Or start individual services:
   ```bash
   pnpm dev:backend   # Backend only
   pnpm dev:user      # User portal only
   pnpm dev:admin     # Admin portal only
   pnpm dev:vendor    # Vendor portal only
   ```

### Option 3: Windows / No Docker Setup

If you cannot or do not want to use Docker, follow these steps:

1. **Install Prerequisites Manually:**
   - PostgreSQL (Create a database named `event_ai`)
   - Redis (Optional, but recommended for full functionality)

2. **Configure Environment:**
   - Update `.env` files to point to your local PostgreSQL and Redis instances.
   - Example `DATABASE_URL=postgresql://postgres:password@localhost:5432/event_ai`

3. **Install & Setup:**
   ```bash
   npm run setup:nodocker
   ```

4. **Start the Application:**
   ```bash
   pnpm dev
   ```

   **Note for Windows Users:**
   - The project is configured with `rimraf` for cross-platform cleanup.
   - Database migrations use `prisma` which is compatible with Windows.
   - If you encounter execution policy errors in PowerShell, try running as Administrator or use Command Prompt.

## 📦 Packages

### Backend (`packages/backend`)

Express.js API server with the following features:
- RESTful API endpoints
- JWT authentication & authorization
- PostgreSQL database with connection pooling
- Redis caching
- Rate limiting
- File upload support
- Audit logging
- 2FA support

**Key Technologies:**
- Express.js
- PostgreSQL (pg)
- Redis
- JWT
- bcrypt
- Zod validation

### User Portal (`packages/user`)

Next.js application for event planners and attendees:
- Event creation and management
- Vendor marketplace
- AI chat assistant
- Real-time notifications (WebSocket)
- Booking management

**Key Technologies:**
- Next.js 16
- React 19
- TanStack Query
- NextAuth.js
- Socket.io Client
- Tailwind CSS

### Admin Portal (`packages/admin`)

Next.js application for system administrators:
- User management
- Vendor approval
- System settings
- Analytics dashboard

**Key Technologies:**
- Next.js 16
- React 19
- NextAuth.js
- Tailwind CSS

### Vendor Portal (`packages/frontend`)

Next.js application for vendors:
- Service management
- Pricing packages
- Booking management
- Profile management

**Key Technologies:**
- Next.js 14
- React 18
- TanStack Query
- Tailwind CSS

## 🗄️ Database Schema

The platform uses PostgreSQL with the following main tables:

- **users** - User accounts (event planners, vendors, admins)
- **vendors** - Vendor business profiles
- **services** - Services offered by vendors
- **pricing_packages** - Pricing tiers for services
- **events** - Events created by users
- **event_vendors** - Vendor bookings for events
- **notifications** - User notifications
- **audit_logs** - System audit trail
- **api_keys** - Vendor API access keys

## 🔧 Environment Variables

### Root `.env`
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/event_ai
JWT_SECRET=your-secret-key
# ... see .env.example for all options
```

### Package-specific `.env`
Each package has its own `.env.example` file with required variables.

## 🧪 Development Commands

```bash
# Install dependencies
pnpm install

# Start all services
pnpm dev

# Build all packages
pnpm build

# Run linting
pnpm lint

# Format code
pnpm format

# Database commands
pnpm db:up          # Start database containers
pnpm db:down        # Stop database containers
pnpm db:migrate     # Run migrations
pnpm db:migrate:down # Rollback migrations
pnpm db:reset       # Reset database

# Clean everything
pnpm clean
```

## 🔐 Authentication

The platform uses JWT-based authentication:
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Optional 2FA support for enhanced security
- Role-based access control (RBAC)

## 🌐 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/2fa/setup` - Setup 2FA
- `POST /api/v1/auth/2fa/verify` - Verify 2FA

### Users
- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update user profile
- `GET /api/v1/users/notifications` - Get notifications

### Vendors
- `GET /api/v1/vendors` - List vendors
- `GET /api/v1/vendors/:id` - Get vendor details
- `POST /api/v1/vendors` - Create vendor profile
- `PUT /api/v1/vendors/:id` - Update vendor profile

### Services
- `GET /api/v1/services` - List services
- `POST /api/v1/services` - Create service
- `PUT /api/v1/services/:id` - Update service
- `DELETE /api/v1/services/:id` - Delete service

### Events
- `GET /api/v1/events` - List events
- `POST /api/v1/events` - Create event
- `GET /api/v1/events/:id` - Get event details
- `PUT /api/v1/events/:id` - Update event
- `DELETE /api/v1/events/:id` - Delete event

### Bookings
- `POST /api/v1/bookings` - Create booking
- `GET /api/v1/bookings` - List bookings
- `PUT /api/v1/bookings/:id` - Update booking status

## 🧪 Testing

```bash
# Run backend tests
cd packages/backend && npm test

# Run frontend tests
cd packages/user && npm test
```

## 📚 Documentation

- [API Documentation](docs/openapi.yaml) - OpenAPI/Swagger specification
- [Implementation Guide](PRACTICAL_IMPLEMENTATION_GUIDE_PAKISTAN.md) - Pakistan-specific implementation
- [Agentic Orchestrator](AGENTIC_EVENT_ORCHESTRATOR_IMPLEMENTATION_GUIDE.md) - AI orchestration details

## 🛠️ Troubleshooting

### Database Connection Issues
1. Ensure PostgreSQL is running: `docker-compose ps`
2. Check connection string in `.env`
3. Verify database exists: `docker-compose exec postgres psql -U postgres -c "\l"`

### Port Conflicts
If ports are already in use, modify the port mappings in:
- `docker-compose.yml`
- Package-specific `.env` files

### Migration Issues
1. Reset database: `npm run db:reset`
2. Check migration files: `packages/backend/src/db/migrations/`
3. Manual rollback: `npm run db:migrate:down`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit a pull request

## 📄 License

This project is proprietary and confidential.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation in the `docs/` folder

---

Built with ❤️ by the Event-AI Team
