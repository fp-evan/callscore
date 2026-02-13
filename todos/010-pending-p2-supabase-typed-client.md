---
status: pending
priority: p2
issue_id: "010"
tags: [code-review, quality, typescript]
dependencies: []
---

# Pass Database Generic to Supabase Client

## Problem Statement
The `Database` type in `types.ts` is carefully defined but never passed to `createClient<Database>()` or `createBrowserClient<Database>()`. All Supabase queries return untyped data. The type system provides zero safety at the data layer.

## Findings
- **Source:** TypeScript reviewer (#7, #15), Architecture reviewer (#4.4)
- **Location:** `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`

## Proposed Solutions
- Pass `Database` generic: `createClient<Database>(url, key)`
- Consider wiring up `supabase gen types typescript` for auto-generation
- **Effort:** Small (15 min for manual fix, 30 min with gen types setup)

## Acceptance Criteria
- [ ] Both server and client Supabase clients are typed with `Database` generic
- [ ] TypeScript catches invalid column names in `.select()` and `.insert()`
