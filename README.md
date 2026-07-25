# Library SaaS — Complete Technical Documentation

> **Status:** Phase 12 (Data Migration) — Production ready for first real library client  
> **Last updated:** April 2026  
> **Stack:** Next.js 16 App Router · Supabase (Mumbai ap-south-1) · Tailwind CSS v4 · Zustand · Vercel  
> **Language:** JavaScript (no TypeScript)  
> **Repo:** GitHub private → Vercel auto-deploys `main` branch

---

## Table of Contents

1. [What This Product Is](#1-what-this-product-is)
2. [Business Model](#2-business-model)
3. [Architecture Overview](#3-architecture-overview)
4. [Database Schema](#4-database-schema)
5. [Row Level Security (RLS)](#5-row-level-security-rls)
6. [Multi-Tenancy — Library Isolation](#6-multi-tenancy--library-isolation)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [File Structure](#8-file-structure)
9. [Data Flow — Server vs Client](#9-data-flow--server-vs-client)
10. [Core Logic — Fee Status Computation](#10-core-logic--fee-status-computation)
11. [Core Logic — Date Handling (Critical)](#11-core-logic--date-handling-critical)
12. [Core Logic — Prorated Fees](#12-core-logic--prorated-fees)
13. [API Routes](#13-api-routes)
14. [Zustand Stores](#14-zustand-stores)
15. [Component Architecture](#15-component-architecture)
16. [Page-by-Page Reference](#16-page-by-page-reference)
17. [Realtime — Seat Map Live Updates](#17-realtime--seat-map-live-updates)
18. [Performance Architecture](#18-performance-architecture)
19. [JWT Claims — Custom Access Token Hook](#19-jwt-claims--custom-access-token-hook)
20. [Key Architectural Decisions](#20-key-architectural-decisions)
21. [Known Bugs Fixed](#21-known-bugs-fixed)
22. [Phase History](#22-phase-history)
23. [Onboarding a New Library](#23-onboarding-a-new-library)
24. [Data Migration Playbook](#24-data-migration-playbook)
25. [Environment Variables](#25-environment-variables)
26. [Deployment](#26-deployment)

---

## 1. What This Product Is

A **mobile-first SaaS web application** for managing study library seat bookings and monthly fee collection in Tier-3 cities in India (Kushinagar region, Uttar Pradesh).

### The Real Problem It Solves

Study libraries ("reading halls") rent physical seats to students by the month. Each seat has morning and evening shifts — two different people can share one seat. The librarian's daily pain points before this system:

- Could not tell at a glance which seats are free vs occupied
- Had to flip through a physical register to check payment status
- Could not track which of 3 co-owner partners collected which payments
- Could not quickly check who is overdue vs in grace period vs paid

### What the System Does

- **Seat map** — visual grid of all seats, green = free, red = occupied. Top half = morning, bottom half = evening. Tap any seat to see who sits there, free it, or assign it.
- **Members list** — searchable list with real-time fee status badges (Paid / Grace / Overdue / Unpaid). Filters: All, Overdue, Grace, Unpaid, Paid, Inactive.
- **Member profile** — complete history: allocation history, payment history, fee status, next payment period, quick record payment button.
- **Dashboard** — daily summary: active members, seats occupied, collected this month, unpaid count, overdue members list, expiring this week, recent activity.
- **Reports** — month selector, collection rate, per-partner breakdown (who collected what), paid list, unpaid list, WhatsApp share of full report.
- **Payments ledger** — every single payment ever recorded, grouped by month, searchable by member or partner name.
- **Settings** — library config, partner management, seat management, fee structure history.

### First Client

**Gyaan Study Library, Kushinagar, UP**
- 56 seats
- 3 co-owner partners (primary + 2 viewers)
- Fee structure: Morning ₹500/month, Evening ₹500/month, Full time ₹900/month

---

## 2. Business Model

- **Current:** One-time setup fee + annual renewal. Targeting restaurants and schools in Tier-3 UP cities.
- **SaaS structure:** Each library is an isolated tenant in one shared Supabase project. Multi-tenant from day one — all tables have `library_id`.
- **Pricing plans stored in DB:** `trial`, `basic`, `pro` (in `libraries.plan` column). Plan enforcement not yet built.
- **No subscription UI yet.** New libraries are onboarded manually via Supabase SQL Editor.
- **Long term:** Onboarding flow, plan enforcement, billing integration, native app.

---

## 3. Architecture Overview

```
Browser (mobile-first PWA)
    │
    ├── Next.js App Router (Vercel serverless)
    │       ├── Server Components → direct Supabase queries (GET operations)
    │       ├── API Routes → Supabase mutations (POST/PATCH/DELETE only)
    │       ├── proxy.js (middleware) → auth guard on every request
    │       └── React cache() → deduplicates partner fetch per request
    │
    ├── Supabase (ap-south-1, Mumbai)
    │       ├── PostgreSQL database
    │       ├── Row Level Security (RLS) on all tables
    │       ├── Auth (JWT, custom access token hook embeds library_id)
    │       ├── Realtime (WebSocket on seat_allocations table)
    │       └── Storage (future: member photos)
    │
    └── Client Side
            ├── Zustand (useAppStore, useSeatsStore, useUIStore)
            ├── TanStack Query (members list navigation cache only)
            └── Supabase Realtime client (seat map live updates)
```

### Key Principle: Server-Authoritative

- **GET operations → Server Components only.** No client-side fetching for page data.
- **Writes → API routes only.** No direct Supabase calls from client components for mutations.
- **Every protected page** runs through `proxy.js` middleware which calls `supabase.auth.getUser()` (not `getSession()` — important distinction explained in §7).

---

## 4. Database Schema

### Table: `libraries`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `name` | text | Library display name |
| `address` | text | Physical address |
| `phone` | text | Contact number |
| `morning_cutoff_time` | time | When morning shift ends (default 13:00) |
| `grace_period_days` | int | Days after due date before "overdue" (default 10) |
| `no_show_days` | int | Days absent before assumed left (default 7) |
| `plan` | text | `trial` / `basic` / `pro` |
| `plan_expires_at` | timestamptz | |
| `deleted_at` | timestamptz | Soft delete |
| `created_at` / `updated_at` | timestamptz | |

### Table: `partners`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `library_id` | uuid FK → libraries | Multi-tenant key |
| `auth_user_id` | uuid | Supabase Auth user UID |
| `name` | text | Display name |
| `phone` | text | |
| `role` | text | `primary` or `viewer` |
| `is_active` | bool | False = cannot log in |
| `deleted_at` | timestamptz | Soft delete |

**Business rule:** At least one `primary` must always exist per library. Cannot deactivate yourself. Cannot change your own role.

### Table: `seats`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `library_id` | uuid FK | |
| `seat_number` | int | Physical seat number |
| `row_label` | text | Optional — e.g. "Window Row" |
| `is_active` | bool | Inactive = hidden from seat map |
| `deleted_at` | timestamptz | Soft delete |

**Constraint:** `unique(library_id, seat_number)` — no duplicate seat numbers per library.

### Table: `members`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `library_id` | uuid FK | |
| `name` | text | |
| `phone` | text | 10 digits, unique per library |
| `address` | text | |
| `aadhar_last4` | text | Last 4 digits only |
| `photo_url` | text | Future use |
| `join_date` | date | Critical — used for proration calculation |
| `status` | text | `active` or `inactive` |
| `notes` | text | |
| `deleted_at` | timestamptz | Soft delete |

**Business rule:** `phone` must be unique per `library_id`. A member from Library A can have the same phone as a member from Library B — the unique constraint is scoped to library.

### Table: `seat_allocations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `library_id` | uuid FK | |
| `seat_id` | uuid FK → seats | |
| `member_id` | uuid FK → members | |
| `shift` | text | `morning`, `evening`, or `fulltime` |
| `start_date` | date | |
| `end_date` | date | Null = currently active |
| `is_active` | bool | True = current allocation |
| `created_by_partner_id` | uuid FK → partners | Audit trail |
| `deleted_at` | timestamptz | |

**Conflict prevention:** Three partial unique indexes prevent double-booking:
- `unique(seat_id, shift)` where `is_active = true` and `shift = 'morning'`
- `unique(seat_id, shift)` where `is_active = true` and `shift = 'evening'`
- `unique(seat_id)` where `is_active = true` and `shift = 'fulltime'`

Additionally the `create_member_with_allocation()` RPC checks for conflicts before inserting.

### Table: `fee_structures`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `library_id` | uuid FK | |
| `morning_fee` | numeric | |
| `evening_fee` | numeric | |
| `fulltime_fee` | numeric | |
| `valid_from` | date | When this fee structure became effective |
| `valid_until` | date | Null = currently active |
| `created_by_partner_id` | uuid FK | |

**Immutable history pattern:** Fees are NEVER updated in place. A new row is inserted with a new `valid_from`. The previous row gets `valid_until = new_valid_from - 1 day`. This preserves complete fee history. Historical payments always reflect the fee that was valid when they were recorded.

**Business rule:** Effective date cannot be in the past. Only one row per library can have `valid_until = null` at any time.

### Table: `fee_payments`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `library_id` | uuid FK | |
| `member_id` | uuid FK → members | |
| `amount_paid` | numeric | Actual amount, may differ from fee structure (partial, prorated) |
| `period_start_date` | date | First day this payment covers |
| `period_end_date` | date | Last day this payment covers |
| `paid_on` | date | Actual payment date |
| `payment_mode` | text | `cash` or `upi` |
| `is_prorated` | bool | True if first payment was mid-month |
| `days_covered` | int | For prorated payments |
| `collected_by_partner_id` | uuid FK → partners | Who received the cash |
| `notes` | text | Optional librarian note |
| `deleted_at` | timestamptz | Soft delete |

**Critical:** Fee status is NEVER stored. It is always computed in real-time from payment records via `computeFeeStatus()`. See §10.

**Duplicate prevention:** API checks for existing payment with same `period_start_date` + `period_end_date` + `member_id` before inserting.

### Table: `member_status_logs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `library_id` | uuid FK | |
| `member_id` | uuid FK | |
| `old_status` | text | |
| `new_status` | text | |
| `changed_by_partner_id` | uuid FK | |
| `reason` | text | e.g. "7 days no show" |
| `created_at` | timestamptz | |

### Table: `notifications`

Planned for future use — not yet implemented in UI.

### Table: `audit_logs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `library_id` | uuid FK | |
| `partner_id` | uuid FK | Who performed the action |
| `action` | text | e.g. `create_member`, `record_payment`, `end_allocation` |
| `entity_type` | text | e.g. `member`, `seat_allocation` |
| `entity_id` | uuid | ID of the affected record |
| `old_data` | jsonb | State before the change |
| `new_data` | jsonb | State after the change |
| `created_at` | timestamptz | |

Every write operation calls `writeAuditLog()` from `lib/audit.js`. Used by the dashboard Recent Activity section. Action strings: `create_member`, `record_payment`, `mark_member_inactive`, `end_allocation`, `assign_seat`, `update_member`, `delete_member`, `update_library_settings`, `create_partner`, `update_partner`, `add_seats`, `update_seat`, `update_fee_structure`.

### RPC: `create_member_with_allocation()`

Atomic Postgres function that:
1. Checks for phone uniqueness within the library
2. Checks for seat+shift conflict
3. Inserts the `members` row
4. Inserts the `seat_allocations` row

Used by the Add Member flow so both inserts are atomic — impossible to have a member with no allocation or an allocation with no member due to a partial failure.

### Function: `get_my_library_id()`

```sql
create or replace function get_my_library_id()
returns uuid language sql stable security definer as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'library_id')::uuid,  -- fast path: JWT claim
    (select library_id from partners                          -- fallback: DB query
     where auth_user_id = auth.uid()
       and is_active = true and deleted_at is null limit 1)
  );
$$;
```

Used by every RLS policy. After the custom access token hook is set up (§19), this reads from the JWT claim (O(1), zero DB cost). The fallback DB query handles the edge case of a session before the hook was configured.

---

## 5. Row Level Security (RLS)

RLS is enabled on all 10 tables. Every policy calls `get_my_library_id()` to scope data to the current user's library.

### Pattern for all tables

```sql
-- SELECT: only see your library's rows
create policy "library_isolation_select" on members
  for select using (library_id = get_my_library_id());

-- INSERT: only insert into your library
create policy "library_isolation_insert" on members
  for insert with check (library_id = get_my_library_id());

-- UPDATE: only update your library's rows
create policy "library_isolation_update" on members
  for update using (library_id = get_my_library_id());
```

### Role-based write restrictions

For operations that require `primary` role (e.g. creating members, recording payments, changing settings), the restriction is enforced at the **API route level** via `requirePrimary(partner)`, not at the RLS level. RLS handles library isolation; API routes handle role authorization. This is intentional — it gives clearer error messages than RLS rejections and keeps RLS policies simple.

### Indexes for RLS performance

```sql
create index on partners(auth_user_id);           -- get_my_library_id() lookup
create index on members(library_id);
create index on seat_allocations(library_id, is_active);
create index on fee_payments(library_id);
create index on fee_payments(member_id, period_end_date desc);
```

---

## 6. Multi-Tenancy — Library Isolation

Every table has `library_id uuid not null`. Every query from the app includes `.eq('library_id', libraryId)` in addition to RLS enforcement. This double-isolation means:

- A bug in RLS policies still has application-level protection
- A bug in application queries still has RLS protection
- Two libraries in the same database are completely invisible to each other

**Seat numbers are library-scoped:** Library A can have Seat 1. Library B can also have Seat 1. They are different physical seats at different locations.

**Partner emails are Supabase Auth global:** A person's email is unique in Supabase Auth across all libraries. But their `partners` row is scoped to one library. In the future, the same person could be a partner in multiple libraries (different `partners` rows, same `auth_user_id`). The `get_my_library_id()` function returns the first matching library — for now this is fine since partners only belong to one library.

**Test library vs production library:** During development, a test library was created alongside the real library. They share the same Supabase project but are completely isolated by `library_id`. The developer uses the test library for feature testing; the librarian uses the real library for production data. This is the equivalent of a staging environment without the cost of a separate project.

---

## 7. Authentication & Authorization

### Login Flow

1. User enters email + password on `/login`
2. `supabase.auth.signInWithPassword()` called from client
3. Supabase Auth validates credentials, mints JWT, sets cookie
4. Client redirects to `/dashboard`
5. `proxy.js` middleware intercepts every subsequent navigation

### Middleware — proxy.js

```
Every request → proxy.js
    → supabase.auth.getUser()  ← validates token with Supabase Auth server
    → if no valid user AND not /login → redirect to /login
    → if valid user AND on /login → redirect to /dashboard
    → else → allow request through
```

**Critical:** Uses `getUser()` NOT `getSession()`. `getSession()` reads from the cookie cache and can return a valid session for a revoked token until JWT expiry (~1 hour). `getUser()` always validates with the Supabase Auth server — adds ~50-100ms but ensures deactivated partners cannot access the system within seconds of being deactivated.

### Double Auth Check

Every protected Server Component also calls `supabase.auth.getUser()` independently. This is intentional redundancy — middleware can be bypassed in some edge cases; the page-level check is the true security gate.

### Role System

Two roles: `primary` and `viewer`.

| Action | Primary | Viewer |
|--------|---------|--------|
| View all data | ✓ | ✓ |
| Add member | ✓ | ✗ |
| Record payment | ✓ | ✗ |
| Free seat | ✓ | ✗ |
| Assign seat | ✓ | ✗ |
| Mark member inactive | ✓ | ✗ |
| Change settings | ✓ | ✗ |
| Add/edit partners | ✓ | ✗ |

Enforced by `requirePrimary(partner)` in every write API route. The `RoleGuard` component hides write UI from viewers but does not rely on this for security — the API routes are the real enforcement point.

### lib/auth.js

```javascript
export async function getPartner(supabase) {
  // Calls getUser() for token validation
  // Queries partners table for role and library_id
  // Verifies library exists and is not deleted
  // Returns { partner, error }
}

export function requirePrimary(partner) {
  if (partner.role !== 'primary') return { error: 'Only primary partners can do this' }
  return { error: null }
}
```

### lib/getPartnerData.js — React cache()

```javascript
import { cache } from 'react'

export const getPartnerData = cache(async () => {
  // React's cache() deduplicates this within one server request
  // layout.jsx calls it → page.jsx calls it → only ONE DB query runs
  // Cache is request-scoped: dies after request, never leaks between users
})
```

Every page and the layout both call `getPartnerData()`. Without `cache()`, each call would hit the database separately. With `cache()`, the first call queries the DB; subsequent calls within the same request return the in-memory result.

---

## 8. File Structure

```
library-saas/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.jsx              ← Login page (client component)
│   ├── (app)/                        ← All protected pages
│   │   ├── layout.jsx                ← Fetches partner+library, renders AppShell
│   │   ├── dashboard/
│   │   │   ├── page.jsx              ← Server component, 5 parallel queries
│   │   │   ├── loading.jsx           ← Skeleton shown during navigation
│   │   │   └── _components/
│   │   │       ├── StatCards.jsx
│   │   │       ├── OverdueList.jsx
│   │   │       ├── ExpiringList.jsx
│   │   │       └── RecentActivity.jsx
│   │   ├── seats/
│   │   │   ├── page.jsx              ← 2 parallel queries (no fee query)
│   │   │   ├── loading.jsx
│   │   │   └── _components/
│   │   │       ├── SeatMapClient.jsx ← 'use client', Zustand + Realtime
│   │   │       ├── SeatGrid.jsx
│   │   │       ├── SeatCell.jsx
│   │   │       ├── SeatBottomSheet.jsx
│   │   │       └── ShiftSelector.jsx
│   │   ├── members/
│   │   │   ├── page.jsx              ← 3 parallel queries
│   │   │   ├── loading.jsx
│   │   │   ├── _components/
│   │   │   │   └── MembersClient.jsx ← 'use client', TanStack Query cache
│   │   │   ├── new/
│   │   │   │   ├── page.jsx
│   │   │   │   ├── loading.jsx
│   │   │   │   └── _components/
│   │   │   │       ├── AddMemberForm.jsx   ← 3-step form
│   │   │   │       ├── DetailsStep.jsx
│   │   │   │       ├── SeatPickerStep.jsx
│   │   │   │       ├── ConfirmStep.jsx
│   │   │   │       └── StepIndicator.jsx
│   │   │   └── [id]/
│   │   │       ├── page.jsx          ← 5 parallel queries
│   │   │       ├── _components/
│   │   │       │   ├── MemberHeader.jsx
│   │   │       │   ├── FeeSection.jsx
│   │   │       │   ├── MemberActions.jsx  ← Three-dots sheet
│   │   │       │   ├── PaymentHistory.jsx
│   │   │       │   └── AllocationHistory.jsx
│   │   │       └── pay/
│   │   │           ├── page.jsx      ← 4 parallel queries after member fetch
│   │   │           ├── loading.jsx
│   │   │           └── _components/
│   │   │               └── PaymentForm.jsx ← 'use client'
│   │   ├── reports/
│   │   │   ├── page.jsx              ← 5 parallel queries
│   │   │   ├── loading.jsx
│   │   │   └── _components/
│   │   │       ├── MonthSelectorClient.jsx ← 'use client'
│   │   │       ├── ReportSummary.jsx
│   │   │       ├── PartnerBreakdown.jsx
│   │   │       ├── PaidList.jsx
│   │   │       ├── UnpaidList.jsx
│   │   │       └── ShareButton.jsx   ← WhatsApp share, 'use client'
│   │   ├── payments/
│   │   │   ├── page.jsx              ← All payments, joined with members+partners
│   │   │   ├── loading.jsx
│   │   │   └── _components/
│   │   │       └── PaymentsClient.jsx ← 'use client', search + month grouping
│   │   └── settings/
│   │       ├── page.jsx
│   │       ├── loading.jsx
│   │       ├── _components/
│   │       │   └── LibrarySettingsForm.jsx
│   │       ├── partners/
│   │       │   ├── page.jsx
│   │       │   ├── loading.jsx
│   │       │   └── _components/
│   │       │       └── PartnersManager.jsx
│   │       ├── seats/
│   │       │   ├── page.jsx
│   │       │   ├── loading.jsx
│   │       │   └── _components/
│   │       │       └── SeatsManager.jsx
│   │       └── fees/
│   │           ├── page.jsx
│   │           ├── loading.jsx
│   │           └── _components/
│   │               └── FeeManager.jsx
│   ├── api/
│   │   ├── health/route.js           ← GET, keeps Vercel function warm
│   │   ├── members/
│   │   │   ├── route.js              ← GET (TanStack background refetch), POST (create)
│   │   │   └── [id]/
│   │   │       ├── route.js          ← PATCH (edit details)
│   │   │       ├── status/route.js   ← PATCH (mark inactive)
│   │   │       ├── pay/route.js      ← POST (record payment)
│   │   │       └── assign-seat/route.js ← POST (assign to existing member)
│   │   ├── allocations/
│   │   │   └── [id]/route.js        ← PATCH (free seat)
│   │   ├── seats/
│   │   │   ├── route.js             ← GET (seat picker), POST (add seats)
│   │   │   └── [id]/route.js        ← PATCH (activate/deactivate)
│   │   ├── partners/
│   │   │   ├── route.js             ← GET, POST (create partner)
│   │   │   └── [id]/route.js        ← PATCH (update partner)
│   │   ├── settings/
│   │   │   └── library/route.js     ← PATCH (update library settings)
│   │   └── fee-structures/
│   │       └── route.js             ← GET, POST (create new fee structure)
│   └── manifest.js                  ← PWA manifest (Next.js v4 way)
├── components/
│   ├── layout/
│   │   ├── AppShell.jsx             ← Wraps all protected pages
│   │   ├── TopBar.jsx
│   │   ├── BottomNav.jsx            ← 4 tabs: Dashboard, Seats, Members, Reports
│   │   └── LogoutButton.jsx
│   ├── ui/
│   │   ├── StatCard.jsx
│   │   ├── FeeStatusBadge.jsx       ← Paid/Grace/Overdue/Unpaid
│   │   ├── EmptyState.jsx
│   │   ├── ErrorState.jsx
│   │   ├── RoleGuard.jsx            ← Hides children from viewers
│   │   ├── Toast.jsx
│   │   ├── ConfirmDialog.jsx
│   │   ├── LoadingSpinner.jsx
│   │   └── OfflineBanner.jsx
│   ├── members/
│   │   ├── MemberCard.jsx
│   │   └── MemberSearchBar.jsx
│   └── reports/
│       ├── OverdueMemberRow.jsx
│       └── PartnerCollectionSummary.jsx
├── lib/
│   ├── supabase/
│   │   ├── client.js                ← Browser Supabase client
│   │   └── server.js                ← Server Supabase client (cookies)
│   ├── supabaseAdmin.js             ← Service role client (API routes only)
│   ├── getPartnerData.js            ← React cache() for partner dedup
│   ├── auth.js                      ← getPartner(), requirePrimary()
│   ├── calculations.js              ← computeFeeStatus(), calculateProratedFee(), etc.
│   ├── validators.js                ← Input validation functions
│   └── audit.js                     ← writeAuditLog()
├── stores/
│   ├── useAppStore.js               ← Partner + library data (Zustand)
│   ├── useSeatsStore.js             ← Seat map state (Zustand)
│   └── useUIStore.js                ← Toast, confirm dialog (Zustand)
├── hooks/
│   └── useMembers.js                ← TanStack Query cache for members list
├── providers/
│   ├── QueryProvider.jsx            ← TanStack QueryClient provider
│   ├── RealtimeProvider.jsx         ← Supabase Realtime WebSocket
│   └── AppProviders.jsx             ← Wraps QueryProvider + RealtimeProvider
├── utils/
│   ├── constants.js                 ← ROUTES, FEE_STATUS, SHIFTS, ROLES, etc.
│   └── formatters.js                ← formatDate(), formatCurrency(), toDbDate(), etc.
├── proxy.js                         ← Next.js middleware (auth guard)
├── globals.css                      ← Tailwind v4 @theme block, CSS variables
└── vercel.json                      ← Cron job config for health endpoint
```

---

## 9. Data Flow — Server vs Client

### Rule 1: GET = Server Component

```javascript
// app/(app)/members/page.jsx — Server Component
export default async function MembersPage() {
  const supabase = await createClient()  // server client
  const partnerData = await getPartnerData()  // cached

  const [members, allocations, payments] = await Promise.all([
    supabase.from('members').select(...),
    supabase.from('seat_allocations').select(...),
    supabase.from('fee_payments').select(...),
  ])

  // Compute fee status in JS on server
  // Pass finished data to client component
  return <MembersClient initialMembers={computedMembers} />
}
```

### Rule 2: Writes = API Routes

```javascript
// app/(app)/members/_components/SomeClientComponent.jsx
'use client'

async function handleSomeAction() {
  const res = await fetch('/api/members/123/pay', {
    method: 'POST',
    body: JSON.stringify({ amount_paid: 500, ... })
  })
  // Never: supabase.from('fee_payments').insert() from client
}
```

### Rule 3: Promise.all for independent queries

Every protected page has one unavoidable sequential step: the partner fetch (needed to get `library_id`). After that, all remaining queries are independent and run in parallel.

```javascript
// Sequential (unavoidable):
const partnerData = await getPartnerData()
const libraryId = partnerData.library_id

// Parallel (all independent after we have libraryId):
const [members, allocations, payments, feeStructure, partners] = await Promise.all([
  supabase.from('members').select(...).eq('library_id', libraryId),
  supabase.from('seat_allocations').select(...).eq('library_id', libraryId),
  supabase.from('fee_payments').select(...).eq('library_id', libraryId),
  supabase.from('fee_structures').select(...).eq('library_id', libraryId),
  supabase.from('partners').select(...).eq('library_id', libraryId),
])
```

This reduced TTFB from 2.04s to 0.34s on the production deployment.

---

## 10. Core Logic — Fee Status Computation

**Critical principle: Fee status is NEVER stored in the database. It is always computed from the latest payment record.**

```javascript
// lib/calculations.js
export function computeFeeStatus(lastPayment, gracePeriodDays = 10) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // No payment ever recorded → Unpaid (not Overdue — different meaning)
  if (!lastPayment) {
    return { status: FEE_STATUS.UNPAID, daysOverdue: 0 }
  }

  // Parse as local date components — NEVER new Date(string) which parses UTC
  const [endYear, endMonth, endDay] = lastPayment.period_end_date.split('-').map(Number)
  const periodEnd = new Date(endYear, endMonth - 1, endDay)
  periodEnd.setHours(0, 0, 0, 0)

  // Today is within the paid period → Paid
  if (today <= periodEnd) {
    return { status: FEE_STATUS.PAID, daysOverdue: 0 }
  }

  const daysPastDue = Math.floor((today - periodEnd) / (1000 * 60 * 60 * 24))

  // Within grace period → Grace
  if (daysPastDue <= gracePeriodDays) {
    return { status: FEE_STATUS.GRACE, daysOverdue: daysPastDue, daysLeft: gracePeriodDays - daysPastDue }
  }

  // Beyond grace period → Overdue
  return { status: FEE_STATUS.OVERDUE, daysOverdue: daysPastDue }
}
```

### Fee Status Values

| Status | Meaning | Badge Color |
|--------|---------|-------------|
| `paid` | Today is within their paid period | Green |
| `grace` | Period ended 1–N days ago (within grace) | Amber |
| `overdue` | Period ended and grace period passed | Red |
| `unpaid` | No payment ever recorded | Gray |

`grace_period_days` is configured per library in the `libraries` table and read from `partnerData.libraries.grace_period_days`. Default is 10 days.

### Sort Priority for Member Lists

`overdue: 0` → `grace: 1` → `unpaid: 2` → `paid: 3` → sorted alphabetically within each group.

Within overdue: most days overdue first.  
Within grace: fewest days left first (most urgent first).

---

## 11. Core Logic — Date Handling (Critical)

**The most important technical decision in the entire codebase.**

### The Bug It Prevents

India is IST (UTC+5:30). When you write `new Date('2026-04-30').toISOString().split('T')[0]`:

- `new Date('2026-04-30')` parses as **UTC midnight** = April 29 at 6:30 PM IST
- `.toISOString()` converts back to UTC → `2026-04-29T18:30:00.000Z`
- `.split('T')[0]` → `'2026-04-29'`
- **The date shifted back by 1 day.** Every member's period end date showed as one day early.

### The Fix — Always Parse Date Strings as Local Components

```javascript
// WRONG — parses as UTC, shifts date for IST users
const d = new Date('2026-04-30')

// CORRECT — parses as local date, no UTC shift
const [year, month, day] = '2026-04-30'.split('-').map(Number)
const d = new Date(year, month - 1, day)  // month is 0-indexed in Date constructor
```

```javascript
// WRONG — converts to UTC, shifts back 1 day for IST
const dateStr = someDate.toISOString().split('T')[0]

// CORRECT — formats using local timezone components
function toDbDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
```

### Where This Was Applied

- `lib/calculations.js` — all date arithmetic
- `utils/formatters.js` — `formatDate()`, `formatMonthYear()`, `toDbDate()`
- `app/(app)/members/[id]/page.jsx` — current period calculation
- `app/api/allocations/[id]/route.js` — end_date uses server-side local date
- `app/api/members/[id]/status/route.js` — today's date for inactive timestamp
- All dashboard and reports date comparisons

### Server-Side Date Authority

For mutation API routes (freeing a seat, marking inactive), the date is computed server-side, not trusted from the client. This prevents edge cases where the client's timezone produces a different date than the server's.

```javascript
// In API routes — compute today server-side
function localDateString() {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const istDate = new Date(new Date().getTime() + IST_OFFSET_MS)
  return [
    istDate.getUTCFullYear(),
    String(istDate.getUTCMonth() + 1).padStart(2, '0'),
    String(istDate.getUTCDate()).padStart(2, '0'),
  ].join('-')
}
```


---

## 12. Core Logic — Prorated Fees

When a member joins mid-month, their first payment covers only the remaining days of that month at a prorated rate.

```javascript
export function calculateProratedFee(joinDate, monthlyFee) {
  const [year, month, dayNum] = joinDate.split('-').map(Number)
  const join = new Date(year, month - 1, dayNum)

  const daysInMonth = new Date(year, month, 0).getDate()  // last day of month
  const daysRemaining = daysInMonth - dayNum + 1           // inclusive

  const dailyRate = monthlyFee / daysInMonth
  const rawAmount = daysRemaining * dailyRate
  const amount = Math.round(rawAmount / 10) * 10           // round to nearest ₹10

  const periodEnd = new Date(year, month, 0)               // last day of join month

  return {
    amount,
    daysInMonth,
    daysRemaining,
    periodStart: joinDate,
    periodEnd: toDbDate(periodEnd),
    isProrated: true,
    dailyRate: Math.round(dailyRate),
  }
}
```

**Special case:** If `join_date` is the 1st of the month, `isFirstOfMonth()` returns true and proration is skipped — the full monthly fee is charged and the period covers the entire month.

**The pay page always uses `member.join_date` for first payment**, never today's date. This was a critical bug fixed in Phase 9: the form initially used today's date as the proration reference, causing wrong calculations when the librarian recorded the first payment a day or more after the member joined.

### Next Payment Period

After recording a payment, the next payment period is computed from the last payment's `period_end_date`:

```javascript
export function nextPaymentPeriod(lastPeriodEnd) {
  const [year, month] = lastPeriodEnd.split('-').map(Number)
  const nextStart = new Date(year, month, 1)       // month is already 1-indexed so this is next month's 1st
  const nextEnd = new Date(year, month + 1, 0)     // last day of next month
  return { start: toDbDate(nextStart), end: toDbDate(nextEnd) }
}
```

---

## 13. API Routes

All API routes follow this pattern:
1. Create server Supabase client
2. Call `getPartner()` for auth
3. Call `requirePrimary()` if write operation
4. Parse and validate request body
5. Execute database operation
6. Call `writeAuditLog()`
7. Return response

### Route Reference

| Method | Route | Role | Action |
|--------|-------|------|--------|
| GET | `/api/health` | Public | Returns `{status:'ok', timestamp}` for warm-up |
| GET | `/api/members` | Any | Returns all members with fee status (for TanStack background refetch) |
| POST | `/api/members` | Primary | Creates member via `create_member_with_allocation()` RPC |
| PATCH | `/api/members/[id]` | Primary | Updates member name/phone/address/notes |
| PATCH | `/api/members/[id]/status` | Primary | Marks member inactive, ends all active allocations |
| POST | `/api/members/[id]/pay` | Primary | Records payment, checks for duplicate period |
| POST | `/api/members/[id]/assign-seat` | Primary | Assigns seat to existing member (no active allocation) |
| PATCH | `/api/allocations/[id]` | Primary | Frees seat (sets `is_active=false`, `end_date=today`) |
| GET | `/api/seats` | Any | Returns all seats with occupancy (for seat picker) |
| POST | `/api/seats` | Primary | Adds seats (range, conflict check) |
| PATCH | `/api/seats/[id]` | Primary | Activates/deactivates seat (blocks if occupied) |
| GET | `/api/partners` | Any | Lists all partners for library |
| POST | `/api/partners` | Primary | Creates auth user + partner record (uses admin client) |
| PATCH | `/api/partners/[id]` | Primary | Updates partner (safety checks: can't deactivate self, can't deactivate last primary) |
| PATCH | `/api/settings/library` | Primary | Updates library configuration |
| GET | `/api/fee-structures` | Any | Returns current + history |
| POST | `/api/fee-structures` | Primary | Creates new fee structure (closes old one, rollback on failure) |

### lib/supabaseAdmin.js

Used only in `POST /api/partners` to create Supabase Auth users. Regular server client cannot create auth users — that requires the service role key which bypasses RLS entirely. The admin client is only used for the auth user creation; all subsequent partner record operations use the regular server client.

```javascript
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

If partner record insert fails after auth user was created, the admin client is used to delete the orphaned auth user (rollback).

---

## 14. Zustand Stores

### useAppStore

```javascript
{
  partner: { id, name, role, library_id },
  library: { id, name, grace_period_days, no_show_days, morning_cutoff_time, plan },
  setSession: (partner, library) => {},
  clearSession: () => {},
}
```

Populated by `AppShell` via `useLayoutEffect` on every render where partner or library data changes. The `useLayoutEffect` dependency array uses `JSON.stringify` of specific fields so re-runs when `grace_period_days` or other library settings change (after saving in settings page).

### useSeatsStore

```javascript
{
  seats: [],          // Array of seat objects with morning/evening slot data
  isLoaded: boolean,
  setSeats: (seats) => {},
  markSeatOccupied: (seatId, shift, slotData) => {},
  markSeatFree: (seatId, shift) => {},
}
```

Populated by `SeatMapClient` on the seats page and by `SeatPickerStep` when `initialSeats` prop is provided. Used by the Realtime provider for live updates.

**Important:** `SeatPickerStep` (used in Add Member and Assign Seat flows) always calls `setSeats(initialSeats)` when `initialSeats.length > 0`, regardless of whether the store was previously loaded. This ensures seat data is always fresh from the server for the current session.

### useUIStore

```javascript
{
  toasts: [],
  addToast: (message, type) => {},    // type: 'success' | 'error' | 'info'
  removeToast: (id) => {},
  confirmDialog: { isOpen, message, description, danger, onConfirm },
  showConfirm: ({ message, description, danger, onConfirm }) => {},
  hideConfirm: () => {},
}
```

---

## 15. Component Architecture

### AppShell

Wraps all protected pages. Renders `TopBar`, `BottomNav`, `Toast`, `ConfirmDialog`, `OfflineBanner`. Calls `setSession(partner, library)` in `useLayoutEffect` to hydrate Zustand with server-fetched library data.

### BottomNav

4 tabs: Dashboard (`/dashboard`), Seats (`/seats`), Members (`/members`), Reports (`/reports`).

Reports tab is active on both `/reports` AND `/payments` (payments is a sub-section of reports).

### SeatCell

Split visual: top half = morning slot color, bottom half = evening slot color. Green = free (`--color-seat-free`), Red = occupied (`--color-seat-occupied`). Seat number shown in center with semi-transparent background. Active state: blue ring via `border-info ring-2 ring-blue-200`.

### SeatBottomSheet

Slide-up sheet when a seat is tapped. Shows morning slot and evening slot separately (or "Full Time" if one member has fulltime). Each slot shows: member name (if occupied) + View button + Free button, or "Available" + Assign button (if free). Uses `pb-20` to clear BottomNav.

### MemberActions (Three-dots sheet)

Actions available to primary partners:
- Record payment → navigates to pay page
- Assign new seat → appears only when member has no active allocation; fetches fresh seat data via `/api/seats`, shows `SeatPickerStep` inside a bottom sheet
- Edit details → inline form in bottom sheet
- Mark as inactive → confirm dialog

### FeeStatusBadge

Renders different pill depending on status:
- Paid → green
- Grace → amber with days remaining  
- Overdue → red with days count
- Unpaid → gray (never paid)

### RoleGuard

```jsx
export function RoleGuard({ children }) {
  const role = useAppStore(s => s.partner?.role)
  if (role !== 'primary') return null
  return children
}
```

Hides write UI from viewer partners. Not a security control — API routes enforce security. This is purely UX.

### PaymentForm (Client Component)

Key behaviors:
- `mounted` state pattern: fixed bottom bar only renders client-side (prevents hydration mismatch from `env(safe-area-inset-bottom)`)
- `amountEdited` flag: if librarian manually changes amount, auto-recalculation stops
- `useEffect` watching `periodStart` and `periodEnd`: auto-recalculates amount when dates change (unless `amountEdited` is true)
- Amount reset button: clears `amountEdited` flag, re-triggers calculation

### AddMemberForm (Client Component)

3-step wizard:
1. Details (name, phone, address, aadhar, notes)
2. Seat picker (grid of seats, tap to select, shift buttons appear)
3. Confirm (summary + prorated fee preview)

Also uses `mounted` pattern for fixed navigation bar. URL query params (`?seat_id=&shift=&seat_number=`) allow pre-selecting a seat when navigated from the seat map "Assign" button.

---

## 16. Page-by-Page Reference

### /dashboard

Queries (parallel after partner fetch):
1. `members` — all active members (id, name, status)
2. `seat_allocations` — all active allocations with seat numbers (seat_id for dedup)
3. `fee_payments` — all payments (for latest per member + this month's total)
4. `seats` — count only (`head: true`)
5. `audit_logs` — last 5 actions with partner names

Computations server-side:
- Fee status per member using `computeFeeStatus()`
- Occupied seat count using `Set` of `seat_id` (UUID, not seat_number — more reliable)
- `collected_month` = sum of all payments where period overlaps current month
- Overdue list = members with status !== paid, sorted by priority, top 5
- Expiring this week = paid members whose `period_end_date` is within next 7 days

### /seats

Queries (parallel, no payment query):
1. `seats` — active seats only
2. `seat_allocations` — active allocations with member names

Fee status deliberately NOT computed here. Seat map cells show green/red for free/occupied only. Fee badge is shown on member profile (accessed via "View" in bottom sheet). Removing the payment query saved one full DB round-trip on the most-visited page.

Occupied count: seats where both morning and evening are occupied.

### /members

Queries (parallel):
1. `members` — all members including inactive
2. `seat_allocations` — active allocations
3. `fee_payments` — all payments (latest per member for fee status)

TanStack Query wraps the result in `MembersClient` for navigation caching. Back-navigation within 60 seconds is instant from cache. After 60 seconds, background refetch from `/api/members` GET endpoint.

Filters: All (active only), Overdue, Grace, Unpaid, Paid, Inactive. Count badges shown on filter pills. Overdue and Unpaid pills turn red when count > 0.

### /members/[id]

Queries (parallel after partner fetch + member fetch):
1. Active allocation (maybySingle)
2. All payments (desc by period_end_date)
3. All allocations (allocation history)
4. Fee structure (current)

Note: member fetch is sequential (need to verify member exists and belongs to library before continuing). The 4 remaining queries are parallel.

### /members/[id]/pay

Queries (parallel after member fetch):
1. Active allocation (for shift)
2. Fee structure (for monthly fee)
3. Last payment (to determine if first payment or renewal)
4. All active partners (for "collected by" selector)

Proration logic: If no previous payment, uses `member.join_date` (NOT today) as reference. If join_date is 1st, no proration. Otherwise `calculateProratedFee()`.

### /reports

Month/year from URL `?month=&year=` search params. Queries parallel:
1. Active members
2. Active allocations
3. Fee structure
4. All payments (for status + month filter)
5. All partners (for name lookup)

`collection_rate` = members who paid ÷ total members (count-based, not money-based). Money-based rate is distorted by prorated first payments. Count-based rate accurately reflects "what fraction of members have paid this month."

`fee_pending` is an approximation — uses current fee structure for members who haven't paid, not the fee that was active when their period started. Documented as such in the UI.

WhatsApp share generates plain text with library name, month, collected, pending, rate, partner breakdown, and list of pending members (capped at 20, shows count for remainder).

### /payments

All payments ever recorded, ordered by `paid_on` desc then `created_at` desc. Grouped by month in `PaymentsClient` (client-side grouping, no extra queries). Searchable by member name or partner name. Each row shows: member avatar, name, period covered, partner who collected, paid date, amount, payment mode (Cash/UPI), notes if any.

---

## 17. Realtime — Seat Map Live Updates

`RealtimeProvider` subscribes to `seat_allocations` table changes filtered by `library_id`.

```javascript
const channel = supabase
  .channel(`realtime-library-${library.id}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'seat_allocations',
    filter: `library_id=eq.${library.id}`,
  }, async (payload) => {
    // Fetch member name separately — payload only has member_id
    const { data } = await supabase.from('members').select('name').eq('id', payload.new.member_id).single()
    markSeatOccupied(payload.new.seat_id, payload.new.shift, {
      member_id: payload.new.member_id,
      member_name: data?.name || null,
      fee_status: null,
    })
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    // ...
  }, (payload) => {
    if (payload.new.is_active === false && payload.old.is_active === true) {
      markSeatFree(payload.new.seat_id, payload.new.shift)
    }
  })
  .subscribe()
```

The member name fetch is non-critical — if it fails, the seat still shows as occupied (red). Name appears correctly on next full page refresh.

Realtime is enabled on `seat_allocations` in Supabase Dashboard → Database → Replication.

---

## 18. Performance Architecture

### What Changed and Why

**Before Promise.all:** Pages ran queries sequentially. 5 queries × ~200ms each = ~1000ms server processing. TTFB was 2.04s.

**After Promise.all:** One sequential step (partner fetch ~150ms), then all remaining queries in parallel (~200ms for the slowest). TTFB dropped to 0.34s — an 83% improvement.

**Remaining bottleneck after TTFB fix:** FCP is 5.22s despite 0.34s TTFB. The 4.88s gap is browser-side: JavaScript bundle download (~500–700KB on 4G in Kushinagar takes ~800ms to download, ~500ms to parse, ~300ms to execute, ~300ms React hydration).

### Performance Stack

| Issue | Solution | Status |
|-------|----------|--------|
| Sequential DB queries | Promise.all | ✅ Done |
| Seat map payment query | Removed entirely | ✅ Done |
| Duplicate partner DB query | React `cache()` | ✅ Done |
| Cold starts | UptimeRobot pings /api/health every 5min | ✅ Done |
| Missing loading skeletons | loading.jsx on every page | ✅ Done |
| Members back-navigation | TanStack Query 60s cache | ✅ Done |
| Supabase connection overhead | Verify pooling enabled in dashboard | ✅ Config |
| JS bundle — Sentry | Defer lazy load (post-migration) | ⏳ Planned |
| Layout blocking HTML stream | Suspense restructure (post-migration) | ⏳ Planned |

### Vercel Cron (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/health",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

Note: Vercel Hobby (free) plan supports cron jobs with minimum 10-minute interval. For 5-minute intervals, use UptimeRobot (free external service). Both keep the serverless function warm for the librarian's morning visit.

### Globals.css — Tailwind v4

Using Tailwind v4 with `@import "tailwindcss"` and `@theme` block (no `tailwind.config.js` — deleted). Custom tokens defined with literal hex values in `@theme` (not `var()`) so opacity variants like `bg-primary/5` work correctly. CSS variables mirrored in `:root` for inline `style={}` usage.

Key tokens: `--color-primary`, `--color-surface`, `--color-border`, `--color-muted`, fee status colors (`--color-fee-paid-bg`, etc.), seat map colors (`--color-seat-free`, `--color-seat-occupied`).

---

## 19. JWT Claims — Custom Access Token Hook

### Problem It Solves

The original `get_my_library_id()` function ran a subquery against the `partners` table for every row that every RLS policy evaluated. With 100 members and multiple queries per page load, this meant hundreds of subquery executions per request. At SaaS scale (50 libraries, 5000 members), thousands.

### Solution

Supabase's Custom Access Token hook fires every time a JWT is minted or refreshed (at login). By the time a JWT is minted, the `partners` row already exists — no race condition. The hook embeds `library_id` in the token's `app_metadata`.

```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer as $$
declare
  claims jsonb;
  library uuid;
  user_id uuid;
begin
  user_id := (event->>'user_id')::uuid;
  claims := event->'claims';

  select library_id into library
  from partners
  where auth_user_id = user_id
    and is_active = true and deleted_at is null
  limit 1;

  if library is not null then
    claims := jsonb_set(claims, '{app_metadata, library_id}', to_jsonb(library::text));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;
```

### Updated get_my_library_id()

```sql
create or replace function get_my_library_id()
returns uuid language sql stable security definer as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'library_id')::uuid,  -- O(1), reads JWT
    (select library_id from partners                          -- fallback for old sessions
     where auth_user_id = auth.uid()
       and is_active = true and deleted_at is null limit 1)
  );
$$;
```

### Setup

1. Run the SQL in Supabase SQL Editor
2. Supabase Dashboard → Authentication → Hooks → Custom Access Token → select Postgres → select `public.custom_access_token_hook`
3. All existing partners log out and back in to get new JWTs with the claim embedded
4. Verify: DevTools → Application → Cookies → copy `sb-*-auth-token` → paste at jwt.io → check `app_metadata.library_id` is present

---

## 20. Key Architectural Decisions

### Decision 1: App Router over Pages Router

**Why:** Native server streaming, Server Components reduce client bundle, loading.jsx skeleton pattern, React `cache()` for request deduplication. Correct for a data-intensive app where fresh data matters more than SPA-style instant navigation.

**Tradeoff:** Every navigation triggers a server round-trip. Not as "instant" as a pure SPA. Acceptable for a management tool vs a consumer app.

### Decision 2: No TanStack Query for Page Data

**Why:** Server Components handle page data correctly and efficiently after Promise.all. Adding TanStack Query as the primary data layer would move data fetching to the client, increasing the bundle and losing the server-rendering advantage.


### Decision 3: Fee Status Never Stored

**Why:** Storing fee status creates a synchronization problem. The computed status depends on `today's date` and `grace_period_days`. If either changes (which the date does every day), stored statuses become stale immediately. Computing from payment records is always correct.

**Tradeoff:** Every page load computes fee status for every member in JavaScript. With 100 members this is negligible. At 10,000 members per library, this would need revisiting.

### Decision 4: Immutable Fee History

**Why:** Financial records must be accurate at the time they were created. If you update the fee structure row in place, you lose the ability to verify "what was the fee when this payment was made." Historical fee structures are closed (valid_until set) and new ones created.

**Tradeoff:** Slightly more complex query for "get current fee" (`is('valid_until', null)`) but completely accurate financial audit trail.

### Decision 5: Soft Delete Everywhere

**Why:** Hard deletes make debugging impossible. If a member is accidentally deleted, the data is gone. Soft deletes let you recover anything via Supabase SQL Editor.

**Implementation:** Every table has `deleted_at timestamptz`. Every query includes `.is('deleted_at', null)`. Every API route sets `deleted_at = now()` instead of deleting.

### Decision 6: Single Supabase Project for All Libraries

**Why:** At current scale (1 library, planning for 20–30), one project with library_id isolation is correct. Running separate Supabase projects per library would cost 2+ projects per client and require complex infrastructure.

**When to revisit:** When revenue from multiple libraries justifies a Supabase Pro plan (~$25/month), or when any library has privacy requirements that mandate physical data separation.

### Decision 7: Server-Side Date Authority

**Why:** The client's clock can be wrong. For financial records (payment date) and seat freeing (end date), the server always computes today's date. This prevents edge cases where a client at midnight in one timezone sends yesterday's date.

### Decision 8: Timezone-Safe Date Handling Throughout

**Why:** India is UTC+5:30. JavaScript's `new Date(string)` parses date-only strings as UTC midnight. For IST users, UTC midnight = previous evening, causing date strings to shift back by 1 day. Every date operation uses local date component parsing.

### Decision 9: Role Guard at API Level, Not RLS Level

**Why:** RLS is the correct tool for data isolation (which library can see what). Role-based write restrictions are better enforced at the API route level where you can return clear error messages like "Only primary partners can record payments." RLS rejections are generic and harder to debug.

### Decision 10: Zustand over Context for Global State

**Why:** Context re-renders the entire subtree on every change. Zustand uses selective subscriptions — a component subscribed to `useUIStore(s => s.toasts)` only re-renders when `toasts` changes, not when any other store field changes.

---

## 21. Known Bugs Fixed

### Bug: UTC Date Parse (Critical — Fixed Phase 9)
`new Date('2026-04-30')` parses as UTC, shifts to April 29 for IST users. Fixed everywhere by parsing date strings as `[y, m, d]` components.

### Bug: New Member Shows "Overdue" Instead of "Unpaid" (Fixed Phase 9)
`computeFeeStatus(null)` originally returned `overdue`. Fixed to return `unpaid` — semantically different (never paid vs missed a payment).

### Bug: Pay Page Proration Used Today's Date (Fixed Phase 10)
First payment proration reference was `new Date()` (today). Should be `member.join_date`. A member who joined April 15 but whose payment is recorded April 20 was getting a proration from April 20, charging only 10 days instead of 16.

### Bug: Reports Summed Only One Payment Per Member (Fixed Phase 10)
`monthPaymentByMember` stored only the first matching payment per member. If a member paid twice in a month (prorated + full), only the first was counted. Fixed by summing all `monthPayments` rows directly.

### Bug: Collection Rate Was Money-Based (Fixed Phase 10)
Money-based rate is distorted by prorated first payments. A library with 10 members where 8 paid ₹500 and 2 paid ₹230 (prorated) showed a collection rate less than 80%. Fixed to be member-count-based: 8/10 = 80%.

### Bug: Seat ID vs Seat Number for Occupied Count (Fixed Phase 11)
Dashboard was using `seat_number` for deduplication in a Set. Fixed to use `seat_id` (UUID) which is more reliable and handles edge cases where `seat_number` could be null.

### Bug: SeatBottomSheet Sent Client Date for end_date (Fixed Phase 10)
Free seat action sent `toDbDate(new Date())` from the client. At midnight IST this could be the previous day. Fixed: API route computes `end_date` server-side and ignores any client-sent date.

### Bug: `requirePrimary` Not Imported in seats/route.js (Fixed Phase 11)
`ReferenceError: requirePrimary is not defined` when adding seats. Fixed by adding to import line.

### Bug: AppShell useLayoutEffect No Deps (Fixed Phase 11)
Running on every render was a React anti-pattern. Fixed with stable `JSON.stringify` dependency array of specific library fields.

### Bug: Password Visible in Plain Text Field (Fixed Phase 11)
Partner creation form had `type="text"` for password. Fixed to `type="password"` with eye toggle.

### Bug: fdprocessedid Hydration Warning (Diagnosed Phase 9)
Not a real bug — injected by browser password manager extensions. Does not affect production users on their phones. No fix needed.

---

## 22. Phase History

| Phase | What Was Built |
|-------|---------------|
| 1 | GitHub + Next.js setup, dev branch workflow, proxy.js middleware |
| 2 | Full database schema — 10 tables, RLS policies, indexes, get_my_library_id(), create_member_with_allocation() RPC, Realtime enabled |
| 3 | Vercel deployment, environment variables, PWA manifest |
| 4 | Real data seeded: 1 library, 3 partners, 56 seats, fee structure |
| 5 | All packages, Zustand stores, providers, utils/constants.js, utils/formatters.js, lib files |
| 6 | Login page, app layout, AppShell, TopBar, BottomNav, Toast, ConfirmDialog, LoadingSpinner, EmptyState, OfflineBanner |
| 7 | Seat map — SeatCell, SeatGrid, SeatBottomSheet, SeatMapClient, ShiftSelector, RoleGuard, Realtime live updates, allocations API route |
| 8 | Members list + member profile — MemberCard, MemberSearchBar, PaymentHistoryList, AllocationHistoryList, MembersClient, MemberHeader, FeeSection, MemberActions |
| 9 | Add member 3-step form, seat picker, prorated fee calculation, payment recording. Critical bug fixes: timezone dates, fee status logic, hydration errors |
| 10 | Dashboard, Reports, Payments ledger page. Bug fixes: pay page proration from join_date, reports sum all payments, collection rate is member-based |
| 11 | Settings pages (library config, partners, seats, fees). supabaseAdmin.js, fee immutable history pattern, partner safety guards, logout button |
| 12 | Performance optimization (Promise.all), React cache(), TanStack Query members cache, JWT claims hook, missing loading.jsx files, health endpoint, UptimeRobot setup. Data migration for first real library client. |

---

## 23. Onboarding a New Library

### Information to Collect First

- Library name (exact)
- Full address
- Phone number
- Morning shift end time (default 13:00)
- Grace period days (default 10)
- No-show days (default 7)
- Total seat count
- Fee structure: morning, evening, fulltime (₹/month)
- All partners: name, phone, email, role (primary/viewer)

### Step 1 — Create Library Record

```sql
insert into libraries (name, address, phone, morning_cutoff_time, grace_period_days, no_show_days, plan)
values ('Library Name', 'Full Address', '9XXXXXXXXX', '13:00', 10, 7, 'trial')
returning id, name;
-- Copy the returned UUID — this is library_id
```

### Step 2 — Create Auth Accounts

Supabase Dashboard → Authentication → Users → Add user → Create new user (Auto Confirm: ON). Do this for each partner. Copy each User UID.

### Step 3 — Insert Partners

```sql
insert into partners (library_id, auth_user_id, name, phone, role)
values
  ('LIBRARY_ID', 'AUTH_UID_1', 'Primary Name', '9XXXXXXXXX', 'primary'),
  ('LIBRARY_ID', 'AUTH_UID_2', 'Viewer Name',  '9XXXXXXXXX', 'viewer');
```

### Step 4 — Insert Seats

```sql
insert into seats (library_id, seat_number, is_active)
select 'LIBRARY_ID'::uuid, generate_series(1, 56), true;
-- Change 56 to actual seat count
```

### Step 5 — Insert Fee Structure

```sql
insert into fee_structures (library_id, morning_fee, evening_fee, fulltime_fee, valid_from, created_by_partner_id)
values ('LIBRARY_ID', 500, 500, 900, current_date,
  (select id from partners where library_id = 'LIBRARY_ID' and role = 'primary' limit 1));
```

### Step 6 — Verify

```sql
select
  (select count(*) from partners where library_id = 'LIBRARY_ID')      as partners,
  (select count(*) from partners where library_id = 'LIBRARY_ID' and role = 'primary') as primaries,
  (select count(*) from seats where library_id = 'LIBRARY_ID')         as seats,
  (select count(*) from fee_structures where library_id = 'LIBRARY_ID' and valid_until is null) as fee_structure;
-- Expected: partners=3, primaries=1, seats=56, fee_structure=1
```

### Step 7 — Test Login

Log in as primary partner. Verify dashboard shows correct stats, seat map shows correct seat count (all green), settings shows correct library info.

### Step 8 — JWT Claims

All partners log out and back in to get JWTs with `library_id` in `app_metadata`. Verify via jwt.io.

### Step 9 — Train and Migrate

See §24 for full migration playbook.

---

## 24. Data Migration Playbook

### Before Librarian Arrives

Clear any test data from the library (if using a fresh library, skip):

```sql
-- Run select first to verify correct library_id
select id, name from libraries;

-- Then delete in order (respect foreign keys)
delete from notifications   where library_id = 'LIBRARY_ID';
delete from audit_logs      where library_id = 'LIBRARY_ID';
delete from member_status_logs where library_id = 'LIBRARY_ID';
delete from fee_payments    where library_id = 'LIBRARY_ID';
delete from seat_allocations where library_id = 'LIBRARY_ID';
delete from members         where library_id = 'LIBRARY_ID';

-- Verify all zeros
select
  (select count(*) from members where library_id = 'LIBRARY_ID')          as members,
  (select count(*) from seat_allocations where library_id = 'LIBRARY_ID') as allocations,
  (select count(*) from fee_payments where library_id = 'LIBRARY_ID')     as payments;
```

Seats, fee_structures, partners, and library record stay. Only member data is cleared.

### Migration Order

1. Active, fully-paid members first (straightforward)
2. Active, partially-paid or overdue members (add, record what payments exist)
3. New members who joined this month (add, no payment recorded)
4. Do NOT add departed members

### Adding Each Member

For each member in the register:
1. Tap "+" in members list
2. Enter name, phone, address, Aadhar last 4
3. Select their seat from map → select shift
4. Set join date to their ACTUAL join date from the register (not today)
5. Confirm — verify prorated amount if first month was partial
6. After adding: go to profile → record most recent payment

**Only record the most recent payment.** Historical payments from before the system exist do not need to be entered. If they paid January, February, March, and April — just record April. Fee status will show "Paid."

Exception: If you want complete history for specific members, record each month individually. The pay page auto-fills the next period after each recorded payment.

### Condition: Member Has Not Paid This Month

Add them normally. Do NOT record any payment. System shows them as "Unpaid" or "Overdue" automatically based on join date and grace period.

### Condition: Unknown Exact Join Date

Use the 1st of the month. `isFirstOfMonth()` detects this and treats it as a full month (no proration). Matches how the librarian would have charged them anyway.

### Condition: Member Paid Partial Amount

Record the actual amount paid. Use the Notes field ("partial, balance next week"). The system shows them as "Paid" for the period — the librarian tracks the balance offline.

### Condition: Two Shifts on One Seat

Add morning member first (select seat, select Morning). Then add evening member (select same seat, select Evening). The seat picker shows top half as occupied, bottom half free.

### After Migration

```sql
select count(*) as total_active
from members
where library_id = 'LIBRARY_ID' and deleted_at is null and status = 'active';
-- Must match register page count
```

### Fixing Migration Errors

**Wrong seat assigned:** Mark member inactive (frees seat automatically), re-add with correct seat.

**Wrong payment recorded:** Soft-delete the payment in SQL:
```sql
update fee_payments
set deleted_at = now()
where id = 'WRONG_PAYMENT_ID' and library_id = 'LIBRARY_ID';
```
Then record correct payment through the app.

**Duplicate member entered:** Mark as inactive via three-dots menu on profile.

---

## 25. Environment Variables

| Variable | Where Used | Notes |
|----------|-----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anon key (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (supabaseAdmin.js) | NEVER expose to client — full DB access |
| `NEXT_PUBLIC_SENTRY_DSN` | Client + Server | Sentry error tracking |
| `SENTRY_AUTH_TOKEN` | Build time only | For source maps upload |

Set in Vercel Dashboard → Project Settings → Environment Variables. Both `main` and `dev` branches use the same Supabase project (different libraries are isolated by library_id).

---

## 26. Deployment

### Branches

- `main` — production. Auto-deploys to `https://your-project.vercel.app`
- `dev` — development. Auto-deploys to `https://your-project-git-dev-username.vercel.app`

Both connect to the same Supabase project. The developer uses the test library on the dev deployment; the librarian uses the real library on the main deployment.

### CI/CD Flow

Push to `dev` → Vercel builds → deploys to dev URL → test features using test library data → when satisfied, merge `dev` → `main` → Vercel builds → deploys to production URL → librarian gets update automatically.

```bash
# Standard feature release
git checkout dev
# ... make changes, test locally ...
git add . && git commit -m "feat: description"
git push origin dev
# Test on dev Vercel URL
git checkout main && git merge dev && git push origin main
git checkout dev
```

### PWA

`app/manifest.js` exports the PWA manifest (Next.js App Router way — not a static JSON file). When the librarian opens the production URL in Chrome on Android and taps "Add to Home Screen," the app installs as a PWA. It runs in standalone mode (no browser chrome), feels closer to a native app. The JavaScript bundle is cached after first install, subsequent launches are faster.

---

*End of documentation. This covers every decision, every bug, every database table, every API route, every component interaction, and every operational procedure from Phase 1 through Phase 12.*
