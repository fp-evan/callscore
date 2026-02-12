# CallScore — AI-Powered Call Analysis Platform
## Architecture & Implementation Plan

---

## Table of Contents
1. [Product Overview](#product-overview)
2. [Tech Stack](#tech-stack)
3. [Data Model (Supabase)](#data-model)
4. [Application Architecture](#application-architecture)
5. [Phase 1: Foundation](#phase-1-foundation)
6. [Phase 2: Core Loop](#phase-2-core-loop)
7. [Phase 3: Eval Engine](#phase-3-eval-engine)
8. [Phase 4: Technician Layer](#phase-4-technician-layer)
9. [Phase 5: Dashboard & Analytics](#phase-5-dashboard--analytics)
10. [Phase 6: Email & Polish](#phase-6-email--polish)
11. [API Routes Summary](#api-routes-summary)
12. [Third-Party Integration Details](#third-party-integration-details)
13. [Prompting Strategy](#prompting-strategy)
14. [File/Folder Structure](#filefolder-structure)

---

## Product Overview

**CallScore** is a web app that helps field service companies (HVAC, plumbing, electrical, etc.) record technician sales calls, transcribe them, and run AI-powered evaluations against configurable checklists. Managers see aggregate performance dashboards. Technicians get training support via AI-generated mock calls.

### Core User Flows

1. **Org Onboarding**: Create org → configure industry/trade → set up eval criteria from templates → watch a demo mock transcript get analyzed live → ready to go
2. **Record & Evaluate**: Technician opens app on phone → taps record → finishes call → transcript is generated → AI evals run automatically → results visible immediately
3. **Paste & Evaluate**: User pastes an existing transcript → assigns it to a technician → AI evals run against it
4. **Review & Manage**: Manager opens dashboard → sees aggregate pass/fail rates per technician per criteria → drills into individual transcripts → sees flagged items with highlighted transcript sections
5. **Mock Call Training**: Manager generates a mock call scenario for a technician → AI creates a realistic transcript → evals run on it → used as a training example
6. **Email Notification**: After analysis completes → a branded email is sent with the eval summary, pass/fail results, and a link back to the full transcript view

### Key Constraints
- No authentication (any visitor can access any org)
- Multi-tenant by org selection (not by auth)
- Responsive (mobile-first for recording, desktop-first for dashboards)
- Low volume (no heavy queue infrastructure needed)
- Audio storage is optional (transcripts are the primary artifact)

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Framework** | Next.js 14+ (App Router) | Server components, server actions, API routes |
| **Hosting** | Vercel | Edge functions, automatic deployments |
| **Database** | Supabase (Postgres) | Row-level data, real-time subscriptions (optional) |
| **Storage** | Supabase Storage | Audio files (optional retention) |
| **Transcription** | Deepgram | Nova-2 model, speaker diarization, punctuation |
| **LLM (Evals)** | Claude Opus via OpenRouter | Structured eval output, few-shot prompting |
| **LLM (Mock Calls)** | Claude Opus via OpenRouter | Realistic transcript generation |
| **Email** | Resend + react-email | Transactional eval notification emails |
| **UI Components** | shadcn/ui + Tailwind CSS | Clean, minimal SaaS aesthetic |
| **Charts** | Recharts | Aggregate dashboard visualizations |
| **Audio Recording** | MediaRecorder API (browser) | In-browser recording, WAV/WebM output |

---

## Data Model

### Entity Relationship Overview

```
organizations (1) ──→ (many) technicians
organizations (1) ──→ (many) eval_criteria
organizations (1) ──→ (many) transcripts
technicians (1) ──→ (many) transcripts
transcripts (1) ──→ (many) eval_results
eval_criteria (1) ──→ (many) eval_results
eval_criteria (1) ──→ (many) few_shot_examples
```

### Table Schemas

#### `organizations`
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT NOT NULL, -- 'hvac', 'plumbing', 'electrical', 'general', etc.
  company_size TEXT, -- 'solo', '2-10', '11-50', '51-200', '200+'
  onboarding_completed BOOLEAN DEFAULT FALSE,
  notification_email TEXT, -- email address for eval notifications
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `technicians`
```sql
CREATE TABLE technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT, -- optional: 'senior tech', 'apprentice', etc.
  specialties TEXT[], -- ['hvac', 'plumbing']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `eval_criteria`
```sql
CREATE TABLE eval_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'Proper Introduction'
  description TEXT NOT NULL, -- 'Did the technician introduce themselves by name and company?'
  category TEXT, -- 'greeting', 'closing', 'sales_technique', 'compliance', etc.
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `few_shot_examples`
```sql
CREATE TABLE few_shot_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_criteria_id UUID REFERENCES eval_criteria(id) ON DELETE CASCADE,
  example_type TEXT NOT NULL, -- 'pass' or 'fail'
  transcript_snippet TEXT NOT NULL, -- the example transcript text
  explanation TEXT, -- why this is a pass or fail
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `transcripts`
```sql
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
  source TEXT NOT NULL, -- 'recording', 'paste', 'mock'
  raw_transcript TEXT NOT NULL, -- full transcript text
  diarized_transcript JSONB, -- speaker-separated segments from Deepgram
  summary TEXT, -- AI-generated summary
  audio_url TEXT, -- Supabase Storage URL (nullable)
  audio_duration_seconds INTEGER,
  service_type TEXT, -- what service was being sold/discussed
  location TEXT, -- optional geographic context
  metadata JSONB DEFAULT '{}', -- extensible metadata
  eval_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `eval_results`
```sql
CREATE TABLE eval_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,
  eval_criteria_id UUID REFERENCES eval_criteria(id) ON DELETE CASCADE,
  passed BOOLEAN, -- pass/fail result
  confidence FLOAT, -- 0.0-1.0, for future confidence scoring
  reasoning TEXT, -- AI explanation of why it passed/failed
  transcript_excerpt TEXT, -- relevant section of transcript that was evaluated
  excerpt_start_index INTEGER, -- character position in raw_transcript for highlighting
  excerpt_end_index INTEGER,
  eval_run_id UUID, -- groups results from the same eval run together
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `eval_templates`
```sql
CREATE TABLE eval_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- 'Standard Sales Call Checklist'
  description TEXT,
  industry TEXT, -- which industry this template is best for
  criteria JSONB NOT NULL, -- array of {name, description, category} objects
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes
```sql
CREATE INDEX idx_transcripts_org ON transcripts(organization_id);
CREATE INDEX idx_transcripts_tech ON transcripts(technician_id);
CREATE INDEX idx_transcripts_eval_status ON transcripts(eval_status);
CREATE INDEX idx_eval_results_transcript ON eval_results(transcript_id);
CREATE INDEX idx_eval_results_criteria ON eval_results(eval_criteria_id);
CREATE INDEX idx_eval_results_run ON eval_results(eval_run_id);
CREATE INDEX idx_eval_criteria_org ON eval_criteria(organization_id);
CREATE INDEX idx_technicians_org ON technicians(organization_id);
CREATE INDEX idx_few_shot_examples_criteria ON few_shot_examples(eval_criteria_id);
```

---

## Application Architecture

### High-Level Flow

```
[Browser: Record Audio] → [API: Upload to Supabase Storage]
                              ↓
[API: Send audio to Deepgram] → [Deepgram returns transcript + diarization]
                                      ↓
[API: Store transcript in DB] → [API: Run eval pipeline via OpenRouter/Opus]
                                      ↓
[API: Store eval results] → [API: Send email via Resend] → [UI: Display results]
```

### Alternative Flow (Paste Transcript)

```
[Browser: Paste transcript text] → [API: Store in DB] → [API: Run eval pipeline] → [API: Send email] → [UI: Display results]
```

### Mock Call Flow

```
[Admin: Describe scenario] → [API: Generate mock transcript via OpenRouter/Opus]
                                   ↓
[API: Store as 'mock' source transcript] → [API: Run eval pipeline] → [UI: Display as training example]
```

---

## Phase 1: Foundation

**Goal**: Project scaffold, Supabase setup, org onboarding flow, basic navigation.

### Tasks

1. **Initialize Next.js project**
   - `npx create-next-app@latest callscore --typescript --tailwind --app --src-dir`
   - Install dependencies: `@supabase/supabase-js`, `shadcn/ui` components, `lucide-react`
   - Configure Supabase client (environment variables for URL + anon key)

2. **Supabase schema setup**
   - Run all CREATE TABLE statements above
   - Seed `eval_templates` with 2-3 starter templates:
     - **Standard Sales Call**: Proper introduction, needs assessment, service explanation, pricing presentation, trial close, objection handling, next steps/scheduling
     - **Quick Service Visit**: Greeting, problem diagnosis explanation, upsell attempt, payment collection, follow-up scheduling
     - **HVAC-Specific**: All standard items + equipment model discussion, efficiency comparison, financing options mention

3. **App layout & navigation**
   - Top-level layout with org selector (dropdown/switcher in header)
   - Sidebar or tab navigation: Dashboard, Transcripts, Technicians, Eval Criteria, Settings
   - Mobile-responsive: bottom tab bar on mobile, sidebar on desktop
   - Org context stored in URL path: `/org/[orgId]/dashboard`, `/org/[orgId]/transcripts`, etc.

4. **Org onboarding flow** (`/onboarding`)
   - Step 1: Org name, industry (dropdown), company size (radio buttons)
   - Step 2: Select an eval template or start from scratch. If template selected, show the criteria for review/edit before confirming.
   - Step 3: Add technicians (name + optional role/specialties). Minimum 1, with "add more" button. Can be skipped.
   - Step 4: (Optional) Notification email for eval results
   - Step 5: Demo — system auto-generates a mock transcript using the org's industry context, runs evals against it live (with a loading/progress animation), shows the results. "Your org is ready!" CTA to go to dashboard.
   - On completion: set `onboarding_completed = true`, redirect to `/org/[orgId]/dashboard`

5. **Org selection landing page** (`/`)
   - List of existing organizations with name, industry badge, transcript count
   - "Create New Organization" button → goes to `/onboarding`
   - Click any org → goes to `/org/[orgId]/dashboard`

### Deliverables
- Working Next.js app deployed to Vercel
- Supabase tables created with seed templates
- Org creation/onboarding flow functional (without the demo eval in Step 5 — that requires Phase 3)
- Navigation shell with org context switching

---

## Phase 2: Core Loop

**Goal**: Recording UI, Deepgram transcription, transcript paste-in, transcript list and detail views.

### Tasks

1. **Recording UI** (`/org/[orgId]/record`)
   - Mobile-first design: large, centered record button
   - States: idle → recording (with timer + waveform visualization) → processing → done
   - Uses `MediaRecorder` API to capture audio in `audio/webm` format (best browser support)
   - On stop: upload audio blob to Supabase Storage bucket `recordings/[orgId]/[timestamp].webm`
   - Pre-recording form: select technician (dropdown), service type (text input), location (optional text input)
   - Post-recording: show "Processing..." state while transcription runs, then redirect to transcript detail view

2. **Deepgram transcription API route** (`/api/transcribe`)
   - Accepts audio file (from Supabase Storage URL or direct upload)
   - Calls Deepgram Nova-2 API with:
     - `model: "nova-2"`
     - `smart_format: true`
     - `diarize: true` (speaker separation)
     - `punctuate: true`
     - `utterances: true`
   - Returns: full transcript text + diarized segments (speaker labels + timestamps + text)
   - Stores result in `transcripts` table with `source: 'recording'`
   - Triggers eval pipeline (Phase 3) after storage

3. **Paste transcript UI** (`/org/[orgId]/paste`)
   - Large textarea for pasting transcript text
   - Same metadata form: select technician, service type, location
   - Submit: stores in `transcripts` table with `source: 'paste'`, `diarized_transcript: null`
   - Triggers eval pipeline after storage

4. **Transcript list view** (`/org/[orgId]/transcripts`)
   - Card/table list of all transcripts for the org
   - Each row shows: technician name, date, source badge (recorded/pasted/mock), service type, eval status badge (pending/completed), pass rate summary (e.g., "5/7 passed")
   - Sortable by date, filterable by technician, source, eval status
   - Click → navigate to transcript detail

5. **Transcript detail view** (`/org/[orgId]/transcripts/[id]`)
   - Two-panel layout (side-by-side on desktop, stacked on mobile):
     - **Left panel**: Full transcript with speaker labels (if diarized). Highlighted sections that correspond to eval results.
     - **Right panel**: Eval checklist results — each criteria with pass/fail badge, reasoning text, and "jump to" link that scrolls/highlights the relevant transcript section
   - Header: technician name, date, service type, location, source badge, AI-generated summary
   - Actions: re-run evals button, delete transcript

### Key Technical Decisions

- **Audio format**: `audio/webm;codecs=opus` is the most widely supported MediaRecorder format. Deepgram accepts this natively.
- **Upload flow**: Record → upload to Supabase Storage → send storage URL to Deepgram → store transcript. This avoids sending large blobs through API routes.
- **Audio retention**: Store audio in Supabase Storage but consider a cleanup job later. For MVP, keep everything.

### Deliverables
- In-browser recording that works on mobile Safari, Chrome, Firefox
- Deepgram transcription with speaker diarization
- Paste-in transcript flow
- Transcript list and detail views (detail view will show full results after Phase 3)

---

## Phase 3: Eval Engine

**Goal**: Eval criteria CRUD, the core AI evaluation pipeline, pass/fail results with reasoning, few-shot support, and re-run logic.

### Tasks

1. **Eval criteria management UI** (`/org/[orgId]/settings/criteria`)
   - List of all eval criteria for the org, ordered by `sort_order`
   - Each item shows: name, description, category badge, active/inactive toggle
   - Add new criteria: name, description, category (dropdown), sort order
   - Edit existing criteria inline or via modal
   - Delete with confirmation
   - Drag-to-reorder (updates `sort_order`)
   - "Add from template" button to import criteria from `eval_templates`

2. **Few-shot examples UI** (within criteria detail/edit)
   - For each eval criterion, expandable section showing few-shot examples
   - Add example: type (pass/fail radio), transcript snippet (textarea), explanation (textarea)
   - Examples are optional — criteria work without them, but improve accuracy when provided
   - Visual indicator on criteria list: "3 examples" badge or similar

3. **Eval pipeline API route** (`/api/evaluate`)
   - Input: `transcript_id`
   - Process:
     1. Fetch transcript text from DB
     2. Fetch all active eval criteria for the org
     3. For each criteria, fetch any few-shot examples
     4. Build the LLM prompt (see Prompting Strategy section)
     5. Call OpenRouter API with Claude Opus model
     6. Parse structured response (JSON)
     7. Store results in `eval_results` table
     8. Update transcript `eval_status` to 'completed'
     9. Generate AI summary of the call and store in `transcripts.summary`
     10. Trigger email notification (Phase 6)
   - Error handling: set `eval_status` to 'failed' if LLM call fails, store error in metadata

4. **Evaluation approach**
   - **Single LLM call** for all criteria per transcript (more efficient, better context)
   - Prompt includes: org context (industry, company name), all eval criteria with descriptions and few-shot examples, the full transcript
   - Response format: JSON array of results, one per criteria, each with:
     ```json
     {
       "criteria_id": "uuid",
       "passed": true/false,
       "confidence": 0.85,
       "reasoning": "The technician introduced themselves by name ('Hi, I'm Mike from Cool Air') in the first 30 seconds.",
       "excerpt": "Hi, I'm Mike from Cool Air HVAC. I'm here to take a look at your AC unit today.",
       "excerpt_start": 0,
       "excerpt_end": 82
     }
     ```

5. **Re-run logic** (`/api/evaluate/rerun`)
   - Options exposed in UI:
     - **Re-run this transcript**: Re-evaluates a single transcript with current criteria
     - **Re-run new criteria only**: For transcripts already evaluated, only runs the newly added criteria (checks which `eval_criteria_id`s are missing from `eval_results` for each transcript)
     - **Re-run from date**: Re-evaluates all transcripts from a selected date onward
     - **Re-run selected**: Checkbox selection on transcript list → bulk re-run
   - All re-runs: generate a new `eval_run_id`, delete old results for affected criteria, create new results
   - Warning modal for bulk re-runs: "This will re-evaluate X transcripts. Estimated cost: ~$Y. Continue?"

6. **Wire up transcript detail view** (from Phase 2)
   - Populate right panel with eval results after pipeline runs
   - Highlight transcript sections based on `excerpt_start_index` / `excerpt_end_index`
   - Pass/fail badges with color coding (green/red)
   - Expandable reasoning text per criteria

### Deliverables
- Full CRUD for eval criteria with few-shot example management
- Working eval pipeline: transcript → LLM → structured results
- Re-run logic with all four scope options
- Transcript detail view showing evaluation results with highlighted excerpts

---

## Phase 4: Technician Layer

**Goal**: Technician profiles, performance history, mock call generation as a training tool.

### Tasks

1. **Technician management** (`/org/[orgId]/technicians`)
   - List of all technicians with: name, role, specialties badges, total calls, overall pass rate
   - Add/edit/delete technicians
   - Click → technician profile

2. **Technician profile page** (`/org/[orgId]/technicians/[id]`)
   - Header: name, role, specialties, member since date
   - **Performance summary card**: overall pass rate, total transcripts evaluated, trend arrow (improving/declining)
   - **Per-criteria breakdown**: mini bar chart or table showing pass rate for each eval criterion (e.g., "Introduction: 90%, Trial Close: 45%, Objection Handling: 60%")
   - **Transcript history**: list of their transcripts with date, service type, pass count, link to detail view
   - **"Generate Mock Call" button**: opens mock call generation modal

3. **Mock call generation** (`/api/mock-call`)
   - Input: technician_id, scenario description (free text), org context
   - LLM generates a realistic two-party transcript (technician + customer)
   - The generated transcript uses the technician's name and the org's industry context
   - Prompt instructs the LLM to create a natural, realistic call that would be typical for the described scenario
   - Result is stored as a transcript with `source: 'mock'`
   - Eval pipeline runs automatically on the mock transcript
   - UI shows the mock transcript with eval results — serves as a training reference

4. **Mock call UI flow**
   - Modal or dedicated page: textarea for scenario description
   - Suggestions/examples based on org industry: "HVAC repair upsell to maintenance plan", "Emergency plumbing call with hesitant customer", "Electrical panel upgrade consultation"
   - Generate button → loading state → redirects to transcript detail view showing the mock call with eval results
   - Mock transcripts are visually distinguished (badge, different background color) in transcript lists

### Deliverables
- Technician CRUD and profile pages
- Per-technician performance breakdown by criteria
- Mock call generation with automatic eval
- Mock calls displayed as training examples in the UI

---

## Phase 5: Dashboard & Analytics

**Goal**: Aggregate performance dashboard with filtering, comparisons, and drill-downs.

### Tasks

1. **Org dashboard** (`/org/[orgId]/dashboard`)
   - **Overview cards** (top row):
     - Total transcripts evaluated
     - Overall pass rate (across all criteria, all techs)
     - Number of active technicians
     - Most common failure criteria
   - **Pass rate by criteria** (bar chart):
     - Horizontal bar chart showing each eval criterion and its org-wide pass rate
     - Color coded: green (>80%), yellow (50-80%), red (<50%)
     - Clickable → drills down to see which transcripts failed this criteria
   - **Technician comparison** (table or grouped bar chart):
     - Each tech as a row/group, columns/bars for each criteria showing their individual pass rate
     - Sortable by overall rate or by specific criteria
     - Visual: easy to spot who's strong where and who needs coaching on what
   - **Trend over time** (line chart):
     - Overall pass rate over time (by week or month depending on data volume)
     - Optional: per-technician trend lines
     - Shows whether coaching/training is working
   - **Recent transcripts needing attention**:
     - List of most recent transcripts with low pass rates (e.g., < 50% criteria passed)
     - Quick-access links to transcript detail views

2. **Filters** (persistent filter bar at top of dashboard):
   - Date range picker (last 7 days, 30 days, 90 days, custom)
   - Technician multi-select
   - Eval criteria multi-select
   - Service type filter
   - Source filter (recorded, pasted, mock — mock excluded by default from dashboard stats)

3. **Data aggregation**
   - Use Supabase/Postgres aggregate queries for performance
   - Key queries:
     ```sql
     -- Pass rate by criteria for an org
     SELECT ec.name, ec.id,
       COUNT(CASE WHEN er.passed THEN 1 END)::FLOAT / COUNT(er.id) as pass_rate,
       COUNT(er.id) as total_evals
     FROM eval_criteria ec
     JOIN eval_results er ON er.eval_criteria_id = ec.id
     JOIN transcripts t ON t.id = er.transcript_id
     WHERE ec.organization_id = $1
       AND t.source != 'mock'
       AND t.created_at BETWEEN $2 AND $3
     GROUP BY ec.id, ec.name;

     -- Pass rate by technician by criteria
     SELECT tech.name, tech.id, ec.name as criteria_name, ec.id as criteria_id,
       COUNT(CASE WHEN er.passed THEN 1 END)::FLOAT / COUNT(er.id) as pass_rate
     FROM technicians tech
     JOIN transcripts t ON t.technician_id = tech.id
     JOIN eval_results er ON er.transcript_id = t.id
     JOIN eval_criteria ec ON ec.id = er.eval_criteria_id
     WHERE tech.organization_id = $1
     GROUP BY tech.id, tech.name, ec.id, ec.name;
     ```
   - Consider creating Postgres views or materialized views if query performance becomes an issue

### Deliverables
- Full org dashboard with overview cards, charts, and drill-downs
- Technician comparison view
- Trend over time visualization
- Filtering across all dashboard views
- "Needs attention" transcript surfacing

---

## Phase 6: Email & Polish

**Goal**: Email notifications via Resend/react-email, onboarding demo flow completion, responsive UI polish.

### Tasks

1. **Email setup**
   - Install: `resend`, `@react-email/components`
   - Configure Resend API key in environment variables
   - Set up a sender domain or use Resend's default for MVP

2. **Eval notification email template**
   - Trigger: after eval pipeline completes for a transcript
   - Recipient: org's `notification_email` (if set)
   - Template content:
     - Header: CallScore logo/brand + "New Call Analysis Ready"
     - Call summary section: technician name, date, service type, AI-generated summary
     - Eval results grid: each criteria with pass/fail icon (✓/✗), color-coded, with one-line reasoning
     - Overall score: "5/7 criteria passed"
     - Highlight: any failed criteria called out prominently
     - CTA button: "View Full Transcript" → links to `/org/[orgId]/transcripts/[id]`
     - Footer: org name, "Powered by CallScore"
   - Design: clean, professional, matches app aesthetic. Use react-email components for consistent rendering across email clients.

3. **React-email template structure**
   ```
   emails/
     eval-notification.tsx  — main eval results email
     components/
       header.tsx           — reusable brand header
       eval-result-row.tsx  — pass/fail row component
       footer.tsx           — reusable footer
   ```

4. **Email API route** (`/api/send-email`)
   - Called by eval pipeline after results are stored
   - Fetches transcript, eval results, technician, org data
   - Renders react-email template with data
   - Sends via Resend API
   - Logs email send status in transcript metadata

5. **Complete onboarding demo flow** (from Phase 1, Step 5)
   - Now that eval pipeline exists (Phase 3) and mock call generation exists (Phase 4):
   - During onboarding Step 5: auto-generate a mock transcript using the org's industry + configured eval criteria
   - Run evals on it in real-time
   - Show animated progress: "Generating sample call..." → "Analyzing transcript..." → "Complete!"
   - Display results inline in the onboarding flow (mini version of transcript detail view)
   - "Go to Dashboard" CTA

6. **Responsive UI polish**
   - Review all pages on mobile (375px), tablet (768px), desktop (1280px+)
   - Recording page: large touch targets, minimal UI, clear status indicators
   - Transcript detail: stacked layout on mobile (transcript on top, eval below), side-by-side on desktop
   - Dashboard: stack charts vertically on mobile, grid on desktop
   - Navigation: bottom tabs on mobile, sidebar on desktop
   - Loading states, empty states, error states for all views

7. **General polish**
   - Toast notifications for actions (transcript created, eval complete, etc.)
   - Skeleton loading states for all data-dependent views
   - Confirmation dialogs for destructive actions (delete transcript, bulk re-run)
   - Favicon, meta tags, page titles

### Deliverables
- Branded eval notification emails sent automatically after each analysis
- Completed onboarding demo flow with live mock eval
- Fully responsive UI across mobile/tablet/desktop
- Polished loading, empty, and error states

---

## API Routes Summary

| Route | Method | Description | Phase |
|-------|--------|-------------|-------|
| `/api/organizations` | GET, POST | List orgs, create new org | 1 |
| `/api/organizations/[id]` | GET, PATCH | Get/update org | 1 |
| `/api/organizations/[id]/technicians` | GET, POST | List/add technicians | 1 |
| `/api/technicians/[id]` | GET, PATCH, DELETE | Manage technician | 4 |
| `/api/transcribe` | POST | Upload audio → Deepgram → store transcript | 2 |
| `/api/transcripts` | GET, POST | List transcripts (with filters), create from paste | 2 |
| `/api/transcripts/[id]` | GET, DELETE | Get/delete transcript | 2 |
| `/api/evaluate` | POST | Run eval pipeline on a transcript | 3 |
| `/api/evaluate/rerun` | POST | Re-run evals (single, bulk, by date, new-only) | 3 |
| `/api/eval-criteria` | GET, POST | List/create eval criteria for an org | 3 |
| `/api/eval-criteria/[id]` | GET, PATCH, DELETE | Manage single criterion | 3 |
| `/api/eval-criteria/[id]/examples` | GET, POST | List/add few-shot examples | 3 |
| `/api/eval-templates` | GET | List available eval templates | 1 |
| `/api/mock-call` | POST | Generate mock call transcript | 4 |
| `/api/dashboard/[orgId]` | GET | Aggregate dashboard data | 5 |
| `/api/send-email` | POST | Send eval notification email | 6 |

---

## Third-Party Integration Details

### Deepgram

- **API**: `https://api.deepgram.com/v1/listen`
- **Auth**: API key in `Authorization: Token YOUR_KEY` header
- **Request**: POST with audio file or URL
- **Key params**:
  ```json
  {
    "model": "nova-2",
    "smart_format": true,
    "diarize": true,
    "punctuate": true,
    "utterances": true,
    "language": "en"
  }
  ```
- **Response parsing**: Use `results.channels[0].alternatives[0].transcript` for full text, `results.utterances` for diarized segments
- **Cost**: ~$0.0043/min (Nova-2) — negligible for low volume

### OpenRouter (Claude Opus)

- **API**: `https://openrouter.ai/api/v1/chat/completions`
- **Auth**: API key in `Authorization: Bearer YOUR_KEY` header
- **Model**: `anthropic/claude-opus-4-20250514` (or latest Opus available on OpenRouter — verify at build time)
- **Request format** (OpenAI-compatible):
  ```json
  {
    "model": "anthropic/claude-opus-4-20250514",
    "messages": [
      {"role": "system", "content": "system prompt..."},
      {"role": "user", "content": "transcript + eval criteria..."}
    ],
    "temperature": 0.2,
    "max_tokens": 4096
  }
  ```
- **Response parsing**: `choices[0].message.content` — parse as JSON
- **Cost**: Variable by model — budget ~$0.10-0.50 per transcript evaluation depending on length

### Resend

- **API**: `https://api.resend.com/emails`
- **Auth**: API key in `Authorization: Bearer YOUR_KEY` header
- **Integration**: Use `resend` npm package with react-email templates
  ```typescript
  import { Resend } from 'resend';
  import { EvalNotificationEmail } from '@/emails/eval-notification';

  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: 'CallScore <notifications@yourdomain.com>',
    to: org.notification_email,
    subject: `Call Analysis: ${technician.name} — ${passCount}/${totalCount} passed`,
    react: EvalNotificationEmail({ /* props */ })
  });
  ```

---

## Prompting Strategy

### Eval Pipeline System Prompt

```
You are an expert call evaluator for field service companies. You analyze transcripts of technician sales calls and evaluate them against specific criteria.

You work for {{org_name}}, a {{org_industry}} company.

You will receive:
1. A transcript of a call between a technician and a customer
2. A set of evaluation criteria, each with a name and description
3. For some criteria, examples of what passing and failing looks like

Your job is to evaluate the transcript against EACH criterion and return structured results.

IMPORTANT RULES:
- Be fair but thorough. If a criterion was clearly met, mark it as passed.
- If a criterion was partially met or ambiguous, lean toward failing it but explain why in your reasoning.
- Always cite the specific part of the transcript that informed your decision.
- If the transcript is too short or doesn't contain enough context to evaluate a criterion, mark it as failed with reasoning explaining the lack of evidence.
- Return ONLY valid JSON. No markdown, no backticks, no explanation outside the JSON.
```

### Eval Pipeline User Prompt

```
## Transcript
{{raw_transcript}}

## Evaluation Criteria

{{#each criteria}}
### Criterion {{@index + 1}}: {{name}}
Description: {{description}}
{{#if few_shot_examples}}
Examples:
{{#each few_shot_examples}}
- {{type}} example: "{{transcript_snippet}}"
  {{#if explanation}}Explanation: {{explanation}}{{/if}}
{{/each}}
{{/if}}
{{/each}}

## Response Format

Return a JSON array with one object per criterion:
[
  {
    "criteria_id": "{{criteria_id}}",
    "criteria_name": "{{criteria_name}}",
    "passed": true | false,
    "confidence": 0.0 to 1.0,
    "reasoning": "Brief explanation of why this passed or failed, referencing the specific part of the transcript.",
    "excerpt": "The exact quote from the transcript that is most relevant to this criterion.",
    "excerpt_start": <character index where excerpt starts in the transcript>,
    "excerpt_end": <character index where excerpt ends in the transcript>
  }
]

Also include a final summary object at the end:
{
  "type": "summary",
  "summary": "A 2-3 sentence summary of the overall call: what happened, the outcome, and the general quality of the technician's performance."
}
```

### Mock Call Generation Prompt

```
You are a realistic call transcript generator for {{org_industry}} companies.

Generate a realistic transcript of a sales/service call between a technician named {{technician_name}} and a customer.

Scenario: {{scenario_description}}

Guidelines:
- Make the conversation natural, with realistic dialogue patterns (interruptions, filler words, clarifying questions)
- Include both the technician and customer speaking
- Format as:
  Technician: [dialogue]
  Customer: [dialogue]
- The call should be 3-5 minutes of dialogue (roughly 800-1500 words)
- Include realistic details for a {{org_industry}} context
- The technician should demonstrate some but not all of the following behaviors (to make evaluations interesting — not a perfect call):
{{#each eval_criteria}}
  - {{name}}: {{description}}
{{/each}}

Return ONLY the transcript text, no other commentary.
```

---

## File/Folder Structure

```
callscore/
├── src/
│   ├── app/
│   │   ├── layout.tsx                          # Root layout
│   │   ├── page.tsx                            # Landing page (org selector)
│   │   ├── onboarding/
│   │   │   └── page.tsx                        # Onboarding wizard
│   │   ├── org/
│   │   │   └── [orgId]/
│   │   │       ├── layout.tsx                  # Org-scoped layout with nav
│   │   │       ├── dashboard/
│   │   │       │   └── page.tsx                # Aggregate dashboard
│   │   │       ├── record/
│   │   │       │   └── page.tsx                # Recording UI
│   │   │       ├── paste/
│   │   │       │   └── page.tsx                # Paste transcript UI
│   │   │       ├── transcripts/
│   │   │       │   ├── page.tsx                # Transcript list
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx            # Transcript detail + eval results
│   │   │       ├── technicians/
│   │   │       │   ├── page.tsx                # Technician list
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx            # Technician profile
│   │   │       └── settings/
│   │   │           ├── page.tsx                # Org settings
│   │   │           └── criteria/
│   │   │               └── page.tsx            # Eval criteria management
│   │   └── api/
│   │       ├── organizations/
│   │       │   ├── route.ts                    # GET/POST orgs
│   │       │   └── [id]/
│   │       │       ├── route.ts                # GET/PATCH org
│   │       │       └── technicians/
│   │       │           └── route.ts            # GET/POST technicians
│   │       ├── technicians/
│   │       │   └── [id]/
│   │       │       └── route.ts                # GET/PATCH/DELETE technician
│   │       ├── transcribe/
│   │       │   └── route.ts                    # POST audio → Deepgram
│   │       ├── transcripts/
│   │       │   ├── route.ts                    # GET/POST transcripts
│   │       │   └── [id]/
│   │       │       └── route.ts                # GET/DELETE transcript
│   │       ├── evaluate/
│   │       │   ├── route.ts                    # POST run eval pipeline
│   │       │   └── rerun/
│   │       │       └── route.ts                # POST re-run evals
│   │       ├── eval-criteria/
│   │       │   ├── route.ts                    # GET/POST criteria
│   │       │   └── [id]/
│   │       │       ├── route.ts                # GET/PATCH/DELETE criterion
│   │       │       └── examples/
│   │       │           └── route.ts            # GET/POST few-shot examples
│   │       ├── eval-templates/
│   │       │   └── route.ts                    # GET templates
│   │       ├── mock-call/
│   │       │   └── route.ts                    # POST generate mock call
│   │       ├── dashboard/
│   │       │   └── [orgId]/
│   │       │       └── route.ts                # GET dashboard aggregates
│   │       └── send-email/
│   │           └── route.ts                    # POST send eval email
│   ├── components/
│   │   ├── ui/                                 # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── sidebar.tsx                     # Desktop sidebar nav
│   │   │   ├── mobile-nav.tsx                  # Mobile bottom tabs
│   │   │   ├── org-switcher.tsx                # Org selector dropdown
│   │   │   └── header.tsx                      # Top header bar
│   │   ├── onboarding/
│   │   │   ├── step-org-info.tsx
│   │   │   ├── step-eval-setup.tsx
│   │   │   ├── step-technicians.tsx
│   │   │   ├── step-notification.tsx
│   │   │   └── step-demo.tsx
│   │   ├── recording/
│   │   │   ├── record-button.tsx               # Main record/stop button
│   │   │   ├── waveform.tsx                    # Audio waveform visualization
│   │   │   └── recording-form.tsx              # Pre-recording metadata form
│   │   ├── transcripts/
│   │   │   ├── transcript-card.tsx             # List item component
│   │   │   ├── transcript-viewer.tsx           # Full transcript display with highlights
│   │   │   └── eval-results-panel.tsx          # Eval checklist panel
│   │   ├── eval/
│   │   │   ├── criteria-form.tsx               # Add/edit criteria
│   │   │   ├── criteria-list.tsx               # Sortable criteria list
│   │   │   ├── few-shot-form.tsx               # Add few-shot example
│   │   │   └── rerun-modal.tsx                 # Re-run options dialog
│   │   ├── technicians/
│   │   │   ├── technician-card.tsx
│   │   │   ├── performance-chart.tsx           # Per-criteria bar chart
│   │   │   └── mock-call-modal.tsx             # Mock call generation form
│   │   └── dashboard/
│   │       ├── overview-cards.tsx              # Top-level stat cards
│   │       ├── criteria-chart.tsx              # Pass rate by criteria bar chart
│   │       ├── tech-comparison.tsx             # Technician comparison table/chart
│   │       ├── trend-chart.tsx                 # Pass rate over time
│   │       └── attention-list.tsx              # Low-scoring transcripts
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                       # Browser Supabase client
│   │   │   ├── server.ts                       # Server-side Supabase client
│   │   │   └── types.ts                        # Generated DB types
│   │   ├── deepgram.ts                         # Deepgram API wrapper
│   │   ├── openrouter.ts                       # OpenRouter API wrapper
│   │   ├── resend.ts                           # Resend email wrapper
│   │   ├── prompts/
│   │   │   ├── eval-system.ts                  # Eval system prompt builder
│   │   │   ├── eval-user.ts                    # Eval user prompt builder
│   │   │   └── mock-call.ts                    # Mock call prompt builder
│   │   └── utils.ts                            # Shared utilities
│   └── emails/
│       ├── eval-notification.tsx                # Main eval email template
│       └── components/
│           ├── header.tsx
│           ├── eval-result-row.tsx
│           └── footer.tsx
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql              # All CREATE TABLE statements
│   └── seed.sql                                # Eval template seed data
├── public/
│   └── logo.svg                                # App logo
├── .env.local                                  # Environment variables
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

### Environment Variables (`.env.local`)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Deepgram
DEEPGRAM_API_KEY=your-deepgram-key

# OpenRouter
OPENROUTER_API_KEY=your-openrouter-key

# Resend
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=CallScore <notifications@yourdomain.com>

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## Build Order for Claude Code Sessions

When feeding this plan to Claude Code, work through the phases in order. Each phase is self-contained enough to be a single coding session (or a few).

**Session 1**: Phase 1 — Scaffold, DB, onboarding (sans demo step)
**Session 2**: Phase 2 — Recording, transcription, paste, transcript views
**Session 3**: Phase 3 — Eval criteria CRUD, eval pipeline, re-run logic
**Session 4**: Phase 4 — Technician profiles, mock calls
**Session 5**: Phase 5 — Dashboard and analytics
**Session 6**: Phase 6 — Email, complete onboarding demo, responsive polish

Each session should begin by reviewing this plan document for the relevant phase, then implementing. Test each phase before moving to the next.
