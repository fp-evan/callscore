---
status: pending
priority: p1
issue_id: "005"
tags: [code-review, security, api]
dependencies: []
---

# Require organization_id on GET /api/eval-criteria

## Problem Statement
The eval-criteria GET endpoint returns ALL criteria from ALL organizations when the `organization_id` query parameter is omitted. This is a cross-tenant data leakage issue in a multi-tenant application.

## Findings
- **Source:** TypeScript reviewer (#6), Security reviewer (implicit), Performance reviewer (CRITICAL-3), Architecture reviewer, Agent-native reviewer (#8)
- **Location:** `src/app/api/eval-criteria/route.ts:6-16`
- **Evidence:** `if (orgId) { query = query.eq("organization_id", orgId); }` -- the filter is optional

## Proposed Solutions

### Option A: Make organization_id required (Recommended)
- Return 400 if `organization_id` query param is missing
- **Pros:** Prevents cross-org data leakage, forces intentional scoping
- **Cons:** None (no current use case for unscoped query)
- **Effort:** Small (5 min)
- **Risk:** None

## Recommended Action
Option A

## Technical Details
- **Affected files:** `src/app/api/eval-criteria/route.ts`

## Acceptance Criteria
- [ ] GET without organization_id returns 400 error
- [ ] GET with organization_id returns only that org's criteria
- [ ] Onboarding flow still works correctly

## Work Log

## Resources
