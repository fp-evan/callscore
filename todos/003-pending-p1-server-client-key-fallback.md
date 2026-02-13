---
status: pending
priority: p1
issue_id: "003"
tags: [code-review, security, infrastructure]
dependencies: []
---

# Remove Silent Service Role Key Fallback

## Problem Statement
`src/lib/supabase/server.ts` silently falls back to the anon key when the service role key is missing or equals the literal string "your-service-role-key". In production, this means all server-side operations silently degrade to anon permissions. The hardcoded sentinel string should not exist in production code.

## Findings
- **Source:** TypeScript reviewer, Security reviewer, Architecture reviewer
- **Location:** `src/lib/supabase/server.ts:3-9`
- **Evidence:** Conditional check `!== "your-service-role-key"` with silent fallback

## Proposed Solutions

### Option A: Throw if service role key is missing (Recommended)
- Remove the fallback logic entirely
- Throw a descriptive error if the key is missing or is a placeholder
- **Pros:** Fails loudly, prevents silent degradation in production
- **Cons:** Requires service role key to always be set
- **Effort:** Small (5 min)
- **Risk:** None (key is now set in .env.local)

### Option B: Use anon key intentionally for all server routes
- Since there is no RLS, the anon key works fine
- Remove the service role key dependency entirely
- **Pros:** Simpler, fewer secrets to manage
- **Cons:** Will need to change when RLS is added
- **Effort:** Small (5 min)
- **Risk:** Low

## Recommended Action
Option A (the service role key is now properly set in .env.local)

## Technical Details
- **Affected files:** `src/lib/supabase/server.ts`

## Acceptance Criteria
- [ ] No sentinel string check in production code
- [ ] Server throws a clear error if SUPABASE_SERVICE_ROLE_KEY is missing
- [ ] All API routes continue to work with the real key

## Work Log

## Resources
