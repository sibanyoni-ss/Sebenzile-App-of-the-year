# LawCompass Production Backend API Service

This backend service implements the production requirements specified in the **LawCompass Backend Requirements (Version 1.0)** document.

## 1. Architectural Separation: Why Public Frontend & Backend Are Separated

```
┌─────────────────────────┐               ┌──────────────────────────────────────┐
│  Public Web Client UI   │  HTTP / REST  │      LawCompass API Service (Node)     │
│  (Browser: Untrusted)   │ ────────────> │         (Server: Trusted)            │
│                         │   JWT Bearer  │                                      │
│  - No Secret Keys       │               │  - Enforces Business Logic & POPIA   │
│  - Client Validation    │               │  - Verifies JWT & Audit Events       │
│  - Accessible Messages  │               │  - Coordinates Paystack Webhooks     │
└─────────────────────────┘               └──────────────────┬───────────────────┘
                                                             │
                                   ┌─────────────────────────┴────────────────────────┐
                                   │                                                  │
                                   ▼                                                  ▼
                     ┌───────────────────────────┐                      ┌───────────────────────────┐
                     │    Supabase PostgreSQL    │                      │   Supabase Private S3     │
                     │  (Row Level Security RLS) │                      │      Object Storage       │
                     │                           │                      │                           │
                     │ - User isolated rows      │                      │ - Quarantined uploads     │
                     │ - Immutable audit events  │                      │ - Signed temporary URLs   │
                     │ - Versioned templates     │                      │ - Encrypted at rest       │
                     └───────────────────────────┘                      └───────────────────────────┘
```

### Why Secrets Must NEVER Live in the Frontend:
1. **The Browser is an Untrusted Environment:** Any JavaScript, environment variable, or configuration bundle sent to a web browser can be inspected, extracted, or altered via Developer Tools and memory scrapers.
2. **The Danger of `SUPABASE_SERVICE_ROLE_KEY`:** Supabase provides two primary keys:
   - `SUPABASE_ANON_KEY`: Safe for the public client because requests are strictly constrained by PostgreSQL **Row Level Security (RLS)** policies.
   - `SUPABASE_SERVICE_ROLE_KEY`: **Bypasses all RLS policies entirely.** If exposed in the frontend, any user could read, delete, or alter any other user's confidential legal contracts!
3. **South African POPIA & Privacy-by-Design:** Contracts contain sensitive South African Identity numbers, physical addresses, executive salaries, and last wills. Under POPIA Section 19, storing secret credentials in a public bundle is a direct regulatory violation.
4. **Payment & Webhook Integrity:** The public client must never decide whether a customer has paid. Only the backend can cryptographically verify webhook signatures from payment providers like Paystack (`x-paystack-signature`).

---

## 2. Setting Up `.env` with Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Go to **Project Settings** -> **API**:
   - Copy **Project URL** -> `SUPABASE_URL`
   - Copy **anon public key** -> `SUPABASE_ANON_KEY`
   - Copy **service_role secret** -> `SUPABASE_SERVICE_ROLE_KEY` (Backend only!)
   - Copy **JWT Secret** -> `SUPABASE_JWT_SECRET`
3. Go to **Storage**:
   - Create a bucket named `contracts`. Ensure **Public bucket** is **UNCHECKED** (false).
4. Run the SQL schema in `supabase_schema.sql` via the Supabase SQL Editor.
5. Create your `.env` file in this `backend/` folder:

```bash
cp .env.example .env
```

---

## 3. Running the Backend Service

```bash
cd backend
npm install
npm run dev
```

The service will start on `http://localhost:3000`.
Health check: `http://localhost:3000/health`
API Base: `http://localhost:3000/api/v1`

---

## 4. API Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | User registration with input validation |
| `POST` | `/api/v1/auth/login` | Issues short-lived access token & refresh session |
| `GET` | `/api/v1/auth/me` | Current authenticated user profile |
| `GET` | `/api/v1/templates` | Lists active legal templates |
| `POST` | `/api/v1/documents/drafts` | Saves draft answers and custom clauses |
| `POST` | `/api/v1/documents/:id/lock` | **Locks document with SHA-256 tamper-evident seal** |
| `GET` | `/api/v1/legal-help/firms` | **Returns law firms sorted by proximity to user** |
| `POST` | `/api/v1/uploads/initiate` | Initiates signed quarantined upload |
| `POST` | `/api/v1/uploads/:id/explain` | Segments clauses and extracts plain-English analysis |
| `POST` | `/api/v1/billing/checkout` | Provider-hosted checkout session (Paystack) |
| `POST` | `/api/v1/billing/webhook` | Verified cryptographic webhook handler |

