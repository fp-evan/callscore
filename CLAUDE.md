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

## Known Issues
- No RLS on any Supabase tables (by design — no auth in this app)
- `SUPABASE_SERVICE_ROLE_KEY` needs to be set in `.env.local` for production; currently falls back to anon key with console warning
- The trigger function `update_updated_at_column` has a mutable search_path (Supabase lint warning, low priority)
