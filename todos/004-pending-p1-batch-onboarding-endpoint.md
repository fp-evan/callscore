---
status: pending
priority: p1
issue_id: "004"
tags: [code-review, performance, api, architecture]
dependencies: []
---

# Batch Onboarding Into Single API Endpoint

## Problem Statement
`step-demo.tsx` creates org, criteria, and technicians via N+M+1 sequential HTTP round trips. With 9 criteria and 5 technicians, that is 15 serial requests taking 750ms-2.25s. No error handling on individual requests means partial failures leave the database in an inconsistent state.

## Findings
- **Source:** Performance reviewer (CRITICAL-1), TypeScript reviewer (HIGH #4), Architecture reviewer (HIGH #1), Simplicity reviewer (#7)
- **Location:** `src/components/onboarding/step-demo.tsx:26-71`
- **Evidence:** Sequential `for` loops with individual `await fetch()` calls. No partial failure cleanup.

## Proposed Solutions

### Option A: Single POST /api/onboarding/complete endpoint (Recommended)
- Create `src/app/api/onboarding/complete/route.ts`
- Accept full payload: `{ org, criteria[], technicians[] }`
- Use Supabase bulk `.insert([...])` for criteria and technicians
- Wrap in error handling so all-or-nothing semantics are approximated
- Simplify step-demo.tsx to a single fetch call
- **Pros:** Single round trip, proper error handling, atomic-ish creation
- **Cons:** Adds a new endpoint
- **Effort:** Medium (1 hour)
- **Risk:** None

### Option B: Promise.all the existing calls
- Keep individual endpoints but parallelize criteria and technicians
- **Pros:** No new endpoint needed
- **Cons:** Still N+M+1 round trips (just parallel), still no partial failure handling
- **Effort:** Small (15 min)
- **Risk:** Low

## Recommended Action
Option A

## Technical Details
- **Affected files:** `src/components/onboarding/step-demo.tsx`, new `src/app/api/onboarding/complete/route.ts`

## Acceptance Criteria
- [ ] Onboarding submission is a single HTTP request
- [ ] Criteria and technicians are bulk-inserted
- [ ] Errors are handled gracefully with rollback or cleanup
- [ ] User sees a clear error message if creation fails
- [ ] Total submission time < 300ms

## Work Log

## Resources
