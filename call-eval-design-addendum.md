# CallScore — Design Spec Addendum
## Based on UI/UX Research (Gong, Observe.AI, Linear, ServiceTitan, etc.)

This addendum supplements `call-eval-plan.md` with specific design decisions derived from research into conversation intelligence tools, field service platforms, and high-density B2B dashboards.

---

## Global Design System

### Color Palette (Semantic)

| Token | Hex | Usage |
|-------|-----|-------|
| `pass` | `#22C55E` (green-500) | Pass badges, above-target metrics, checkmarks |
| `fail` | `#EF4444` (red-500) | Fail badges, below-threshold metrics, X icons |
| `warning` | `#F59E0B` (amber-500) | Needs review, processing states, caution |
| `neutral` | `#9CA3AF` (gray-400) | Not evaluated, disabled, placeholder |
| `evidence` | `#FEF3C7` (amber-50) | Highlighted transcript sections |
| `brand` | TBD — pick during build | Primary buttons, selected states, links |
| `surface` | `#FFFFFF` / `#F9FAFB` | Card backgrounds, page backgrounds |
| `border` | `#E5E7EB` (gray-200) | Card borders, dividers |
| `text-primary` | `#111827` (gray-900) | Headings, primary content |
| `text-secondary` | `#6B7280` (gray-500) | Labels, descriptions, timestamps |

### Typography
- Clean sans-serif (Inter or system font stack)
- Headings: semibold, no ALL CAPS
- Body: regular weight, 14-16px
- Data/numbers: tabular figures, medium weight

### Spacing & Layout
- Content-out design with generous whitespace (Linear-style)
- Cards with subtle borders, no heavy shadows
- 8px grid system
- Maximum content width: 1280px on desktop

---

## Screen-Specific Design Specs

### 1. Onboarding Wizard

**Layout**: Centered single-column, max-width 640px, horizontal stepper at top with step labels and time estimates (~2 min each).

**Step 1 — Org Info**: 
- Org name (text input)
- Industry (visual cards with icons: HVAC, Plumbing, Electrical, General — like Notion's persona-based branching)
- Company size (radio pills)

**Step 2 — Eval Criteria**:
- Split view: criteria editor left, live preview right
- Pre-populated from industry-specific template (selected in Step 1)
- Each criterion is an editable card: name, description, category badge
- "Add criterion" button at bottom
- "Customize later" option to skip detailed editing
- Right preview pane shows a mock transcript snippet with the criteria being applied (static preview, not live AI — that happens in Step 5)

**Step 3 — Add Technicians**:
- Simple repeating form: name + optional role/specialties
- "Add another" button
- "Skip for now" option

**Step 4 — Notification Email**:
- Single email input
- "Skip" option
- Brief explanation: "We'll send a summary email after each call evaluation"

**Step 5 — Live Demo**:
- Animated progress: "Generating sample call..." → "Analyzing transcript..." → "Complete!"
- Results shown inline: mini transcript view with eval checklist
- "Go to Dashboard" CTA

**Transitions**: Smooth horizontal slide between steps. Progress bar fills incrementally.

---

### 2. Recording Interface

**Mobile-first, maximum simplicity. Fewer elements than a stopwatch app.**

**Layout**: Full-screen, centered content, bottom navigation hidden during recording.

**States**:

| State | Visual | Primary Element | Secondary |
|-------|--------|----------------|-----------|
| **Idle** | Gray background, calm | 80-100pt circular "Record" button (brand color) | Technician selector dropdown, service type input (optional) |
| **Recording** | Subtle red tint or border | Pulsing red record button, waveform visualization, timer counting up | "Stop" label on button, minimal chrome |
| **Processing** | Amber accent | Spinner animation, "Analyzing your call..." text | Progress indication if possible |
| **Complete** | Green accent | Checkmark icon, pass rate preview (e.g., "5/7 criteria passed") | "View Evaluation" CTA button, "Record Another" secondary |

**Key UX rules**:
- Touch targets minimum 64dp (gloved/wet hands)
- Pre-recording metadata (technician, service type) is ABOVE the record button, never blocking it
- Metadata fields are optional — recording starts regardless
- No text input required to start recording
- Waveform or pulse animation is mandatory during recording (trust signal)

**Mobile Navigation**: Bottom tab bar with 4 tabs: Record (dominant/centered), Transcripts, Dashboard, Settings. Record tab uses a floating action button style — larger and visually elevated.

---

### 3. Transcript Detail View

**Desktop**: Split panel — 60% transcript (left), 40% evaluation (right)
**Mobile**: Tab-based — [Transcript] [Evaluation] tabs with floating audio player at bottom

**Transcript Panel (Left)**:
- AI-generated summary (3-5 sentences) at top in a subtle card
- Speaker-labeled transcript with timestamps
- Highlighted sections in `evidence` yellow (`#FEF3C7`) corresponding to eval results
- Clicking a highlighted section scrolls the right panel to the corresponding eval item and vice versa (BIDIRECTIONAL)

**Evaluation Panel (Right)**:
- Overall score at top: "5/7 criteria passed" with a circular progress indicator
- Each eval item is a card:
  - Pass/fail icon (✓ green / ✗ red) + criterion name
  - One-line reasoning text
  - "View evidence" link → highlights and scrolls to relevant transcript section
  - Expandable: full reasoning, confidence score (when implemented), excerpt text
- Re-run button at bottom of panel

**Audio Player (Top, full-width on desktop / floating bottom on mobile)**:
- Waveform visualization with colored markers at positions corresponding to eval-relevant moments
- Play/pause, skip 15s, playback speed control
- Clicking a waveform marker jumps to that transcript section

**Bidirectional Navigation (CRITICAL)**:
- Click eval item → transcript panel scrolls to highlighted excerpt, highlight pulses briefly
- Click transcript highlight → eval panel scrolls to corresponding item, item briefly expands
- Highlight colors can vary by eval category for scanability

---

### 4. Aggregate Dashboard

**Layout (top → bottom)**:

**1. Global Filter Bar** (sticky at top):
- Date range picker (presets: 7d, 30d, 90d, custom)
- Technician multi-select dropdown
- Eval criteria multi-select dropdown
- Source filter (recorded/pasted — mock excluded by default)

**2. KPI Cards Row** (4 cards):
- **Overall Pass Rate**: Large percentage + 30-day sparkline + delta vs. previous period
- **Total Evaluations**: Count + sparkline
- **Most Improved Technician**: Name + improvement percentage
- **Weakest Criteria**: Criterion name + fail rate

Each card: white background, subtle border, number in 24-32px semibold, sparkline in brand color, delta in green (↑) or red (↓).

**3. Heatmap — Tech × Criteria** (PRIMARY VISUALIZATION):
- Rows: technicians (sorted by overall score)
- Columns: eval criteria
- Cells: colored by pass rate (green → yellow → red gradient)
- Cell value: pass rate percentage
- Click any cell → drills down to that technician's transcripts filtered by that criterion
- This single visualization answers "who needs coaching on what" in one glance

**4. Criteria Pass Rate — Horizontal Bar Chart**:
- Each criterion as a horizontal bar
- Color-coded: green (>80%), amber (50-80%), red (<50%)
- Sorted by pass rate (worst at top for attention prioritization)
- Target line overlay if org sets target thresholds

**5. Trend Over Time — Line Chart**:
- Overall pass rate as primary line
- Optional: toggle individual technician lines on/off
- X-axis: weeks or months depending on date range
- Hover: tooltip with exact values

**6. Needs Attention Table**:
- Recent transcripts with pass rate below 50%
- Columns: date, technician, service type, pass rate, quick-view link
- Sorted by date (most recent first)
- Max 10 rows with "View all" link

---

### 5. Technician Profile Page

**Tab Structure**: Overview | Call History | Training

**Overview Tab**:

**Hero Section**:
- Avatar (initials-based, colored by performance tier)
- Name, role, specialties as badges
- Overall pass rate as a large circular progress badge
- Member since date
- "vs. team" indicator: "Top 25%" or percentile rank

**Radar Chart** (hero visualization):
- 5-7 axes, one per eval criteria category
- Filled area shows the technician's pass rates
- Optional: overlay team average as a dotted line for comparison
- Recharts `RadarChart` component

**Scores Over Time** (line chart):
- Monthly average eval score over last 6-12 months
- Shows trajectory — improving, declining, or flat

**Call History Tab**:
- Sortable table: date, service type, source badge, overall score, pass/fail breakdown, link to detail
- Filterable by date range, score range, criteria

**Training Tab**:
- "Generate Practice Call" button (prominent)
- Scenario description input with industry-specific suggestions
- Practice call history with scores
- Coaching notes section (V2 — placeholder in MVP)

---

### 6. Settings — Eval Criteria Management

**Layout**: Left sidebar navigation (Account, Workspace, Team) with spacious content area.

**Eval Criteria Page**:

**Criteria List**:
- Drag-to-reorder (updates sort_order)
- Each criterion is an expandable card:
  - Header: name, category badge, status badge (Draft/Published), active toggle
  - Expanded: description, AI evaluation instructions, few-shot examples count
  - Actions: Edit, Test, Delete

**Criterion Editor** (modal or inline expand):
- Name (text input)
- Description (textarea) — "What should the AI check for?"
- Category (dropdown: greeting, diagnosis, sales_technique, compliance, closing, follow_up)
- Status: Draft / Published toggle
  - Draft: criterion exists but is NOT included in evaluations
  - Published: criterion IS included in evaluations
  - New criteria default to Draft
- Few-shot examples section (collapsible):
  - List of example cards, each with: type (pass/fail badge), transcript snippet, explanation
  - "Add Example" button
  - Examples are optional — "Add examples to improve AI accuracy" helper text
- **"Test Against Sample" button**: 
  - Opens a modal with a dropdown of existing transcripts (or paste new text)
  - Runs ONLY this criterion against the selected transcript
  - Shows the pass/fail result, reasoning, and excerpt inline
  - This is the most important UX element on this page

**Inline editing with auto-save**: Changes save automatically with subtle toast confirmation. No "Save" / "Cancel" buttons — use debounced auto-save.

---

### 7. Email Template Design Spec

**Style**: Stripe-inspired — clean, minimal, single-column, no decorative illustrations.

**Layout (top → bottom)**:

1. **Header**: CallScore logo (small), org name
2. **Hero Badge**: Technician name + date + overall score as a large colored circle
   - Green circle: ≥80% pass rate
   - Amber circle: 50-79% pass rate  
   - Red circle: <50% pass rate
3. **Metric Cards Row** (3 cards inline):
   - Overall Score (percentage)
   - Criteria Passed (e.g., "5/7")
   - Change vs. Last Period (e.g., "+8%" in green or "-3%" in red)
4. **Category Breakdown**: 
   - Each eval criterion as a row: criterion name + pass/fail icon + one-line reasoning
   - Failed criteria visually emphasized (red left border or background tint)
5. **Call Summary**: 2-3 sentence AI-generated summary of the call
6. **CTA Button**: "View Full Evaluation" → links to transcript detail page in app
7. **Footer**: "Powered by CallScore" + notification settings link + org name

**Technical notes for react-email**:
- Use `@react-email/components`: Container, Section, Row, Column, Text, Button, Hr, Img
- Inline styles only (email client compatibility)
- Max-width: 600px
- Test in Gmail, Outlook, Apple Mail

---

## Data Model Additions

Based on design research, add these columns:

```sql
-- Add draft/published status to eval_criteria
ALTER TABLE eval_criteria ADD COLUMN status TEXT DEFAULT 'published'; 
-- Values: 'draft', 'published'

-- Add target pass rate threshold (for dashboard target lines)
ALTER TABLE eval_criteria ADD COLUMN target_pass_rate FLOAT DEFAULT 0.8;
```

Update the eval pipeline to only include criteria where `status = 'published'` when running evaluations.

---

## V2 Feature Backlog (from research, explicitly deferred)

These emerged from the research as valuable but are out of scope for MVP:

1. **Background recording** — Service worker based, complex cross-browser
2. **Voice-to-text metadata input** — Second Deepgram call per field
3. **Clean transcript toggle** — Strip filler words via NLP
4. **Cross-filtering on dashboard** — Click one chart filters all others
5. **Coaching notes** — Notes table linked to calls and technicians
6. **vs-team distribution widget** — Bell curve or percentile visualization
7. **Save-and-resume onboarding** — Persist wizard state across sessions
8. **Progressive AI trust** — Confirm/dispute buttons per eval item
9. **Auto-record mode** — Triggered by job status change in dispatch system
10. **Configurable dashboard widgets** — Add/remove/rearrange chart cards
11. **Annotations on dashboard** — Manager notes on data points ("John was on vacation")
12. **Certification milestones** — Gamified training progress tracking
