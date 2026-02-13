---
status: pending
priority: p2
issue_id: "007"
tags: [code-review, security, api]
dependencies: []
---

# Sanitize API Error Responses

## Problem Statement
All API routes return raw Supabase/Postgres error messages to clients via `{ error: error.message }`. These can reveal table names, column names, constraint names, and PostgreSQL internals, enabling schema enumeration.

## Findings
- **Source:** Security reviewer (#4)
- **Location:** All 5 API route files (9 occurrences)

## Proposed Solutions
- Return generic error messages to clients
- Log detailed errors server-side via `console.error`
- Use appropriate HTTP status codes (400 for validation, 404 for not found, 500 for unexpected)
- **Effort:** Small (30 min)

## Acceptance Criteria
- [ ] No raw database error messages in API responses
- [ ] Errors logged server-side for debugging
- [ ] Appropriate HTTP status codes used
