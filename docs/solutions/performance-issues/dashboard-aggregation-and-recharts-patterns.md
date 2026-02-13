---
title: Phase 5 Dashboard Performance & Type Safety — O(n^3) nested loops, onClick typing, AbortController cleanup
date: 2026-02-12
category: performance-issues
tags: [recharts, dashboard, nextjs, supabase, data-aggregation, maps, abort-controller, typescript, react-useId]
severity: medium
components: [dashboard-api, dashboard-view, heatmap, sparkline, criteria-chart, trend-chart, filter-bar]
problem_type: performance_issue
resolution_time: ~2 hours
phase: 5
patterns_established:
  - Pre-compute Maps for O(T*C*E) to O(T+C+E) aggregation queries
  - Cast Recharts v3 onClick payload to Record<string, unknown> for type safety
  - Use React.useId() for SVG gradient IDs to prevent collisions
  - Extract shared filtersToParams() helper for URL sync
  - AbortController cleanup on filter changes for stale fetch prevention
  - Date query param validation with isNaN guard
  - Remove dead code (computed but unused variables)
  - Match skeleton layout exactly to actual page layout
files_changed: 13
---

# Phase 5: Dashboard Aggregation & Recharts Patterns

## Problem Statement

Building a real-time analytics dashboard with complex multi-dimensional data aggregation, interactive filtering, and multiple chart types. The challenge involves:

1. **Performance**: Aggregating pass rates across transcripts (T), criteria (C), and eval results (E) requires scanning O(T x C x E) data points
2. **Race conditions**: Rapid filter changes trigger overlapping fetches that return out-of-order
3. **Type safety**: Recharts v3 onClick events return weakly-typed payloads
4. **SVG ID collisions**: Multiple sparkline components with hardcoded gradient IDs cause visual corruption
5. **State management**: Filter state needs to persist in URL for bookmarkability
6. **Missing primitives**: Recharts has no native heatmap component

## Root Cause Analysis

### O(T x C x E) Data Scanning

The naive approach scans all eval results for each technician-criteria pair:

```typescript
// SLOW: O(T x C x E) nested loops
const heatmapData = technicians.flatMap(tech =>
  criteria.map(c =>
    evalResults.filter(r =>
      r.technician_id === tech.id && r.eval_criteria_id === c.id
    )
  )
);
```

### Stale Fetch Race Conditions

Without request cancellation, rapid filter changes create races where old responses overwrite fresh data.

### Recharts v3 onClick Typing

Recharts v3 changed onClick to return `Record<string, unknown>`, breaking type-safe access to `activePayload`.

### SVG Gradient ID Collisions

Color-derived gradient IDs (`sparkGrad-7c3aed`) collide when multiple sparklines share the same color prop.

### Dead Code

`technicianComparison` was computed server-side (expensive O(T x C) loop) but never consumed by any client component.

## Solution

### 1. Pre-computed Maps for O(1) Aggregation Lookups

Build lookup Maps once, access cells in O(1):

```typescript
// src/app/api/dashboard/[orgId]/route.ts
const transcriptMap = new Map(allTranscripts.map(t => [t.id, t]));
const resultsByCriteria = new Map<string, typeof filteredResults>();
const resultsByTranscript = new Map<string, typeof filteredResults>();

for (const r of filteredResults) {
  if (!resultsByCriteria.has(r.eval_criteria_id)) {
    resultsByCriteria.set(r.eval_criteria_id, []);
  }
  resultsByCriteria.get(r.eval_criteria_id)!.push(r);
  if (!resultsByTranscript.has(r.transcript_id)) {
    resultsByTranscript.set(r.transcript_id, []);
  }
  resultsByTranscript.get(r.transcript_id)!.push(r);
}

// O(1) lookup replaces O(E) filter
const criteriaResults = resultsByCriteria.get(c.id) || [];
```

### 2. AbortController for Stale Fetch Cancellation

```typescript
// src/components/dashboard/dashboard-view.tsx
const abortRef = useRef<AbortController | null>(null);

const fetchData = useCallback(async () => {
  abortRef.current?.abort();
  const controller = new AbortController();
  abortRef.current = controller;

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("Failed to load dashboard data");
    const json = await response.json();
    if (!json || !Array.isArray(json.criteriaPassRates)) {
      throw new Error("Invalid dashboard response");
    }
    setData(json);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    setError("Failed to load dashboard data.");
  } finally {
    if (!controller.signal.aborted) setLoading(false);
  }
}, [orgId, filters]);

useEffect(() => {
  fetchData();
  return () => abortRef.current?.abort();
}, [fetchData]);
```

Key points: catch `AbortError` and return early, only set loading=false if not aborted, cleanup on unmount.

### 3. Recharts v3 onClick Typing Workaround

```typescript
// src/components/dashboard/criteria-chart.tsx
onClick={(e: Record<string, unknown>) => {
  const payload = e?.activePayload as
    | { payload: { criteriaId: string } }[]
    | undefined;
  if (payload?.[0]?.payload?.criteriaId) {
    onCriteriaClick?.(payload[0].payload.criteriaId);
  }
}}
```

### 4. React.useId() for SVG Gradient IDs

```typescript
// src/components/dashboard/sparkline.tsx
import { useId } from "react";

export function Sparkline({ data, color, height }: Props) {
  const gradientId = useId();
  return (
    <AreaChart data={data}>
      <defs>
        <linearGradient id={gradientId}>
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area fill={`url(#${gradientId})`} />
    </AreaChart>
  );
}
```

`useId()` is stable across SSR/CSR — no hydration mismatch like `Math.random()`.

### 5. URL-based Filter State with Shared Helper

```typescript
// src/components/dashboard/dashboard-view.tsx
function filtersToParams(filters: DashboardFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("startDate", filters.startDate);
  params.set("endDate", filters.endDate);
  if (filters.technicianIds.length > 0) {
    params.set("technicianIds", filters.technicianIds.join(","));
  }
  if (filters.criteriaIds.length > 0) {
    params.set("criteriaIds", filters.criteriaIds.join(","));
  }
  if (!filters.excludeMock) {
    params.set("excludeMock", "false");
  }
  return params;
}
```

Used by both `updateFilters` (URL sync) and `fetchData` (API call) — no duplication.

### 6. Custom CSS Table Heatmap

Recharts has no native heatmap. Use an HTML table with a merged color class function:

```typescript
// src/components/dashboard/heatmap.tsx
function getCellClasses(passRate: number | null): string {
  if (passRate === null)
    return "bg-gray-100 dark:bg-gray-800 text-gray-400";
  if (passRate >= 0.8)
    return "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300";
  if (passRate >= 0.5)
    return "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300";
  return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300";
}
```

Single function returns both bg and text colors. O(1) cell lookup via `Map<"techId:criteriaId", HeatmapCell>`.

## Prevention Strategies

### Pre-Computation Decision Tree

```
Will you access this collection >2 times in nested loops?
  Yes -> Pre-compute Map/Set
  No  -> Is dataset >100 items?
    Yes -> Pre-compute Map/Set
    No  -> Inline filter is fine
```

### Client-Side Fetch Checklist

Every filter-driven fetch must:
1. Use `AbortController` with `useRef` to cancel stale requests
2. Check `response.ok` before parsing JSON
3. Validate response shape with `Array.isArray()` or type guards
4. Catch `AbortError` specifically and return early
5. Only update loading state if `!controller.signal.aborted`
6. Cleanup in `useEffect` return

### Recharts Gotchas

- Gradient IDs: always `useId()`, never derive from props
- Tooltip formatter: don't annotate `value` type, use `Number(value)`
- RadarChart needs >=3 data points, fallback to BarChart
- Define color arrays outside component to avoid recreating on render
- onClick typing in v3: cast to `Record<string, unknown>`, assert `activePayload`

### Array Mutation

Always `[...array].sort()` instead of `array.sort()` on state/memoized/prop arrays.

### Skeleton Layout

Copy container classes (grid, flex, spacing) from actual component to skeleton. Test by toggling between skeleton and loaded state — zero layout shift.

### Dead Code Prevention

Before adding fields to API responses, grep client components to confirm the field is rendered somewhere. Trace every response field: API route -> client component -> JSX.

## Related Documentation

- [`docs/solutions/technician-layer/phase-4-technician-profiles-mock-calls.md`](../technician-layer/phase-4-technician-profiles-mock-calls.md) — Recharts RadarChart/LineChart patterns, monthly aggregation, tooltip formatter gotchas
- [`docs/solutions/integration-patterns/phase-3-eval-engine-openrouter-pipeline.md`](../integration-patterns/phase-3-eval-engine-openrouter-pipeline.md) — Atomic eval pipeline, debounce patterns, useRef guards
- [`docs/solutions/setup-patterns/phase-1-next-supabase-typescript-foundations.md`](../setup-patterns/phase-1-next-supabase-typescript-foundations.md) — Next.js 16 + Supabase foundations

### Cross-References from CLAUDE.md

- `computeTechnicianStats()` in `src/lib/technician-stats.ts` — shared stats computation pattern that dashboard builds on
- Recharts radar chart >=3 data points fallback (Phase 4 pattern)
- Never `.sort()` memoized arrays (Phase 4 pattern)
- Zod validation + sanitized errors on all API routes (Phase 3 pattern)
