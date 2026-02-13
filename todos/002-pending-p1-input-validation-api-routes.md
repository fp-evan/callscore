---
status: pending
priority: p1
issue_id: "002"
tags: [code-review, security, api]
dependencies: []
---

# Add Input Validation to All API Routes

## Problem Statement
All POST and PATCH API routes accept raw request bodies without validation. The PATCH organization endpoint passes the entire raw body to Supabase `.update(body)`, allowing arbitrary field overwrite including `id`, `created_at`, and `updated_at`. No validation library is used anywhere.

## Findings
- **Source:** Security reviewer, TypeScript reviewer, Agent-native reviewer, Architecture reviewer
- **Location:**
  - `src/app/api/organizations/route.ts` (POST)
  - `src/app/api/organizations/[id]/route.ts` (PATCH - most critical: raw body to `.update()`)
  - `src/app/api/organizations/[id]/technicians/route.ts` (POST)
  - `src/app/api/eval-criteria/route.ts` (POST)
- **Evidence:** `const body = await request.json()` with no schema validation. PATCH uses `.update(body)` directly.

## Proposed Solutions

### Option A: Add Zod validation schemas (Recommended)
- Install Zod: `npm install zod`
- Create validation schemas for each route's input
- Validate before any database operation
- Return structured 400 errors with field-level detail
- **Pros:** Type-safe, composable, standard in Next.js ecosystem
- **Cons:** Adds a dependency
- **Effort:** Medium (1-2 hours for all routes)
- **Risk:** None

### Option B: Manual field allowlisting
- Destructure only allowed fields from body before passing to Supabase
- **Pros:** No new dependency
- **Cons:** No type validation, verbose, error messages less helpful
- **Effort:** Small (30 min)
- **Risk:** Low

## Recommended Action
Option A

## Technical Details
- **Affected files:** All 5 API route files
- **New dependency:** `zod`

## Acceptance Criteria
- [ ] All POST routes validate required fields before insert
- [ ] All PATCH routes use a field allowlist
- [ ] Invalid requests return 400 with structured error messages
- [ ] Malformed JSON returns 400, not 500
- [ ] Type coercion attacks are prevented (e.g., name as array)

## Work Log

## Resources
- Zod docs: https://zod.dev/
