---
status: pending
priority: p3
issue_id: "018"
tags: [code-review, security, infrastructure]
dependencies: []
---

# Add Rate Limiting Before Billable Integrations

## Problem Statement
No rate limiting on any endpoint. Essential before Phase 2-3 adds Deepgram transcription and Claude evaluation, which could rack up API costs if abused.

## Findings
- **Source:** Security reviewer (#7)

## Proposed Solutions
- Add `@upstash/ratelimit` with Redis, or Vercel rate limiting
- Priority: before Phase 2 deployment
- **Effort:** Medium (1 hour)
