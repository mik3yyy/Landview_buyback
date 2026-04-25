# Landview Buyback System — Setup Guide

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm

## Quick Start

### 1. Install dependencies
```bash
cd /Users/michael/Downloads/Landview_buyback
npm install
npm run install:all
```

### 2. Configure environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your database URL, JWT secrets, SMTP, and Anthropic API key
```

### 3. Set up database
```bash
# Create PostgreSQL database
createdb landview_buyback

# Run migrations and seed
cd backend
npx prisma migrate dev --name init
npm run prisma:seed
```

### 4. Start development servers
```bash
# From project root — runs both backend (port 5000) and frontend (port 5173)
npm run dev
```

Open: http://localhost:5173

## Default Credentials (after seeding)
| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@landview.com | SuperAdmin@2026! |
| Admin | admin@landview.com | Admin@Landview2026! |
| Accountant | accountant@landview.com | Accountant@2026! |

## Features by Role
- **Accountant**: Create investments, AI upload, mark payment initiated, view list
- **Admin**: All above + edit/delete investments, user management, export
- **Super Admin**: All above + audit logs, system settings, create any role users

## Environment Variables (backend/.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/landview_buyback
JWT_SECRET=<min 32 chars random string>
JWT_REFRESH_SECRET=<min 32 chars random string>
PORT=5000

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-app-password
SMTP_FROM=Landview Buyback <noreply@landview.com>

# AI Features
ANTHROPIC_API_KEY=sk-ant-...

FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

## API Routes
- POST /api/auth/login
- GET  /api/investments (filterable, paginated)
- POST /api/investments
- PUT  /api/investments/:id
- POST /api/investments/:id/extend
- POST /api/investments/:id/mark-payment-initiated
- POST /api/investments/:id/mark-payment-completed
- POST /api/ai-upload
- GET  /api/audit-logs (super_admin only)
- GET  /api/users (admin+)
- POST /api/users (admin+)
- GET  /api/settings (super_admin only)
- PUT  /api/settings (super_admin only)
