# CallScore — CLAUDE.md

## Project Overview
CallScore is an AI-powered call analysis tool for field service companies.
See call-eval-plan.md for full architecture and call-eval-design-addendum.md for design specs.

## Tech Stack
- Next.js 14+ (App Router) on Vercel
- Supabase (Postgres + Storage)
- Deepgram Nova-2 for transcription
- Claude Sonnet via OpenRouter for AI evals
- Resend + react-email for notifications
- shadcn/ui + Tailwind CSS for UI
- Recharts for charts

## Preferences
- Use shadcn/ui components — don't build custom primitives
- Follow the semantic color system in call-eval-design-addendum.md
- Mobile-first, responsive design
- Clean, minimal, professional aesthetic (Linear/Stripe, not playful)
- TypeScript strict mode
- Server components by default, client components only when needed
- All API routes use the server-side Supabase client

## Patterns
- API routes use `createServerClient()` from `@/lib/supabase/server` (service role key)
- Client components use `createClient()` from `@/lib/supabase/client` (anon key via `@supabase/ssr`)
- Next.js 16 dynamic route params are `Promise<{}>` — must `await params` in server components and API routes
- Onboarding uses batch endpoint `POST /api/onboarding/complete` (single request for org + criteria + technicians)
- eval_criteria has `status` ('draft'/'published') and `target_pass_rate` (default 0.8) columns from the design addendum
- Org layout is server component that fetches org name; sidebar/header/mobile-nav are client components
- Sidebar visible on md+, mobile bottom nav visible below md (`pb-20 md:pb-0` on main content for nav clearance)
- Eval templates auto-match by industry in onboarding Step 2
- Always verify Supabase migrations are applied after creating them — local files don't auto-sync
- Validate API inputs with Zod before database operations — all POST/PATCH routes have Zod schemas
- Wrap `request.json()` in try/catch on all POST routes — return 400 for malformed JSON
- Sanitize error responses — `console.error` the real error, return generic message to client
- Use `Array.isArray()` guards on API response data in client components
- Check `response.ok` on all client-side `fetch()` calls before parsing JSON
- Documented solutions go in `docs/solutions/[category]/` for future reference
- Recording page: server component fetches technicians + org industry, passes to client `RecordingInterface`
- MediaRecorder MIME type detection: try `audio/webm;codecs=opus` first, fallback to `audio/mp4` for Safari
- Audio uploads go to Supabase Storage bucket `recordings` at path `[orgId]/[timestamp].[ext]`
- Deepgram transcription: POST to `https://api.deepgram.com/v1/listen` with `Token` auth header and audio as body
- Transcript list uses server component data fetch + client component for filtering (source, status, technician)
- Transcript detail: desktop uses 60/40 split panel, mobile uses shadcn Tabs component
- Audio player: custom component wrapping HTML5 `<audio>` with shadcn Slider for scrubbing
- Zod schemas validate all POST/PATCH endpoints; return 400 with `fieldErrors` on failure
- OpenRouter: model ID format is `anthropic/claude-sonnet-4`, requires `HTTP-Referer` and `X-Title` headers
- OpenRouter client (`src/lib/openrouter.ts`): AbortController timeout (45s default), sanitized error messages, `parseJsonResponse()` strips markdown fences
- Eval pipeline (`/api/evaluate`): atomic status guard using `.in("eval_status", ["pending", "failed"])` prevents duplicate evals, returns 409 on conflict
- Eval prompts (`src/lib/prompts/eval.ts`): system prompt sets evaluator role + rules, user prompt embeds transcript + criteria + few-shot examples + JSON schema
- Criteria CRUD: full REST at `/api/eval-criteria/` with nested `/[id]/examples/` routes; drag-to-reorder via `/reorder` endpoint with `Promise.all()` parallel updates
- Criteria inline editing: debounce 500ms for text fields via `useRef<Record<string, setTimeout>>`, instant save for booleans/selects/status
- Auto-trigger eval on transcript detail mount: `useRef` guard + empty deps `useEffect` prevents double-triggers
- Eval results display: circular progress indicator with color thresholds (green >=80%, amber >=50%, red <50%)
- Re-run eval: resets `eval_status` to "pending" client-side, calls `/api/evaluate` — atomic guard allows re-run from "failed" state
- Optimistic UI pattern: update local state immediately, POST async, rollback to `initialData` on error
- Technician stats: shared `computeTechnicianStats()` in `src/lib/technician-stats.ts` — used by both server pages and API routes
- Technician profile: server component fetches all data (technician, transcripts, eval results, criteria), passes to client `TechnicianProfile` with tabs (Overview, Call History, Training)
- Recharts radar chart: needs >=3 data points, falls back to horizontal bar chart for fewer; tooltip formatter must not annotate `value` type (use `Number(value)`)
- Recharts line chart: monthly aggregation via `YYYY-MM` key Map, `ReferenceLine` at 80% target
- Mock call generation (`/api/mock-call`): OpenRouter with temperature 0.7, 60s timeout; stores as `source: 'mock'`, auto-triggers eval
- Mock call prompts (`src/lib/prompts/mock-call.ts`): wrap user scenario in `<scenario>` XML delimiters for prompt injection defense
- Industry-specific scenario suggestions: `INDUSTRY_SCENARIOS` constant map in technician profile component
- Mock transcript badges: purple styling (`bg-purple-50 text-purple-700 border-purple-200`) in transcript list and detail
- Delete confirmation: use shadcn `AlertDialog` for all destructive operations (technician delete, etc.)
- UUID validation on path parameters: regex check at top of `[id]` route handlers
- Zod array bounds: `specialties` schema uses `.max(20)` on array, `.max(100)` on each string
- Never `.sort()` a memoized array directly — use `[...array].sort()` to avoid mutating cached value
- `NEXT_PUBLIC_APP_URL` must be set for server-to-server eval triggers; mock-call route skips eval trigger if not set
- Dashboard API (`/api/dashboard/[orgId]`): single GET endpoint returns 7 aggregated datasets (overview, criteriaPassRates, heatmapData, trendData, needsAttention, sparklineData, filter metadata)
- Dashboard aggregation: pre-compute `transcriptMap`, `resultsByCriteria`, `resultsByTranscript`, `completedByTech` Maps once for O(1) lookups instead of O(T*C*E) nested loops
- Dashboard date validation: `isNaN(date.getTime())` guard on parsed startDate/endDate query params, return 400 on invalid
- Dashboard filter state: URL-based via `useSearchParams` init + `router.replace()` on change; shared `filtersToParams()` helper avoids duplication
- Dashboard fetch: `AbortController` via `useRef` cancels stale requests on filter change; catch `AbortError` and return early; only set loading=false if not aborted
- Dashboard response validation: `Array.isArray(json.criteriaPassRates)` guard before `setData()` — prevents invalid data from corrupting client state
- Custom heatmap: HTML table with merged `getCellClasses()` returning bg + text Tailwind classes (Recharts has no native heatmap)
- Sparkline gradient IDs: use `React.useId()` for unique per-instance SVG gradient IDs — prevents collisions when multiple sparklines render
- Recharts v3 onClick typing: cast event to `Record<string, unknown>`, assert `activePayload` with optional chaining guards
- Skeleton layout: must mirror actual component container classes (grid cols, spacing) — zero layout shift on load
- Trend chart: weekly/monthly bucketing based on date range length (>90 days = monthly); toggleable technician lines with 8 distinct colors

## Known Issues
- No RLS on any Supabase tables (by design — no auth in this app)
- `SUPABASE_SERVICE_ROLE_KEY` needs to be set in `.env.local` for production; currently falls back to anon key with console warning
- The trigger function `update_updated_at_column` has a mutable search_path (Supabase lint warning, low priority)
