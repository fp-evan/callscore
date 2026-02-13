---
status: pending
priority: p2
issue_id: "012"
tags: [code-review, architecture, quality]
dependencies: []
---

# Add loading.tsx and error.tsx Boundaries

## Problem Statement
No `loading.tsx` or `error.tsx` files exist in the org route segment. Uncaught errors show the default Next.js error UI. Server component loading has no progressive rendering.

## Findings
- **Source:** Architecture reviewer (#4.3), TypeScript reviewer (structural)
- **Location:** Missing at `src/app/org/[orgId]/`

## Proposed Solutions
- Add `src/app/org/[orgId]/loading.tsx` with a skeleton/spinner
- Add `src/app/org/[orgId]/error.tsx` with a styled error boundary
- Optionally add `src/app/not-found.tsx` for custom 404
- **Effort:** Small (30 min)

## Acceptance Criteria
- [ ] Loading state shows while server components render
- [ ] Errors show a styled error page, not the Next.js default
