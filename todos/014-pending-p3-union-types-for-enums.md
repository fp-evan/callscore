---
status: pending
priority: p3
issue_id: "014"
tags: [code-review, typescript, quality]
dependencies: []
---

# Use Union Types for Enum-Like String Fields

## Problem Statement
Fields like `status`, `eval_status`, `source`, `industry`, and `example_type` are typed as `string` instead of string literal unions. Invalid values are not caught at compile time.

## Findings
- **Source:** TypeScript reviewer (#11), Architecture reviewer (#3.4)
- **Location:** `src/lib/supabase/types.ts`

## Proposed Solutions
- Replace `string` with union types: `"draft" | "published"`, `"pending" | "processing" | "completed" | "failed"`, etc.
- **Effort:** Small (20 min)
