---
status: pending
priority: p2
issue_id: "006"
tags: [code-review, quality, react]
dependencies: []
---

# Add Error Handling to Client-Side Fetches

## Problem Statement
Client components call `fetch().then(r => r.json())` without checking `response.ok`. A 500 response with `{ error: "..." }` is silently treated as an empty array. Users see empty states with no indication of failure.

## Findings
- **Source:** TypeScript reviewer (#5)
- **Location:** `src/app/page.tsx:17-24`, `src/components/layout/org-switcher.tsx:26-30`

## Proposed Solutions
- Check `response.ok` before calling `.json()`
- Show error state in UI (toast or inline message)
- **Effort:** Small (15 min)

## Acceptance Criteria
- [ ] Failed API calls show user-facing error indication
- [ ] 500 responses are not silently swallowed
