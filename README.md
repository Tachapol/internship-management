# DevPlus — Internship Management System

A full-stack internship management platform for organizations overseeing interns across partner companies.

## Table of Contents

- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [User Roles](#user-roles)
- [Features](#features)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Test Accounts](#test-accounts)
- [API Endpoints](#api-endpoints)
- [Architecture](#architecture)
- [Packages](#packages)
- [Scripts](#scripts)
- [Security Notes](#security-notes)

---

## Project Structure

This is a Turborepo-managed monorepo with npm workspaces:

```
internship-management/
├── apps/
│   ├── api/                         # NestJS REST API (port 4000)
│   │   ├── src/
│   │   │   ├── auth/                # JWT authentication + guards
│   │   │   ├── users/               # User CRUD
│   │   │   ├── invitations/         # Email invitation flow
│   │   │   ├── companies/           # Partner company management
│   │   │   ├── teams/               # Company-level teams
│   │   │   ├── attendance/          # Check-in/out + monthly reports
│   │   │   ├── leave-requests/      # Leave submission and approval
│   │   │   ├── training-plans/      # Training programs and modules
│   │   │   ├── dashboard/           # Role-based statistics
│   │   │   ├── notifications/       # In-app notifications
│   │   │   ├── audit-logs/          # Immutable audit trail
│   │   │   ├── support-tickets/     # Support ticket system
│   │   │   ├── email/               # Resend email service
│   │   │   ├── storage/             # Supabase file upload
│   │   │   ├── prisma/              # Database connection
│   │   │   ├── app.module.ts        # Root module (imports all)
│   │   │   └── main.ts              # Bootstrap (Swagger, CORS, validation)
│   │   └── package.json
│   │
│   └── web/                         # Next.js 15 SSR Frontend (port 3000)
│       ├── src/
│       │   ├── app/                 # App Router pages
│       │   │   ├── auth/            # Login, forgot/reset password, accept invitation
│       │   │   ├── dashboard/       # Adaptive dashboard (per role)
│       │   │   ├── companies/       # Company list and management
│       │   │   ├── users/           # Intern management (+ detail view)
│       │   │   ├── teams/           # Team management
│       │   │   ├── attendance/      # Check-in/out + history
│       │   │   ├── leave-requests/  # Leave requests
│       │   │   ├── training-plans/  # Training plans
│       │   │   ├── notifications/   # Notification inbox
│       │   │   ├── audit-logs/      # Audit log viewer
│       │   │   ├── support-tickets/ # Support tickets
│       │   │   ├── support/         # Individual ticket thread
│       │   │   ├── faq/             # FAQ page
│       │   │   ├── settings/        # User settings
│       │   │   ├── layout.tsx       # Root layout (AuthProvider)
│       │   │   └── page.tsx         # Landing (/ redirects to /dashboard or /auth/login)
│       │   ├── components/
│       │   │   ├── layout/          # DashboardLayout, DashboardShell
│       │   │   └── ui/              # Button, Dialog, Table, Toast, etc.
│       │   └── lib/
│       │       ├── api.ts           # Typed API client (fetch wrapper)
│       │       ├── auth-context.tsx # Auth state (React Context)
│       │       ├── types.ts         # Frontend TypeScript types
│       │       └── utils.ts         # cn() helper, formatters
│       └── package.json
│
├── packages/
│   ├── database/                    # Prisma schema, migrations, seed
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # 15 models, 12 enums
│   │   │   └── seed.ts              # Sample data (4 users, attendance, leave, training)
│   │   └── src/index.ts             # Re-export @prisma/client
│   │
│   ├── types/                       # Shared TypeScript types
│   ├── config-eslint/               # ESLint preset
│   ├── config-typescript/           # TSConfig base
│   └── config-prettier/             # Prettier preset
│
├── docker-compose.yml               # PostgreSQL 15 (port 5433)
├── turbo.json                       # Build pipeline config
└── package.json                     # Root workspace definition
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React 19, Tailwind CSS, Radix UI, Lucide Icons |
| **Backend** | NestJS 10, Express, class-validator, Swagger/OpenAPI |
| **Database** | PostgreSQL 15, Prisma ORM v5 |
| **Authentication** | JWT (Access Token: 1 day, Refresh Token: 30 days, stored in DB) |
| **File Storage** | Supabase Storage (with mock fallback for local development) |
| **Email** | Resend (with console log fallback for local development) |
| **Build Orchestration** | Turborepo + npm workspaces |

---

## User Roles

| Role | Permissions |
|---|---|
| **SUPER_ADMIN** | Full system access across all companies (DevPlus internal staff) |
| **BD_TEAM** | Manage data for partner companies they oversee |
| **MENTOR** | View and manage only their assigned students |
| **STUDENT** | View and manage only their own data |

---

## Features

### Authentication and Authorization

- Email and password login with bcrypt hashing (cost factor 10)
- Dual-token auth: Access Token (JWT, 1 day) and Refresh Token (stored in database, 30 days)
- Email-based invitation flow — invited users set their own password via a secure link
- Password reset with time-limited tokens (expire after 1 hour)
- Route protection via Next.js Middleware (reads token from cookie)

### Personnel Management

- Create, edit, and delete interns, mentors, and teams
- Email invitation system with token verification
- Search and filter by company, team, and status

### Adaptive Dashboard (per role)

- **SUPER_ADMIN**: Total companies, total students, attendance rate, pending leaves
- **BD_TEAM**: Overview of all partner companies, attendance statistics, mentor performance metrics, leave breakdown
- **MENTOR**: List of assigned students, daily attendance overview, pending leave requests, training plan progress
- **STUDENT**: Attendance history, personal leave status, training plan module progress, recent notifications

### Attendance

- Clock in and clock out with IP address and location recording
- Automatic status calculation: PRESENT (before 8:00 AM), LATE (after 8:00 AM), ABSENT, ON_LEAVE
- Monthly reports: present days, late days, absences, leaves, attendance rate percentage
- Mentors, BD Team, and Admins can view any student's attendance records

### Leave Requests

- Submit leave requests: Sick, Casual, Annual, Other
- Attach supporting documents (medical certificates, etc.) via Supabase Storage
- Mentors and BD Team approve or reject with optional comments
- Status flow: PENDING → APPROVED / REJECTED / CANCELLED

### Training Plans

- Create company-wide training programs (e.g., "Web Development Track")
- Split into weekly modules (Week 1, 2, 3, ...)
- Attach PDF documents or external resource links
- Track individual student progress (ACTIVE → COMPLETED)

### Notifications

- Automatically generated on significant events (leave approvals, attendance changes, training assignments)
- Categories: INFO, SUCCESS, WARNING, ALERT, ATTENDANCE, LEAVE, TRAINING
- Read/unread tracking, mark all as read

### Audit Logs

- Immutable record of all significant actions: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, OTHER
- Stores old and new values, IP address, user agent
- Append-only — cannot be deleted or modified

### Support Tickets

- Students can submit support requests
- Staff (Admin, BD Team, Mentors) can reply, change status, and assign tickets
- Status flow: OPEN → IN_REVIEW → RESOLVED → CLOSED
- Priority levels: LOW, MEDIUM, HIGH
- Categories: attendance, leave, training, other

### FAQ Page

- Frequently asked questions for students

---

## Database Schema

15 models, 12 enums:

| Model | Description |
|---|---|
| `companies` | Partner organizations hosting interns |
| `users` | All system actors (admins, mentors, students) |
| `teams` | Sub-groups within a company |
| `invitations` | Email invitation tokens |
| `password_reset_tokens` | Forgot-password tokens (1-hour expiry) |
| `refresh_tokens` | Persisted JWT refresh tokens |
| `attendances` | Daily check-in/out records (unique per user+date) |
| `training_plans` | Team-wide training programs |
| `training_plan_modules` | Weekly modules within a plan |
| `student_module_progress` | Per-student module completion tracking |
| `leave_requests` | Leave submissions and approvals |
| `notifications` | In-app notification messages |
| `audit_logs` | Immutable action log (never deleted) |
| `support_tickets` | User-submitted support requests |
| `support_ticket_replies` | Threaded replies on tickets |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- PostgreSQL 15+

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Copy the example file and customize:

```bash
cp .env.example .env
```

If you are connecting to an existing Supabase Cloud database (as configured in the current `.env`), you can use it directly. Otherwise, adjust the credentials.

### Initialize the Database

**Option A: Using existing Supabase Cloud Database**

```bash
# Regenerate Prisma Client from the database schema
npm run db:generate

# Seed sample data
cd packages/database
npx prisma db seed
```

**Option B: Using local PostgreSQL via Docker**

```bash
# Start PostgreSQL with Docker Compose
docker-compose up -d

# Update .env to point to localhost
# DATABASE_URL="postgresql://devplus_user:devplus_password@localhost:5433/devplus"

# Run migrations and seed
npm run db:generate
npm run db:migrate
```

### Run Development Servers

```bash
npm run dev
```

This starts both services simultaneously:

- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000
- **Swagger Documentation**: http://localhost:4000/api/docs

### Run in Production

```bash
npm run build
npm run start --workspace=api   # API server
npm run start --workspace=web   # Web server
```

---

## Test Accounts

Password for all accounts: `Password1234!`

| Role | Email |
|---|---|
| SUPER_ADMIN | admin@devplus.co.th |
| BD_TEAM | bd@devplus.co.th |
| MENTOR | mentor@devplus.co.th |
| STUDENT | student@devplus.co.th |

---

## API Endpoints

Base URL: `http://localhost:4000/api`

### Authentication

| Method | Endpoint | Description | Role |
|---|---|---|---|
| POST | `/auth/login` | Sign in | Public |
| POST | `/auth/logout` | Sign out | All |
| GET | `/auth/me` | Current user info | All |
| POST | `/auth/forgot-password` | Send password reset email | Public |
| POST | `/auth/reset-password` | Reset password | Public |

### Users

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/users` | User list (paginated) | ADMIN, BD_TEAM |
| GET | `/users/:id` | User details | All |
| PATCH | `/users/:id` | Update user | ADMIN, BD_TEAM |
| DELETE | `/users/:id` | Delete user | ADMIN |
| POST | `/users/invite` | Invite new user | ADMIN, BD_TEAM |

### Companies

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/companies` | Company list (paginated) | ADMIN, BD_TEAM |
| GET | `/companies/:id` | Company details | All |
| POST | `/companies` | Create company | ADMIN |
| PATCH | `/companies/:id` | Update company | ADMIN, BD_TEAM |
| DELETE | `/companies/:id` | Delete company | ADMIN |

### Teams

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/teams` | Team list (paginated) | All |
| GET | `/teams/:id` | Team details | All |
| POST | `/teams` | Create team | ADMIN, BD_TEAM |
| PATCH | `/teams/:id` | Update team | ADMIN, BD_TEAM |
| DELETE | `/teams/:id` | Delete team | ADMIN, BD_TEAM |

### Attendance

| Method | Endpoint | Description | Role |
|---|---|---|---|
| POST | `/attendance/check-in` | Clock in | STUDENT |
| POST | `/attendance/check-out` | Clock out | STUDENT |
| GET | `/attendance` | Attendance list (paginated) | All |
| GET | `/attendance/today` | Today's status | All |
| GET | `/attendance/report` | Monthly report | All |
| PATCH | `/attendance/:id` | Override status | ADMIN, BD_TEAM |

### Leave Requests

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/leave-requests` | Leave list (paginated) | All |
| GET | `/leave-requests/:id` | Leave details | All |
| POST | `/leave-requests` | Submit leave (with file) | STUDENT |
| PATCH | `/leave-requests/:id/approve` | Approve | MENTOR, BD_TEAM |
| PATCH | `/leave-requests/:id/reject` | Reject | MENTOR, BD_TEAM |
| PATCH | `/leave-requests/:id/cancel` | Cancel | STUDENT |

### Training Plans

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/training-plans` | Plan list (paginated) | All |
| GET | `/training-plans/:id` | Plan details | All |
| POST | `/training-plans` | Create plan | MENTOR, ADMIN, BD_TEAM |
| PATCH | `/training-plans/:id` | Update plan | MENTOR, ADMIN, BD_TEAM |
| DELETE | `/training-plans/:id` | Delete plan | MENTOR, ADMIN, BD_TEAM |
| POST | `/training-plans/modules` | Add module (with file) | MENTOR, ADMIN, BD_TEAM |
| PATCH | `/training-plans/modules/:id` | Update module (with file) | MENTOR, ADMIN, BD_TEAM |
| DELETE | `/training-plans/modules/:id` | Delete module | MENTOR, ADMIN, BD_TEAM |
| PATCH | `/training-plans/modules/:id/progress` | Update progress | STUDENT |

### Notifications

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/notifications` | Notification list (paginated) | All |
| PATCH | `/notifications/:id/read` | Mark as read | All |
| PATCH | `/notifications/read-all` | Mark all as read | All |
| DELETE | `/notifications/:id` | Delete notification | All |

### Audit Logs

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/audit-logs` | Audit log list (paginated) | ADMIN, BD_TEAM |

### Support Tickets

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/support-tickets` | Ticket list (paginated) | All |
| GET | `/support-tickets/:id` | Ticket details | All |
| POST | `/support-tickets` | Create ticket | All |
| POST | `/support-tickets/:id/replies` | Reply to ticket | All |
| PATCH | `/support-tickets/:id/status` | Update status | Staff only |
| PATCH | `/support-tickets/:id/assign` | Assign ticket | Staff only |

### Dashboard

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/dashboard/stats` | Role-adapted statistics | All |

---

## Architecture

> For comprehensive system architecture, API specifications, security models, and data flows, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

```
                    Frontend (Next.js)
    Pages -> Components -> API Client -> Auth Context
    Middleware (cookie-based auth)
                        |
                        | Bearer Token (JWT)
                        v
                    Backend (NestJS)

    Guards (JWT + Roles)
    |-- Auth Module      -> Login, Logout, Me
    |-- Users Module     -> CRUD, Invite
    |-- Companies Module -> CRUD
    |-- Teams Module     -> CRUD
    |-- Attendance Module-> Check-in/out, Reports
    |-- Leave Requests   -> Submit, Approve, Reject
    |-- Training Plans   -> Create, Modules, Progress
    |-- Dashboard        -> Stats per Role
    |-- Notifications    -> Inbox, Mark Read
    |-- Audit Logs       -> Immutable trail
    |-- Support Tickets  -> Create, Reply, Assign
    |-- Email Module     -> Resend integration
    |-- Storage Module   -> Supabase file upload
                        |
                        v
                Database (PostgreSQL + Prisma)
                15 Models, 12 Enums,
                Soft Deletes, Indexes
```

---

## Packages

### `database`

Prisma schema, migrations, seed script, and Prisma Client re-export.

| Command | Description |
|---|---|
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio (GUI) |
| `npm run build` | Compile TypeScript and generate client |

### `types`

Shared TypeScript interfaces consumed by both frontend and backend:

- `ApiResponse<T>` — Standard API response envelope
- `AttendanceEventPayload` — WebSocket event for attendance changes
- `NotificationEventPayload` — WebSocket event for notifications
- `SharedUserProfile` — Basic user information shape

### `config-*`

Shareable configuration presets for ESLint, TypeScript compiler, and Prettier.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start both API and Web with hot reload |
| `npm run build` | Build all packages (via Turborepo) |
| `npm run lint` | Run ESLint across the monorepo |
| `npm run format` | Format all files with Prettier |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio |

---

## Security Notes

- Passwords are hashed with bcrypt (cost factor 10)
- JWT secret should be changed before deploying to production
- Refresh tokens are persisted in the database and can be revoked individually
- Most models use soft deletes (`deletedAt`) instead of permanent removal
- Audit logs are immutable and cannot be deleted or modified
