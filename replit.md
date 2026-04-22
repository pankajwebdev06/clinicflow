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
The Auth & Clinic Setup component — first module of the system.

**Pages:**
- `/` — Landing entry page (Register or Login)
- `/register` — 4-step clinic registration wizard
  - Step 1: Clinic & Doctor info form + OTP send
  - Step 2: OTP verification
  - Step 3: Choose prescription template (10 layouts)
  - Step 4: Success screen with Clinic Code
- `/login` — Mobile/email OTP login with role-based redirect

**Flows:**
- Doctor registers clinic → auto clinic code generated → auto login → Doctor Dashboard
- Login → OTP verify → role check → dashboard routing
  - Doctor → Doctor Dashboard
  - Receptionist → Reception Dashboard
  - Admin → Admin Panel

### `api-server` (preview path: `/api`)
Shared Express 5 backend serving all clinic APIs.

**Routes:**
- `POST /api/auth/send-otp` — Send OTP (dev mode: returns OTP in response)
- `POST /api/auth/verify-otp` — Verify OTP + login
- `POST /api/clinic/register` — Register new clinic
- `GET /api/clinic/:id` — Get clinic details
- `PATCH /api/clinic/:id/template` — Update template selection
- `GET /api/templates` — List 10 prescription templates

## Database Tables

- `clinics` — Clinic profile data
- `users` — Doctor/receptionist/admin user accounts
- `otps` — OTP records (mobile, purpose, expires_at, used)
- `prescription_templates` — 10 pre-seeded template options

## Key Notes

- **OTP in dev mode**: OTP is returned in the send-otp API response message for development testing
- **Clinic Code format**: `DOCTORNAME` + 4 random digits (e.g., `MEHRA2847`)
- **Auth token**: Base64-encoded simple token stored in localStorage (production should use JWT)
- **Component-based**: Each major workflow (reception, prescriptions, etc.) will be its own module

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Architecture Notes

- `lib/api-zod/package.json` exports `./src/generated/api.ts` directly (not `src/index.ts`) to avoid orval-generated index conflicts
- `lib/api-zod/tsconfig.json` includes only `src/generated/**/*`
- Orval zod config uses `mode: "single"` targeting `src/generated/api.ts` directly
