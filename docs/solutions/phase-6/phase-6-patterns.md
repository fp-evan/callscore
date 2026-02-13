# Phase 6: Email Notifications & Responsive Polish

## Overview
Phase 6 implements an automated email notification system using React Email + Resend, triggered after call evaluations complete. This phase also introduces responsive refinements, loading skeletons, and settings management for notification configuration.

## Email Template System

### Architecture
The email system is built with modular, reusable components using `@react-email/components`. All styling uses inline CSS (required for email client compatibility).

**Component Structure:**
- `src/emails/eval-notification.tsx` — Main template component with scoring logic
- `src/emails/components/email-header.tsx` — Organization branding header
- `src/emails/components/eval-result-row.tsx` — Individual criterion pass/fail row
- `src/emails/components/email-footer.tsx` — Footer with settings link

### Main Template: EvalNotificationEmail

**Location:** `src/emails/eval-notification.tsx`

**Interface:**
```typescript
export interface EvalNotificationEmailProps {
  orgName: string;
  orgId: string;
  technicianName: string;
  transcriptId: string;
  date: string;
  passRate: number;              // 0.0–1.0
  passedCount: number;
  totalCount: number;
  changeVsPrevious: number | null; // null for first eval
  results: EvalCriterionResult[];
  summary: string | null;
  appUrl: string;
}
```

**Key Features:**

1. **Hero Score Badge** — Large centered circle showing pass rate percentage
   - Green (≥80%), Amber (≥50%), Red (<50%)
   - Uses `getScoreColor()` helper function
   - Positioned above technician name and date

2. **Metric Cards** — Three-column grid showing:
   - Overall Score (colored percentage)
   - Criteria Passed (count fraction)
   - vs. Previous (delta with arrow indicator)
   - Change indicator calls `formatChange()` to return text and color

3. **Criteria Breakdown** — List of passed/failed criteria
   - Sorted by status: failed criteria first (for visibility)
   - Each row is an `<EvalResultRow />` component with icon (✓/✗)
   - Reasoning truncated to 80 characters with ellipsis

4. **Call Summary** — Optional section displaying the eval summary (if available)

5. **CTA Button** — "View Full Evaluation" button linking to transcript detail page

### Component: EvalResultRow

**Location:** `src/emails/components/eval-result-row.tsx`

Renders individual criterion evaluation with status-specific styling.

**Props:**
```typescript
interface EvalResultRowProps {
  criterionName: string;
  passed: boolean;
  reasoning: string;
}
```

**Styling:**
- **Passed rows:** Gray background (`#F9FAFB`), green left border (`3px solid #22C55E`), checkmark icon
- **Failed rows:** Light red background (`#FEF2F2`), red left border (`3px solid #EF4444`), X icon
- Reasoning text truncated to 80 characters (`reasoning.slice(0, 77) + "..."`)

### Component: EmailHeader & EmailFooter

**EmailHeader:**
- Centered "CallScore" logo (24px, bold)
- Organization name below (13px, muted gray)
- Divider line

**EmailFooter:**
- "Powered by CallScore" text
- "Manage notification settings" link to org settings page
- Organization name

### Inline Styles Pattern

All styles are defined as `React.CSSProperties` objects. Key patterns:

```typescript
const heroSection: React.CSSProperties = {
  padding: "32px 24px 16px",
  textAlign: "center" as const, // Required for TSC strict mode
};

const scoreBadge: React.CSSProperties = {
  width: "80px",
  height: "80px",
  borderRadius: "50%",
  display: "inline-block",
  lineHeight: "80px",
  // ... dynamically merged with backgroundColor
};
```

**Note:** All color values use hex codes (`#111827`, `#22C55E`, etc.) for email client compatibility.

## Send Email API

### POST /api/send-email

**Location:** `src/app/api/send-email/route.ts`

This is the only public email endpoint. It enforces an internal-only guard and performs atomic email sending with metadata tracking.

**Request:**
```typescript
{
  transcriptId: string; // UUID
}
```

**Internal Security:**
- Checks `x-internal-secret` header against `INTERNAL_API_SECRET` env var
- Returns 401 if header missing and env var is set
- Only called internally from eval pipeline via `sendEvalEmailAsync()`

**Workflow:**

1. **Fetch Transcript + Organization + Technician**
   ```typescript
   const { data: transcript } = await supabase
     .from("transcripts")
     .select("*, organizations(...), technicians(name)")
     .eq("id", transcriptId)
     .single();
   ```

2. **Validate Notification Email**
   - Returns `{ sent: false, reason: "no_email_configured" }` if `org.notification_email` is null
   - Non-blocking — doesn't fail the eval pipeline

3. **Aggregate Eval Results**
   - Fetches all `eval_results` for the transcript
   - Maps to typed array: `{ criterionName, passed, reasoning }`
   - Calculates `passRate` as `passedCount / totalCount`

4. **Calculate Change vs. Previous**
   - Queries previous transcript for same technician (most recent with `eval_status = 'completed'`)
   - Fetches previous eval results and calculates previous pass rate
   - Computes delta: `changeVsPrevious = currentRate - previousRate`
   - Returns null for first evaluation

5. **Prepare Email Props**
   - Formats date: `new Date(created_at).toLocaleDateString("en-US", {...})`
   - Builds app URL with fallback: `NEXT_PUBLIC_APP_URL || "https://callscore.vercel.app"`
   - Creates CTA link: `${appUrl}/org/${orgId}/transcripts/${transcriptId}`

6. **Send via Resend**
   ```typescript
   const result = await resend.emails.send({
     from: process.env.RESEND_FROM_EMAIL || "CallScore <onboarding@resend.dev>",
     to: org.notification_email,
     subject: `Call Evaluation: ${techName} — ${passedCount}/${totalCount} passed`,
     react: EvalNotificationEmail(emailProps),
   });
   ```

7. **Store Email Metadata**
   - Updates `transcript.metadata` with:
     - `emailSent: true/false`
     - `emailId: string | null` (Resend response ID)
     - `emailError: string` (on failure)
   - **Array guard:** Always check `!Array.isArray(metadata)` before spread
     ```typescript
     const existingMetadata =
       typeof transcript.metadata === "object" &&
       transcript.metadata !== null &&
       !Array.isArray(transcript.metadata)
         ? transcript.metadata
         : {};
     ```

**Responses:**

Success (200):
```json
{ "sent": true, "emailId": "..." }
```

Graceful Degradation (200):
```json
{ "sent": false, "reason": "no_email_configured" }
{ "sent": false, "reason": "no_eval_results" }
{ "sent": false, "reason": "email_service_not_configured" }
{ "sent": false, "reason": "send_failed" }
```

Error Responses:
- 400: Invalid JSON or validation failure
- 401: Unauthorized (wrong internal secret)
- 404: Transcript or organization not found
- 500: Internal error (still stores error in metadata)

**Key Pattern — Metadata Array Guard:**

When spreading metadata from database, always validate it's an object (not array) first:

```typescript
const existingMetadata =
  typeof transcript.metadata === "object" &&
  transcript.metadata !== null &&
  !Array.isArray(transcript.metadata)
    ? transcript.metadata
    : {};

await supabase
  .from("transcripts")
  .update({
    metadata: {
      ...existingMetadata,
      emailSent: true,
      emailId: result.data?.id || null,
    },
  })
  .eq("id", transcriptId);
```

## Fire-and-Forget Email Wiring

### sendEvalEmailAsync() Helper

**Location:** `src/lib/send-eval-email.ts`

Async, non-blocking email trigger called from eval pipeline after results are stored. Never throws.

```typescript
export async function sendEvalEmailAsync(transcriptId: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.warn("sendEvalEmailAsync: NEXT_PUBLIC_APP_URL not set — skipping email");
    return;
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const internalSecret = process.env.INTERNAL_API_SECRET;
    if (internalSecret) {
      headers["x-internal-secret"] = internalSecret;
    }

    const res = await fetch(`${appUrl}/api/send-email`, {
      method: "POST",
      headers,
      body: JSON.stringify({ transcriptId }),
    });

    if (!res.ok) {
      console.error("sendEvalEmailAsync: email API returned", res.status);
    }
  } catch (err) {
    console.error("sendEvalEmailAsync: failed to send email:", err);
  }
}
```

**Called from:** `src/app/api/evaluate/route.ts` after eval results are stored

```typescript
// 7. Fire-and-forget email notification (skip for mock transcripts)
if (transcript.source !== "mock") {
  sendEvalEmailAsync(transcriptId).catch(() => {});
}
```

**Key Behaviors:**
- Skips if `NEXT_PUBLIC_APP_URL` not set (logs warning)
- Only sends for real transcripts (`source !== "mock"`)
- Uses `fetch()` to avoid circular dependencies between routes
- Passes `x-internal-secret` header when env var is set
- Never blocks eval pipeline — caught errors are logged, not thrown

## Settings Page

### Server Component: SettingsPage

**Location:** `src/app/org/[orgId]/settings/page.tsx`

Server component that fetches organization data and passes to client form.

```typescript
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = createServerClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (!org) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <SettingsForm org={org} />
    </div>
  );
}
```

### Client Component: SettingsForm

**Location:** `src/app/org/[orgId]/settings/settings-form.tsx`

Manages local state and sends PATCH request to update organization.

**Key Features:**

1. **Notification Email Field**
   - Input accepts email or blank
   - On save, converts blank to `null`

2. **Organization Name Field**
   - Read-only except for name (industry/company_size are display-only)

3. **Validation**
   - Save button disabled if org name is empty
   - Client-side trimming before send

4. **State Management**
   ```typescript
   const [notificationEmail, setNotificationEmail] = useState(org.notification_email || "");
   const [orgName, setOrgName] = useState(org.name);
   const [saving, setSaving] = useState(false);
   ```

5. **PATCH Request**
   ```typescript
   async function handleSave() {
     setSaving(true);
     try {
       const res = await fetch(`/api/organizations/${org.id}`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           name: orgName.trim(),
           notification_email: notificationEmail.trim() || null,
         }),
       });
       if (!res.ok) throw new Error("Failed to save");
       toast.success("Settings saved");
     } catch {
       toast.error("Failed to save settings");
     } finally {
       setSaving(false);
     }
   }
   ```

### API Route: PATCH /api/organizations/[id]

**Location:** `src/app/api/organizations/[id]/route.ts`

**Zod Schema — Email Union Transform:**

The critical pattern here is the union transform that prevents empty strings from bypassing email validation:

```typescript
const updateOrgSchema = z.object({
  notification_email: z
    .union([z.string().email(), z.literal("")])
    .nullable()
    .transform((v) => (v === "" ? null : v))
    .optional(),
  // ... other fields
});
```

**Why this works:**
- `.union([z.string().email(), z.literal("")])` — accepts either valid email OR empty string
- `.transform((v) => (v === "" ? null : v))` — converts empty string to `null`
- Final database value: `null` (not empty string), which skips email sending in API

**Alternative (cleaner but older Zod):**
```typescript
notification_email: z
  .string()
  .email()
  .nullable()
  .or(z.literal(""))
  .transform((v) => (v === "" ? null : v))
  .optional(),
```

## Loading Skeletons

### Pattern: Mirror Container Classes

Skeletons must mirror the exact container structure of the actual component to achieve zero layout shift on load.

**Example: Technicians List Loading**

**Location:** `src/app/org/[orgId]/technicians/loading.tsx`

```typescript
export default function TechniciansLoading() {
  return (
    <div className="space-y-6">
      {/* Header mirrors actual page structure */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 rounded bg-muted animate-pulse" />
        <div className="h-9 w-36 rounded bg-muted animate-pulse" />
      </div>

      {/* Grid mirrors actual technician card grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-5">
              {/* Card content structure matches TechnicianCard */}
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 shrink-0 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  {/* Lines for name, specialty, badges */}
                  <div className="h-5 w-32 rounded bg-muted" />
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="flex gap-1">
                    <div className="h-5 w-16 rounded bg-muted" />
                    <div className="h-5 w-16 rounded bg-muted" />
                  </div>
                </div>
              </div>
              {/* Stats section */}
              <div className="flex items-center gap-6 mt-4 pt-4 border-t">
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

**Key Points:**
- Same grid classes: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`
- Same Card wrapper with `animate-pulse`
- Same internal spacing: `flex items-start gap-4`, `flex-1 space-y-2`
- 3 skeleton cards (typical for initial load)
- Divider line in stats section: `pt-4 border-t`

**Example: Transcripts List Loading**

**Location:** `src/app/org/[orgId]/transcripts/loading.tsx`

```typescript
export default function TranscriptsLoading() {
  return (
    <div className="space-y-4">
      {/* Title + buttons */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 rounded bg-muted animate-pulse" />
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded bg-muted animate-pulse" />
          <div className="h-8 w-20 rounded bg-muted animate-pulse" />
        </div>
      </div>

      {/* Filter badges */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-28 rounded bg-muted animate-pulse" />
        ))}
      </div>

      {/* Transcript rows */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-muted" />
                  <div className="h-3 w-full max-w-xs rounded bg-muted" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-16 rounded bg-muted" />
                  <div className="h-5 w-16 rounded bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

**Structure Matching:**
- Same spacing: `space-y-4`, `space-y-2` for rows
- Filter badges: `flex flex-wrap gap-2`
- Row layout: `flex items-center justify-between`, `flex-1 space-y-2`
- Status badges on right: `gap-2` containers

## Metadata & Accessibility

### Title Template Pattern

**Location:** `src/app/layout.tsx`

```typescript
export const metadata: Metadata = {
  title: {
    default: "CallScore — AI-Powered Call Analysis",
    template: "%s — CallScore", // Appended to all pages
  },
  description: "Record, transcribe, and evaluate technician sales calls with AI-powered analysis.",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%23111827'/><text x='50' y='68' font-size='55' font-weight='700' text-anchor='middle' fill='white'>C</text></svg>",
        type: "image/svg+xml",
      },
    ],
  },
  openGraph: {
    type: "website",
    title: "CallScore — AI-Powered Call Analysis",
    description: "Record, transcribe, and evaluate technician sales calls with AI-powered analysis.",
    siteName: "CallScore",
  },
};
```

**How it works:**
- `template: "%s — CallScore"` — any page with `title: "Foo"` becomes "Foo — CallScore"
- SVG favicon: dark circle with white "C" (no external file needed)
- OpenGraph tags for social sharing

### Page-Level Metadata

**Onboarding Layout:**
```typescript
export const metadata: Metadata = { title: "Set Up Your Organization" };
```

**Settings Page:**
```typescript
export const metadata: Metadata = { title: "Settings" };
```

**Result:** "Set Up Your Organization — CallScore", "Settings — CallScore"

### Aria Labels

Applied to interactive components:
- Audio player controls: `aria-label="Play audio"`, `aria-label="Pause audio"`
- Technician action buttons: `aria-label="Edit technician"`, `aria-label="Delete technician"`

## Responsive Polish

### Touch Device Visibility Pattern

**Pattern:** Always visible on mobile (touch), hover-visible on desktop

```typescript
className="md:opacity-0 md:group-hover:opacity-100"
```

Used on:
- Technician action buttons (edit/delete)
- Transcript row actions
- Criteria edit buttons

**Reasoning:** Touch devices can't hover; desktop users expect action buttons to appear on hover to reduce clutter.

### Dashboard Refreshing Indicator

```typescript
className="bottom-20 md:bottom-4"
```

**Why:** Mobile nav is fixed at bottom (`h-20`), so indicator positioned `bottom-20` stays above it. On desktop (`md:`), positioned `bottom-4` for better spacing.

### Hidden Badges on Mobile

```typescript
className="hidden sm:inline-flex"
```

Used on:
- Specialty badges in technician cards
- Criteria badges in transcript detail

Hides on very small screens to prevent text overflow.

## Environment Configuration

### Required Variables

```bash
# Email sending
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=CallScore <noreply@callscore.com>
INTERNAL_API_SECRET=your-secret-key  # Optional, prevents external API abuse

# For fire-and-forget email trigger
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Existing vars
OPENROUTER_API_KEY=sk_...
DEEPGRAM_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Graceful Degradation

If email is not configured:
- `RESEND_API_KEY` missing → returns `{ sent: false, reason: "email_service_not_configured" }`
- `NEXT_PUBLIC_APP_URL` missing → `sendEvalEmailAsync()` logs warning and skips
- `notification_email` on org → returns `{ sent: false, reason: "no_email_configured" }`

**None of these failures block the eval pipeline.**

## Review Fixes Applied

### 1. Zod Empty String Bypass Prevention

**Issue:** Empty string could bypass email validation in Zod schema.

**Solution:** Use union transform to explicitly handle empty strings:

```typescript
const updateOrgSchema = z.object({
  notification_email: z
    .union([z.string().email(), z.literal("")])
    .nullable()
    .transform((v) => (v === "" ? null : v))
    .optional(),
});
```

### 2. Array Metadata Spread Guard

**Issue:** If `metadata` is accidentally an array, spreading would crash.

**Solution:** Type guard before spread:

```typescript
const existingMetadata =
  typeof transcript.metadata === "object" &&
  transcript.metadata !== null &&
  !Array.isArray(transcript.metadata)
    ? transcript.metadata
    : {};
```

### 3. Skeleton Layout Shift Prevention

**Issue:** Skeleton layouts that don't match actual component layout cause layout shift on hydration.

**Solution:** Ensure skeleton container classes exactly match actual page structure (grid cols, spacing, borders).

## Integration Checklist

- [ ] `.env.local` has `RESEND_API_KEY`, `INTERNAL_API_SECRET`, `RESEND_FROM_EMAIL`
- [ ] `NEXT_PUBLIC_APP_URL` is set to your app URL
- [ ] Email is only sent for non-mock transcripts
- [ ] Notification email on organization settings page is functional
- [ ] Email template renders correctly in Resend preview
- [ ] Eval pipeline still completes even if email fails
- [ ] Loading skeletons appear before content loads
- [ ] Settings form validates empty email as "no notifications"
- [ ] Mobile action buttons are always visible (not hover-only)
- [ ] Mobile nav doesn't overlap dashboard refreshing indicator

