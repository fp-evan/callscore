---
status: pending
priority: p3
issue_id: "013"
tags: [code-review, quality]
dependencies: []
---

# Extract Shared Nav Items Constant

## Problem Statement
Sidebar and MobileNav define separate, diverging nav item arrays. Adding a route requires updating both.

## Findings
- **Source:** TypeScript reviewer (#9), Simplicity reviewer (#1)
- **Location:** `src/components/layout/sidebar.tsx:15-22`, `src/components/layout/mobile-nav.tsx:14-20`

## Proposed Solutions
- Create `src/lib/navigation.ts` with a shared `NAV_ITEMS` array
- Add a `showOnMobile` flag or filter in the mobile component
- **Effort:** Small (15 min)
