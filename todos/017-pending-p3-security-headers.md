---
status: pending
priority: p3
issue_id: "017"
tags: [code-review, security, infrastructure]
dependencies: []
---

# Add Security Headers in next.config.ts

## Problem Statement
No security headers configured. Missing X-Content-Type-Options, X-Frame-Options, Referrer-Policy, CSP.

## Findings
- **Source:** Security reviewer (#8)
- **Location:** `next.config.ts`

## Proposed Solutions
- Add headers config in `next.config.ts`
- **Effort:** Small (15 min)
