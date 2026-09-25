# System Architecture — DevPlus Internship Management System

## 1. Executive Summary & Overview

DevPlus is a multi-tenant full-stack internship management platform built to streamline the coordination between educational institutions, intern students, partner companies, mentors, and business development (BD) administrators.

The system is architected as a **modular monorepo** using **Turborepo**, standardizing on **TypeScript** end-to-end across both the client-side presentation layer and server-side business logic layer.

---

## 2. Technology Stack & Programming Languages

### 2.1 Language
- **TypeScript (v5.x)**: Used universally across Frontend, Backend, and Shared Packages.
  - Ensures end-to-end type safety.
  - Shares DTOs, entity interfaces, and enum contracts across apps.
  - Compiles down to standard JavaScript running in modern browsers and Node.js.

### 2.2 Frontend (Web Client)
- **Framework**: **Next.js 15** (App Router architecture)
- **Library**: **React 19**
- **Styling**: **Tailwind CSS v3** + **Radix UI** primitives (accessible UI component primitives)
- **Icons**: **Lucide React**
- **Runtime Environment**: Node.js (for Server-Side Rendering / SSR & Server Components) and Browser ECMAScript.
- **State & Communication**: React Context (`AuthContext`), custom typed HTTP client (`fetch` wrapper with Bearer token injection).

### 2.3 Backend (Application Server)
- **Framework**: **NestJS 10** (enterprise Node.js framework adhering to modular architecture, dependency injection, and decorators)
- **HTTP Server**: **Express** (underlying engine for NestJS)
- **Runtime Environment**: **Node.js (>= 18)**
- **Validation & Serialization**: `class-validator` and `class-transformer`
- **Documentation**: **Swagger / OpenAPI Specification (v3)**
- **Authentication**: `@nestjs/jwt`, `bcryptjs` (password hashing with salt factor 10)

### 2.4 Data Persistence & External Services
- **Database Engine**: **PostgreSQL 15+**
- **ORM / Query Builder**: **Prisma ORM v5** (schema-first, type-safe database client and migrations)
- **Cloud Storage**: **Supabase Storage** (stores attachments, medical leave certificates, module documents; with local mock fallback)
- **Email Delivery**: **Resend API** (transactional email for invitations and password resets)
- **Containerization**: **Docker & Docker Compose** (for local PostgreSQL instance)

---

## 3. High-Level System Architecture Diagram

```
                                  +------------------------------------+
                                  |            CLIENT TIER             |
                                  |   Next.js 15 (React 19, TSX)       |
                                  +------------------------------------+
                                                     |
                                                     | HTTPS / REST (JSON)
                                                     | Authorization: Bearer <JWT>
                                                     v
                                  +------------------------------------+
                                  |            GATEWAY / API           |
                                  |    NestJS Global Guards & Pipes    |
                                  |   - ValidationPipe                 |
                                  |   - JwtAuthGuard                   |
                                  |   - RolesGuard (RBAC)              |
                                  +------------------------------------+
                                                     |
                         +---------------------------+---------------------------+
                         |                           |                           |
                         v                           v                           v
             +-----------------------+   +-----------------------+   +-----------------------+
             |      Core Domain      |   |   Operations Domain   |   |   Platform Services   |
             |-----------------------|   |-----------------------|   |-----------------------|
             | - AuthModule          |   | - AttendanceModule    |   | - NotificationsModule |
             | - UsersModule         |   | - LeaveRequestsModule |   | - AuditLogsModule     |
             | - CompaniesModule     |   | - TrainingPlansModule |   | - SupportTicketsModule|
             | - TeamsModule         |   | - EventsModule        |   | - DashboardModule     |
             +-----------------------+   +-----------------------+   +-----------------------+
                         |                           |                           |
                         +---------------------------+---------------------------+
                                                     |
                                                     v
                                  +------------------------------------+
                                  |            DATA ACCESS             |
                                  |             Prisma ORM             |
                                  +------------------------------------+
                                        |                        |
                                        v                        v
                         +----------------------------+   +----------------------------+
                         |   PostgreSQL Database      |   |   External Cloud Services  |
                         |   (15 Models, 12 Enums,    |   |   - Supabase Object Store  |
                         |    Indexes, Foreign Keys)  |   |   - Resend Transactional   |
                         +----------------------------+   +----------------------------+
```

---

## 4. API Architecture & Theoretical Explanation

### 4.1 What Type of API is Used?
The system utilizes a **RESTful Web API** (Representational State Transfer) communicating over **HTTP/HTTPS** using **JSON** (JavaScript Object Notation) as its data interchange format.

### 4.2 Key REST Principles Implemented
1. **Stateless Communication**:
   - The server does not store user session state in server memory.
   - Each HTTP request contains all necessary context (authentication token and parameters) to be fulfilled independently.
2. **Resource-Oriented URIs**:
   - URIs represent domain resources (nouns, plurals):
     - `/api/companies`
     - `/api/users`
     - `/api/attendance`
     - `/api/leave-requests`
     - `/api/training-plans`
3. **Standard HTTP Methods (CRUD Semantics)**:
   - `GET`: Retrieve resource data (idempotent, safe).
   - `POST`: Create a new resource or initiate an operation (e.g. login, check-in).
   - `PATCH`: Partially update existing resource fields (e.g. update status, approve leave).
   - `DELETE`: Remove a resource or mark as deleted (soft-delete).
4. **Standardized HTTP Status Codes**:
   - `200 OK`: Successful retrieval or update.
   - `201 Created`: Resource successfully created.
   - `400 Bad Request`: Validation failure or malformed payload.
   - `401 Unauthorized`: Missing or invalid JWT credentials.
   - `403 Forbidden`: Authenticated user lacks permission (RBAC violation).
   - `404 Not Found`: Target resource does not exist.
   - `500 Internal Server Error`: Unhandled server exception.

### 4.3 Why Include an API Theory Section in Project Reports?
When writing a senior project, thesis, or technical report, including a concise theoretical grounding of APIs provides the following benefits:
- **Validates Architecture Choices**: Explains why a decoupled Client-Server architecture was selected instead of a monolithic tightly-coupled web app (e.g. frontend and backend can scale and evolve independently; the same API can power mobile apps in the future).
- **Academic & Engineering Rigor**: Demonstrates understanding of software engineering paradigms—separation of concerns, stateless scalability, contract-driven development via OpenAPI/Swagger.
- **Security Justification**: Justifies token-based authentication (JWT) over legacy cookie-session patterns for distributed APIs.

---

## 5. Security & Authentication Architecture

### 5.1 Dual-Token Authentication Pattern
1. **Access Token (Short/Medium-lived, JWT)**:
   - Signed with `JWT_SECRET`.
   - Carries identity payload: `sub` (User ID), `email`, `role`, and `companyId`.
   - Transmitted in the HTTP `Authorization: Bearer <token>` header.
2. **Refresh Token (Long-lived, 30 days)**:
   - Stored securely in PostgreSQL database (`refresh_tokens` table) tied to the user.
   - Used to generate fresh access tokens without requiring the user to re-enter credentials.

### 5.2 Role-Based Access Control (RBAC)
User permissions are strictly enforced at the API layer via NestJS decorators (`@Roles(...)`) and `RolesGuard`:

| Role | Scope & Permissions |
|---|---|
| **SUPER_ADMIN** | Global access across all companies, configuration, audit logs, and users. |
| **BD_TEAM** | Manages partner companies, assigns teams, oversees mentors and students. |
| **MENTOR** | Manages assigned interns, reviews daily attendance, approves leave, tracks training progress. |
| **STUDENT** | Accesses personal profile, clocks attendance (check-in/out), requests leave, accesses training modules. |

### 5.3 Audit Trail
All security-critical actions (`CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`) write append-only records to `audit_logs` storing timestamps, IP address, User-Agent, previous state, and modified state.

---

## 6. Monorepo Structure (`turborepo`)

```
internship-management/
├── apps/
│   ├── api/                  # NestJS REST Backend (Port 4000)
│   │   ├── src/
│   │   │   ├── auth/         # Authentication & JWT strategy
│   │   │   ├── users/        # User accounts & invites
│   │   │   ├── companies/    # Partner companies
│   │   │   ├── teams/        # Departmental teams
│   │   │   ├── attendance/   # Daily clock-in/out & reports
│   │   │   ├── leave-requests/ # Leave submissions & workflows
│   │   │   ├── training-plans/ # Modules & student progress
│   │   │   ├── events/       # Calendar events & announcements
│   │   │   ├── notifications/# User notifications
│   │   │   ├── audit-logs/   # Immutable audit trail
│   │   │   ├── support-tickets/ # Helpdesk ticketing
│   │   │   ├── dashboard/    # Aggregated metrics per role
│   │   │   ├── storage/      # Supabase object storage client
│   │   │   ├── email/        # Resend email transport
│   │   │   └── prisma/       # Prisma service provider
│   │   └── main.ts           # Global pipes, Swagger setup, CORS
│   │
│   └── web/                  # Next.js 15 Frontend (Port 3000)
│       └── src/
│           ├── app/          # App Router routes & layouts
│           ├── components/   # Radix + Tailwind reusable components
│           └── lib/          # Typed API client, Auth Context, Utilities
│
├── packages/
│   ├── database/             # Prisma schema, migrations, seed script
│   ├── types/                # Shared TypeScript contracts & DTO types
│   ├── config-eslint/        # Shared ESLint configuration
│   ├── config-typescript/    # Shared tsconfig base files
│   └── config-prettier/      # Code formatting rules
│
├── docker-compose.yml        # PostgreSQL service definition
└── turbo.json                # Pipeline caching & task dependency graph
```

---

## 7. Data Flow Walkthrough (Example: Student Check-in)

```
[Student Device]
       |
       | 1. Clicks "Check In" button
       v
[Next.js Client (apps/web)]
       |
       | 2. Obtains JWT from localStorage
       | 3. Sends HTTP POST /api/attendance/check-in with Bearer Token & Location
       v
[NestJS API (apps/api)]
       |
       | 4. JwtAuthGuard validates token signature & expiration
       | 5. RolesGuard checks if role == 'STUDENT'
       | 6. ValidationPipe validates DTO schema
       | 7. AttendanceService checks business logic:
       |      - Is check-in duplicate for today?
       |      - Is timestamp before/after cutoff (PRESENT vs LATE)?
       v
[Prisma ORM & PostgreSQL]
       |
       | 8. Inserts record into `attendances` table
       | 9. Writes entry into `audit_logs`
       v
[NestJS API]
       |
       | 10. Formats response payload { id, status, checkInTime, ... }
       v
[Next.js Client]
       |
       | 11. Updates local UI state and displays success toast
```
