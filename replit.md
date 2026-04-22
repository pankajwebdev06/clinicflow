# Clinic Workflow Automation System

## Overview

A component-based workflow automation system for small city doctor clinics. Built with a modular architecture so features can be added or removed as needed.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + Framer Motion
- **State**: Zustand (auth state)
- **Forms**: React Hook Form + Zod

## Artifacts

### `clinic-auth` (preview path: `/`)
The Auth, Clinic Setup, and Doctor Dashboard component — first and second modules of the system.

**Pages:**
- `/` — Landing entry page (Register or Login)
- `/register` — 4-step clinic registration wizard
  - Step 1: Clinic & Doctor info form + OTP send
  - Step 2: OTP verification
  - Step 3: Choose prescription template (10 layouts)
  - Step 4: Success screen with Clinic Code
- `/login` — Mobile/email OTP login with role-based redirect
- `/doctor` — Doctor Dashboard (auth-protected)

**Doctor Dashboard Features:**
- Tab 1: Current Patient screen with token/queue status, patient info, vitals, symptoms, last visit summary
- Tab 2: Daily Summary with stats (total/completed/waiting/cancelled, avg consultation time)
- 3 action buttons: DONE (mark complete → load next), NEXT (push to end of queue), CANCEL (with confirmation popup)
- Live consultation timer showing time spent with current patient
- "View History" modal showing last 5 visits for the patient
- "Next patient" preview bar
- Auto-polling every 10 seconds for queue updates
- Online/offline status indicator
- Demo seed button when queue is empty (loads 5 demo patients)

**Flows:**
- Doctor registers clinic → auto clinic code generated → auto login → Doctor Dashboard
- Login → OTP verify → role check → dashboard routing
  - Doctor → `/doctor` Dashboard
  - Receptionist → Reception Dashboard (future)
  - Admin → Admin Panel (future)

### `api-server` (preview path: `/api`)
Shared Express 5 backend serving all clinic APIs.

**Routes:**
- `POST /api/auth/send-otp` — Send OTP (dev mode: returns OTP in response)
- `POST /api/auth/verify-otp` — Verify OTP + login
- `POST /api/clinic/register` — Register new clinic
- `GET /api/clinic/:id` — Get clinic details
- `PATCH /api/clinic/:id/template` — Update template selection
- `GET /api/templates` — List 10 prescription templates
- `GET /api/doctor/dashboard` — Doctor dashboard data (auth required)
- `POST /api/doctor/visit/:id/done` — Mark visit complete, load next
- `POST /api/doctor/visit/:id/next` — Push visit to end of queue
- `POST /api/doctor/visit/:id/cancel` — Cancel visit
- `GET /api/doctor/patient/:id/history` — Patient visit history
- `POST /api/doctor/demo-seed` — Seed demo patients for testing

**Middleware:**
- `middleware/auth.ts` — Bearer token auth middleware (decodes base64 token, looks up user)

## Database Tables

- `clinics` — Clinic profile data
- `users` — Doctor/receptionist/admin user accounts
- `otps` — OTP records (mobile, purpose, expires_at, used)
- `prescription_templates` — 10 pre-seeded template options
- `patients` — Patient master records (name, mobile, age, gender, upid, clinic_id)
- `visits` — Each clinic visit/appointment (queue management, status, vitals, symptoms)

**Visit statuses:** `waiting` → `in_progress` → `completed` | `cancelled`

## Key Notes

- **OTP in dev mode**: OTP is returned in the send-otp API response message for development testing
- **Clinic Code format**: `DOCTORNAME` + 4 random digits (e.g., `MEHRA2847`)
- **Auth token**: Base64-encoded simple token stored in localStorage (production should use JWT)
- **Auth middleware**: Decodes `userId:mobile:timestamp` base64 token
- **Doctor dashboard polling**: 10 second refetch interval via React Query
- **Component-based**: Each major workflow (reception, prescriptions, etc.) will be its own module
- **Patient UPID format**: `CF` + clinic_id padded + patient sequence (e.g., `CF0010012`)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
