---
category: technician-layer
phase: 4
tags: [recharts, radar-chart, line-chart, mock-call, openrouter, aggregate-queries, tabs, profile-page]
date: 2026-02-12
---

# Phase 4: Technician Profiles, Performance Charts, Mock Call Generation

## Problem
Build a complete technician management layer with CRUD, individual profile pages with performance visualizations, and AI-generated mock call training scenarios.

## Key Patterns

### Recharts Radar Chart with Bar Chart Fallback
Recharts `RadarChart` needs at least 3 data points to render meaningfully. If there are fewer criteria, fall back to a horizontal `BarChart`:

```tsx
if (data.length < 3) {
  return <BarChart data={data} layout="vertical">...</BarChart>;
}
return <RadarChart data={data}>...</RadarChart>;
```

**Recharts v3 TypeScript gotcha**: Tooltip `formatter` types are strict — don't annotate the `value` parameter type, use `Number(value)` for safety:
```tsx
// BAD: formatter={(value: number) => ...} — fails with `number | undefined`
// GOOD: formatter={(value) => [`${Math.round(Number(value))}%`, "Pass Rate"]}
```

### Recharts Line Chart for Scores Over Time
Monthly aggregation pattern: group eval results by `YYYY-MM` key, compute pass rate per month, sort chronologically:

```tsx
const monthMap = new Map<string, { passed: number; total: number }>();
for (const t of completedTranscripts) {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  // accumulate per-month stats
}
```

Add a `ReferenceLine` at 80% for the target threshold — gives visual context.

### Aggregate Query Pattern for Technician Stats
Supabase JS client doesn't support SQL aggregation directly. Pattern used:

1. Fetch all technicians for org
2. Fetch all transcripts for those technicians (just `id, technician_id, eval_status`)
3. Fetch all eval_results for completed transcripts (just `transcript_id, passed`)
4. Compute stats in JS using Maps

**Important**: Extract to shared module (`src/lib/technician-stats.ts`) to avoid duplication between server pages and API routes. Both the list page and the `?stats=true` API endpoint need the same computation.

### Mock Call Prompt Engineering
Key design decisions for generating realistic mock transcripts:
- Use higher temperature (0.7) than evals (0.2) for natural-sounding dialogue
- Include eval criteria in the prompt so the LLM generates calls that hit *some but not all* criteria — makes eval results interesting, not a perfect call
- Wrap user-supplied scenario in XML delimiters (`<scenario>...</scenario>`) as prompt injection defense
- Extract service type from scenario keywords with fallback to "Practice Call"
- Longer timeout (60s) than evals (45s) since transcript generation is longer

### Profile Page Tab Structure
Server component fetches all data, passes to single client component with tabs:
- **Overview**: Hero section + radar chart + line chart + criteria breakdown bars
- **Call History**: Sortable/filterable table (date, source, pass rate)
- **Training**: Mock call generation + practice call history

The `useMemo` pattern works well for computing per-criteria stats and monthly aggregates from the flat eval results array. **Never `.sort()` a memoized array directly** — use `[...array].sort()` to avoid mutating the cached value.

### Delete Confirmation Pattern
Always use `AlertDialog` (not bare `onClick`) for destructive operations. For technician deletion, explicitly explain the side effect ("will unlink all their transcripts").

### Industry-Specific Scenario Suggestions
Store suggested mock call scenarios per industry in a constant map:
```tsx
const INDUSTRY_SCENARIOS: Record<string, string[]> = {
  hvac: ["AC repair upsell to maintenance plan", ...],
  plumbing: ["Drain cleaning with upsell to camera inspection", ...],
  // ...
};
```
Use a `Select` dropdown for quick selection + `Textarea` for custom scenarios.

## Review Findings Applied
- **P1**: Extracted shared stats computation to prevent logic drift
- **P1**: Added AlertDialog delete confirmation
- **P1**: Guarded mock-call self-fetch eval trigger (skip if `NEXT_PUBLIC_APP_URL` not set)
- **P2**: UUID validation on path parameters via regex
- **P2**: Bounded specialties Zod schema (max 20 items, max 100 chars each)
- **P2**: Prompt injection defense with XML delimiters
- **P2**: Removed unused `useRouter` imports, fixed sort mutation, fixed type assertions
