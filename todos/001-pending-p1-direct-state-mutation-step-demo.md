---
status: pending
priority: p1
issue_id: "001"
tags: [code-review, quality, react]
dependencies: []
---

# Direct State Mutation in step-demo.tsx

## Problem Statement
`step-demo.tsx:73` directly mutates the `data` prop object (`data.orgId = org.id`) instead of using React's state update mechanism via `updateData()`. This bypasses React's unidirectional data flow and causes the parent component's state to be silently out of sync.

## Findings
- **Source:** TypeScript reviewer, Architecture reviewer, Simplicity reviewer, Performance reviewer (all flagged)
- **Location:** `src/components/onboarding/step-demo.tsx:73`
- **Evidence:** The `StepDemo` component does not receive `updateData` as a prop. The `onFinish` callback in the parent reads `data.orgId` which only works because the object reference is shared and mutated.

## Proposed Solutions

### Option A: Pass updateData to StepDemo (Recommended)
- Add `updateData` to StepDemo's props interface
- Replace `data.orgId = org.id` with `updateData({ orgId: org.id })`
- **Pros:** Clean, follows React patterns, parent re-renders correctly
- **Cons:** None
- **Effort:** Small (5 min)
- **Risk:** None

### Option B: Return orgId via onFinish callback
- Change `onFinish` to accept an orgId parameter: `onFinish(orgId: string)`
- Call `onFinish(org.id)` after successful creation
- **Pros:** No need to thread updateData through
- **Cons:** Changes the parent's finish() function signature
- **Effort:** Small (10 min)
- **Risk:** None

## Recommended Action
Option A

## Technical Details
- **Affected files:** `src/components/onboarding/step-demo.tsx`, `src/app/onboarding/page.tsx`
- **Components:** StepDemo, OnboardingPage

## Acceptance Criteria
- [ ] `data.orgId` is never mutated directly
- [ ] React state update mechanism is used
- [ ] Onboarding completes and navigates to dashboard correctly

## Work Log

## Resources
- React docs: https://react.dev/learn/updating-objects-in-state
