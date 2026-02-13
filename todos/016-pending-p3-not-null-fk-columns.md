---
status: pending
priority: p3
issue_id: "016"
tags: [code-review, database]
dependencies: []
---

# Add NOT NULL to Required Foreign Key Columns

## Problem Statement
`technicians.organization_id`, `eval_criteria.organization_id`, and `transcripts.organization_id` are nullable despite being logically required. A technician or criterion without an organization makes no domain sense.

## Findings
- **Source:** TypeScript reviewer (#13)
- **Location:** `supabase/migrations/001_initial_schema.sql:23,36`

## Proposed Solutions
- Add a new migration: `ALTER TABLE technicians ALTER COLUMN organization_id SET NOT NULL;` (etc.)
- **Effort:** Small (15 min)
