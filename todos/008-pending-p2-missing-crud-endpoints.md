---
status: pending
priority: p2
issue_id: "008"
tags: [code-review, api, agent-native]
dependencies: ["002"]
---

# Add Missing CRUD Endpoints for Technicians and Eval Criteria

## Problem Statement
No DELETE or individual-resource PATCH endpoints exist for technicians or eval criteria. Once data is created during onboarding, it cannot be edited or removed via API. This blocks both future UI features and agent automation.

## Findings
- **Source:** Agent-native reviewer (Critical #1, #2)
- **Missing routes:**
  - `GET/PATCH/DELETE /api/eval-criteria/[id]`
  - `GET/PATCH/DELETE /api/technicians/[id]` (or nested under org)
  - `DELETE /api/organizations/[id]`

## Proposed Solutions
- Create `src/app/api/eval-criteria/[id]/route.ts` with GET/PATCH/DELETE
- Create `src/app/api/technicians/[id]/route.ts` with GET/PATCH/DELETE
- Add DELETE to `src/app/api/organizations/[id]/route.ts`
- Apply Zod validation (depends on #002)
- **Effort:** Medium (1-2 hours)

## Acceptance Criteria
- [ ] All CRUD operations available for organizations, technicians, eval criteria
- [ ] DELETE returns appropriate status codes
- [ ] PATCH validates and allowlists fields
