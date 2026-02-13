---
status: pending
priority: p3
issue_id: "015"
tags: [code-review, react, quality]
dependencies: []
---

# Use Stable Keys Instead of Array Index for Mutable Lists

## Problem Statement
Criteria and technician lists in the onboarding wizard use array index as React keys. Since items can be added/removed, this causes stale input values when items are deleted from the middle.

## Findings
- **Source:** TypeScript reviewer (#12)
- **Location:** `src/components/onboarding/step-eval-setup.tsx:124`, `src/components/onboarding/step-technicians.tsx:53`, `src/components/onboarding/step-demo.tsx:120,134`

## Proposed Solutions
- Generate stable IDs with `crypto.randomUUID()` when creating each item
- **Effort:** Small (15 min)
