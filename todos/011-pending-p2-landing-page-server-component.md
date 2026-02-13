---
status: pending
priority: p2
issue_id: "011"
tags: [code-review, performance, architecture]
dependencies: []
---

# Convert Landing Page to Server Component

## Problem Statement
The landing page (`src/app/page.tsx`) is a client component that fetches organizations via `useEffect` + `fetch`. This causes a loading spinner flash and an unnecessary client-to-API-to-Supabase round trip. The CLAUDE.md states "Server components by default, client components only when needed."

## Findings
- **Source:** TypeScript reviewer (#8), Performance reviewer (OPT-1), Architecture reviewer (#3.2)
- **Location:** `src/app/page.tsx`

## Proposed Solutions
- Remove `"use client"`, fetch orgs directly from Supabase in the server component
- Extract the interactive "Create New Organization" button into a small client component
- **Effort:** Small (20 min)

## Acceptance Criteria
- [ ] Landing page is a server component
- [ ] No loading spinner flash on initial load
- [ ] Org list and empty state render immediately
- [ ] "Create New Organization" button still navigates to /onboarding
