---
status: pending
priority: p3
issue_id: "019"
tags: [code-review, database, security]
dependencies: []
---

# Add CHECK Constraints to Enum-Like Columns

## Problem Statement
Columns like `industry`, `eval_status`, `status`, `source`, and `example_type` accept any string value despite having a documented set of valid values. No database-level enforcement.

## Findings
- **Source:** Security reviewer (#9), Architecture reviewer (#3.4)
- **Location:** `supabase/migrations/001_initial_schema.sql`

## Proposed Solutions
- New migration adding CHECK constraints for all enum-like columns
- **Effort:** Small (20 min)
