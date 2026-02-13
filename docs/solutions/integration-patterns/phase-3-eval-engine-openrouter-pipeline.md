---
title: "Phase 3: Eval Engine — OpenRouter AI Pipeline, Criteria CRUD, Results UI"
category: integration-patterns
tags: [openrouter, llm-integration, eval-pipeline, prompt-engineering, criteria-management, results-ui, ai-evaluation, next-js, supabase, zod-validation]
date: 2026-02-12
components: [openrouter-client, eval-prompts, evaluate-api, eval-criteria-crud, criteria-manager, transcript-detail, few-shot-examples]
severity: reference
status: resolved
phase: 3
systems: [evaluation-pipeline, criteria-management, ui-components, api-routes]
---

# Phase 3: Eval Engine — OpenRouter AI Pipeline, Criteria CRUD, Results UI

## Problem

Build a complete AI evaluation pipeline that:
- Calls OpenRouter (OpenAI-compatible API) for LLM inference using Claude Sonnet
- Builds structured prompts with system/user roles and few-shot examples
- Parses LLM JSON responses (sometimes wrapped in markdown code fences)
- Stores results atomically and handles race conditions
- Auto-triggers evaluations from the UI when a transcript is created
- Provides full CRUD for eval criteria with drag-to-reorder and inline editing

### Key Challenges Discovered

1. **OpenRouter Model ID Format**: Must use `anthropic/claude-sonnet-4` (not OpenAI-style or timestamped IDs)
2. **LLM JSON Wrapping**: LLMs sometimes return JSON inside markdown code fences (` ```json ... ``` `)
3. **Race Conditions**: Multiple simultaneous eval requests could create duplicate evaluations
4. **Inline Editing Performance**: CriteriaManager needs debouncing to avoid API thrashing on every keystroke
5. **Auto-Trigger Without Polling**: Need a one-time evaluation trigger on mount with ref guard

## Solution

### 1. OpenRouter API Client

**File:** `src/lib/openrouter.ts`

```typescript
const DEFAULT_MODEL = "anthropic/claude-sonnet-4";

export async function callOpenRouter(
  messages: ChatMessage[],
  options: OpenRouterOptions = {}
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const timeoutMs = options.timeout ?? 45000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://callscore.vercel.app",
      "X-Title": "CallScore",
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODEL,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 4096,
    }),
    signal: controller.signal,
  });
  // ... error handling, AbortError catch
}
```

**Key points:**
- `Authorization: Bearer {apiKey}` — standard OpenRouter auth
- `HTTP-Referer` and `X-Title` headers required by OpenRouter for tracking
- Model ID is `anthropic/claude-sonnet-4` (provider/model format)
- Temperature `0.2` for deterministic evaluations
- 45s timeout with AbortController prevents hanging on long transcripts
- Sanitized error messages: 401 → "API authentication failed", 429 → "Rate limit exceeded", AbortError → "AI evaluation timed out"

### 2. JSON Fence Stripping

```typescript
export function parseJsonResponse<T>(raw: string): T {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return JSON.parse(cleaned);
}
```

Handles both clean JSON and markdown-fenced responses from LLMs.

### 3. Prompt Engineering Pattern

**File:** `src/lib/prompts/eval.ts`

- **System prompt**: Sets evaluator role, org context (name/industry), rules (fairness, citation, JSON-only)
- **User prompt**: Embeds transcript + criteria with few-shot examples inline
- **Few-shot format**: `- ${ex.example_type} example: "${ex.transcript_snippet}"` with optional explanation
- **Response schema**: Each result must have `criteria_id`, `passed`, `confidence`, `reasoning`, `excerpt`, `excerpt_start/end`
- **Summary field**: LLM generates a high-level call summary alongside per-criterion results

### 4. Atomic Eval Pipeline (Race Condition Prevention)

**File:** `src/app/api/evaluate/route.ts`

```typescript
// Atomic status guard — only transitions from pending/failed
const { data: updated } = await supabase
  .from("transcripts")
  .update({ eval_status: "processing" })
  .eq("id", transcriptId)
  .in("eval_status", ["pending", "failed"])
  .select("id")
  .single();

if (!updated) {
  return NextResponse.json(
    { error: "Transcript is already being evaluated" },
    { status: 409 }
  );
}
```

Pipeline flow: Fetch transcript → atomic status guard → fetch criteria → build prompts → call LLM → store results → update status. On any failure, status rolls back to "failed" with error metadata.

### 5. Auto-Trigger via useEffect with Ref Guard

**File:** `src/components/transcripts/transcript-detail.tsx`

```typescript
const hasTriggeredEval = useRef(false);

useEffect(() => {
  if (
    transcript.eval_status === "pending" &&
    evalResults.length === 0 &&
    !hasTriggeredEval.current
  ) {
    hasTriggeredEval.current = true;
    runEvaluation();
  }
}, []);
```

`useRef` persists across re-renders, preventing double-triggers even if component re-mounts.

### 6. Debounced Inline Editing

**File:** `src/components/criteria/criteria-manager.tsx`

```typescript
const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

const debouncedSave = useCallback((id, updates) => {
  const key = `${id}-${Object.keys(updates).join(",")}`;
  if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
  debounceTimers.current[key] = setTimeout(() => {
    saveCriterion(id, updates);
    delete debounceTimers.current[key];
  }, 500);
}, [saveCriterion]);

// Instant save for toggles/selects, debounced for text
if (typeof value === "boolean" || field === "status" || field === "category") {
  saveCriterion(id, { [field]: value });
} else {
  debouncedSave(id, { [field]: value });
}
```

Independent timers per field per criterion. UI updates immediately (optimistic), API call is debounced.

### 7. Drag-to-Reorder with Optimistic UI

```typescript
// Reorder locally immediately
setCriteria(reordered);
// Persist to backend
try {
  await fetch("/api/eval-criteria/reorder", {
    method: "POST",
    body: JSON.stringify({ orderedIds: reordered.map((c) => c.id) }),
  });
} catch {
  setCriteria(initialCriteria); // Rollback on error
}
```

Backend uses `Promise.all()` to update all `sort_order` values in parallel.

## Prevention Strategies

### 1. Verify LLM Provider Model IDs Against Docs
Copy model ID from OpenRouter docs exactly. Test with a small batch before deploying. The wrong model ID (e.g., `anthropic/claude-opus-4-20250514`) returns a cryptic error.

### 2. Always Add Timeouts to External API Calls
Use the AbortController pattern with a sensible default (45s). Clear timeouts after response. Handle AbortError separately for user-friendly messaging.

### 3. Debounce Text Inputs That Trigger API Calls
Use 500ms delay for text fields, instant for booleans/selects. Track timers by composite key (`${id}-${fields}`). Always clear timers to prevent memory leaks.

### 4. Use Atomic Status Guards for Pipeline Operations
Supabase's conditional `.in()` on UPDATE creates an atomic check-and-set at the database level. Return 409 Conflict if another request already claimed the transition.

### 5. Strip Markdown Fences from LLM JSON Responses
Even with explicit "JSON only" instructions, LLMs sometimes wrap responses in code fences. The regex pattern `/^```(?:json)?\s*\n?/` handles both ```` ``` ```` and ```` ```json ```` variants.

### 6. Sanitize Error Details Before Returning to Clients
Log full errors server-side (`console.error`). Return generic messages to clients. Never expose API keys, internal service names, or raw error responses from third-party APIs.

### 7. Optimistic UI with Rollback
Update state immediately for responsive feel. Keep `initialData` in scope for rollback. On API error, restore previous state and show toast.

## Files

| File | Purpose |
|------|---------|
| `src/lib/openrouter.ts` | OpenRouter API client with timeout, error sanitization, JSON parsing |
| `src/lib/prompts/eval.ts` | System/user prompt builders, response types, test prompt builder |
| `src/app/api/evaluate/route.ts` | Main eval pipeline endpoint |
| `src/app/api/evaluate/test/route.ts` | Single-criterion test endpoint |
| `src/app/api/eval-criteria/route.ts` | Criteria GET (list) + POST (create) |
| `src/app/api/eval-criteria/[id]/route.ts` | Criteria GET/PATCH/DELETE |
| `src/app/api/eval-criteria/[id]/examples/route.ts` | Few-shot examples GET/POST |
| `src/app/api/eval-criteria/[id]/examples/[exampleId]/route.ts` | Few-shot example DELETE |
| `src/app/api/eval-criteria/reorder/route.ts` | Drag-to-reorder persistence |
| `src/components/criteria/criteria-manager.tsx` | Full criteria CRUD UI with inline editing |
| `src/components/transcripts/transcript-detail.tsx` | Eval results display, auto-trigger, re-run |
