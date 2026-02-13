---
title: "Phase 1 Foundation: Next.js + Supabase + TypeScript Setup Patterns"
category: setup-patterns
severity: reference
tags:
  - next-js
  - supabase
  - typescript
  - onboarding
  - responsive-layout
  - shadcn-ui
  - state-management
modules:
  - supabase/migrations
  - src/lib/supabase
  - src/components/onboarding
  - src/components/layout
  - src/app/api
symptoms:
  - "TypeError: fetch failed on API routes"
  - "Supabase tables missing despite migration file existing"
  - "Direct state mutation in onboarding wizard"
  - "Placeholder env values causing silent failures"
root_cause: multiple
resolution_type: multi-fix
date_resolved: "2025-06-13"
verified: true
related_issues: []
related_docs:
  - call-eval-plan.md
  - call-eval-design-addendum.md
  - CLAUDE.md
---

# Phase 1 Foundation: Next.js + Supabase + TypeScript Setup Patterns

## Problem Summary

Phase 1 scaffold of CallScore had several interrelated issues discovered during the initial review: Supabase migration existed locally but was never applied, environment variables were placeholder values causing silent API failures, the server Supabase client needed fallback logic, and the onboarding wizard had a React state mutation anti-pattern. This document captures every pattern, gotcha, and fix from the Phase 1 foundation work.

## 1. Supabase Setup Gotchas

### Migration exists locally but not deployed

**Symptom:** `list_tables` returns empty despite `supabase/migrations/001_initial_schema.sql` existing in the repo.

**Root Cause:** The migration SQL file was committed to git but never applied to the remote Supabase project. There's no automatic sync between local migration files and the remote database.

**Fix:** Apply migrations explicitly via the Supabase MCP `apply_migration` tool or the Supabase CLI (`supabase db push`).

**Prevention:** After creating any migration file, always verify it was applied by listing tables. Add a CI step or checklist item: "Verify migration applied to Supabase."

### Server vs Browser Client Patterns

Two distinct Supabase clients serve different roles:

```typescript
// src/lib/supabase/server.ts — Server-side (API routes, server components)
// Uses service role key for full DB access (bypasses RLS)
import { createClient } from "@supabase/supabase-js";
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// src/lib/supabase/client.ts — Browser-side (client components)
// Uses anon key, respects RLS
import { createBrowserClient } from "@supabase/ssr";
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Key distinction:** Server client uses `@supabase/supabase-js` directly. Browser client uses `@supabase/ssr` for cookie-based session handling.

### Placeholder Environment Values Cause Silent Failures

**Symptom:** API routes return 500 with `TypeError: fetch failed`. No helpful error message about misconfiguration.

**Root Cause:** `.env.local` shipped with placeholder values like `https://your-project.supabase.co`. The Supabase client doesn't validate the URL format — it just fails on the fetch.

**Fix:** Replace all placeholder values with real credentials from the Supabase dashboard or MCP tools (`get_project_url`, `get_publishable_keys`).

**Prevention:**
- Add a startup validation check that verifies env vars are not placeholder values
- Use a `.env.example` with clearly marked placeholders and a setup script
- Consider throwing at client creation time if URL contains "your-project"

### Seed Data for Templates

The `eval_templates` table must be seeded for onboarding Step 2 to work (template auto-selection by industry). Seed SQL:

```sql
INSERT INTO eval_templates (name, industry, criteria, is_default) VALUES
  ('Standard Sales Call Checklist', 'general', '[...]', true),
  ('Quick Service Visit', 'general', '[...]', false),
  ('HVAC Sales & Service', 'hvac', '[...]', false);
```

**Gotcha:** Without seed data, the onboarding wizard's eval setup step shows an empty template list with no error — it silently proceeds with no criteria.

## 2. shadcn/ui Configuration

### Style and Color System

- Using **New York** variant (not Default)
- Tailwind CSS v4 with **OKLch color space** (not HSL)
- Colors defined in `src/app/globals.css` as CSS custom properties
- Design addendum (`call-eval-design-addendum.md`) defines the semantic color system

### Component Installation Pattern

```bash
npx shadcn@latest add [component-name]
```

Components install to `src/components/ui/`. Always use these over custom primitives.

### No Known Quirks

shadcn/ui worked cleanly in Phase 1. The main consideration is following the design addendum's semantic color tokens rather than using Tailwind colors directly.

## 3. Next.js App Router Patterns

### Dynamic Route Params (Next.js 15+)

**Breaking change:** Dynamic route params are now `Promise<{}>` and must be awaited.

```typescript
// Correct pattern for API routes
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // use id...
}

// Correct pattern for page components
export default async function Page({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  // use orgId...
}
```

**Gotcha:** Forgetting `await` compiles fine but `params.id` resolves to `undefined` at runtime with no error.

### Server vs Client Component Decisions

The Phase 1 pattern:
- **Server components by default** — page layouts, data fetching
- **Client components only when needed** — interactive forms, state, effects
- The `org/[orgId]/layout.tsx` is a server component that fetches org data, then passes it to client child components (sidebar, header, mobile-nav)

**Review finding:** The landing page (`src/app/page.tsx`) uses `"use client"` with `useEffect` for data fetching but should be a server component with `async/await` for better performance and SEO.

### API Route Conventions

All API routes follow this pattern:
- Located in `src/app/api/`
- Use `createServerClient()` from `@/lib/supabase/server`
- Return `NextResponse.json()` with appropriate status codes
- No input validation (flagged for improvement — use Zod)

## 4. Mobile Responsive Layout

### Desktop Sidebar + Mobile Bottom Tabs

The layout uses a responsive split:

```
Desktop (md+):    Mobile (<md):
┌──────┬────────┐  ┌────────────────┐
│      │        │  │                │
│ Side │ Content│  │    Content     │
│ bar  │        │  │                │
│      │        │  │                │
│      │        │  ├────────────────┤
└──────┴────────┘  │  Bottom Tabs   │
                   └────────────────┘
```

**Implementation:**
- Sidebar: `hidden md:flex` — visible only on `md` and up
- Mobile nav: `md:hidden` — visible only below `md`
- Content area: `pb-20 md:pb-0` — bottom padding on mobile to clear the fixed bottom nav

**Key CSS classes:**
```tsx
// Sidebar container
<aside className="hidden md:flex md:w-64 md:flex-col ...">

// Mobile bottom nav
<nav className="fixed bottom-0 left-0 right-0 md:hidden ...">

// Main content with mobile padding
<main className="flex-1 overflow-y-auto pb-20 md:pb-0">
```

**Gotcha:** Forgetting `pb-20` on mobile causes the last content items to be hidden behind the fixed bottom nav.

### Navigation Item Differences

Desktop sidebar has 6 items (Dashboard, Record, Paste, Transcripts, Technicians, Settings). Mobile bottom nav has 5 items (drops Paste to save space). This is intentional — Paste is accessible via the Record page on mobile.

## 5. Onboarding Wizard State Management

### Parent-Managed State Pattern

State lives in the parent page component and flows down via props:

```typescript
// src/app/onboarding/page.tsx
const [data, setData] = useState<OnboardingData>({
  orgName: "", companySize: "", industry: "",
  notificationEmail: "", criteria: [], technicians: [], orgId: ""
});

const updateData = (updates: Partial<OnboardingData>) => {
  setData((prev) => ({ ...prev, ...updates }));
};

// Each step receives data + updateData as props
<StepOrgInfo data={data} updateData={updateData} />
```

**Advantage:** Simple, no external state library needed. All 5 steps share one state object.

**Limitation:** As complexity grows, consider `useReducer` or a form library like React Hook Form.

### Direct State Mutation Bug (Todo #001)

**Location:** `src/components/onboarding/step-demo.tsx`

**Bug:** After creating the org via API, the code does:
```typescript
data.orgId = org.id; // WRONG: direct mutation of props
```

**Fix:** Should use the `updateData` callback:
```typescript
updateData({ orgId: org.id });
```

**Why it matters:** Direct mutation bypasses React's change detection. It "works" in this case because the value is read synchronously after mutation, but it won't trigger re-renders and violates React's immutability contract.

### Sequential API Calls in Onboarding (Todo #004)

The final onboarding step makes N+1 sequential API calls:
1. POST /api/organizations (create org)
2. POST /api/eval-criteria (for each criterion, sequentially)
3. POST /api/organizations/[id]/technicians (for each technician, sequentially)

**Better approach:** Create a single `/api/onboarding/complete` endpoint that handles all inserts in one transaction.

## 6. Things That Broke and How They Were Fixed

| Issue | Symptom | Root Cause | Fix |
|-------|---------|------------|-----|
| No tables in Supabase | `list_tables` returns empty | Migration file never applied to remote | Applied via `apply_migration` MCP tool |
| API routes 500 | `TypeError: fetch failed` | Placeholder URL in `.env.local` | Replaced with real Supabase URL from MCP |
| Server client 500 | Auth failures after URL fix | Service role key still placeholder | Added anon key fallback in `server.ts` |
| OrgSwitcher crash risk | Could crash if API returns error | No type check on response data | Added `Array.isArray()` guard |
| No eval templates | Empty template list in onboarding | Seed data never inserted | Ran seed SQL via `execute_sql` MCP tool |

## Prevention Checklist

### Before Starting Any Phase
- [ ] Verify all migration files are applied to Supabase (`list_tables`)
- [ ] Verify seed data exists for any tables that need it
- [ ] Verify `.env.local` has real values (not placeholders)
- [ ] Run `npm run build` to catch compile errors
- [ ] Test all API routes return expected responses

### Code Patterns to Follow
- [ ] Always `await params` in dynamic routes
- [ ] Use `updateData()` callback instead of mutating props
- [ ] Add `Array.isArray()` guards on API response data
- [ ] Use server components by default, client only when interactive
- [ ] Add `pb-20 md:pb-0` to main content for mobile nav clearance
- [ ] Validate inputs with Zod before database operations

### Database Patterns
- [ ] Apply NOT NULL to required foreign keys
- [ ] Add CHECK constraints for enum-like columns
- [ ] Use batch insert endpoints instead of N+1 sequential calls
- [ ] Always verify migration applied after creating it

## Related Documentation

- [Project Architecture](../../call-eval-plan.md) — Full phase breakdown and tech decisions
- [Design Addendum](../../call-eval-design-addendum.md) — Color system, component specs, responsive breakpoints
- [CLAUDE.md](../../CLAUDE.md) — Project conventions and patterns
- [Review Todos](../../todos/) — 19 findings from Phase 1 code review

## Review Findings Reference

The Phase 1 code review produced 19 documented findings in `todos/`:

**P1 Critical (5):** Direct state mutation, missing input validation, server key fallback pattern, batch onboarding endpoint, eval-criteria org scoping

**P2 Important (7):** Error handling in onboarding, sanitized error responses, missing CRUD operations, JSON parse safety, typed Supabase client, server component conversion, error boundaries

**P3 Nice-to-Have (7):** Shared nav config, union types for enums, stable React keys, NOT NULL foreign keys, security headers, rate limiting, CHECK constraints
