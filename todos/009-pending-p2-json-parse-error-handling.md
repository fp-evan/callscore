---
status: pending
priority: p2
issue_id: "009"
tags: [code-review, security, api]
dependencies: ["002"]
---

# Add try/catch for request.json() in API Routes

## Problem Statement
All POST/PATCH handlers call `await request.json()` without try/catch. Malformed JSON causes unhandled 500 errors that may leak framework details.

## Findings
- **Source:** Security reviewer (#6), TypeScript reviewer (structural observation)
- **Location:** All POST/PATCH API route handlers

## Proposed Solutions
- Wrap in try/catch, return 400 for parse errors
- Can be combined with Zod validation (#002)
- **Effort:** Small (15 min, or included in #002)

## Acceptance Criteria
- [ ] Malformed JSON returns 400 with "Invalid JSON body" message
- [ ] No unhandled exceptions from JSON parsing
