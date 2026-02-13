import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { z } from "zod";
import {
  EvalNotificationEmail,
  type EvalNotificationEmailProps,
} from "@/emails/eval-notification";

const sendEmailSchema = z.object({
  transcriptId: z.string().uuid(),
});

export async function POST(request: Request) {
  const supabase = createServerClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = sendEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { transcriptId } = parsed.data;

  // 1. Fetch transcript with org and technician
  const { data: transcript, error: transcriptError } = await supabase
    .from("transcripts")
    .select("*, organizations(id, name, industry, notification_email), technicians(name)")
    .eq("id", transcriptId)
    .single();

  if (transcriptError || !transcript) {
    console.error("Send email: transcript fetch error:", transcriptError);
    return NextResponse.json(
      { error: "Transcript not found" },
      { status: 404 }
    );
  }

  const org = transcript.organizations as {
    id: string;
    name: string;
    industry: string;
    notification_email: string | null;
  } | null;

  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  // 2. Check if org has notification email
  if (!org.notification_email) {
    return NextResponse.json({
      sent: false,
      reason: "no_email_configured",
    });
  }

  const technician = transcript.technicians as { name: string } | null;
  const techName = technician?.name || "Unknown Technician";

  // 3. Fetch eval results for this transcript
  const { data: evalResults, error: resultsError } = await supabase
    .from("eval_results")
    .select("*, eval_criteria(name)")
    .eq("transcript_id", transcriptId)
    .order("created_at", { ascending: true });

  if (resultsError || !evalResults || evalResults.length === 0) {
    return NextResponse.json({
      sent: false,
      reason: "no_eval_results",
    });
  }

  // 4. Aggregate results
  const results = evalResults.map((er) => ({
    criterionName:
      (er.eval_criteria as { name: string } | null)?.name || "Unknown",
    passed: er.passed === true,
    reasoning: er.reasoning || "",
  }));

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const passRate = totalCount > 0 ? passedCount / totalCount : 0;

  // 5. Calculate change vs previous evaluation for this technician
  let changeVsPrevious: number | null = null;

  if (transcript.technician_id) {
    const { data: prevTranscripts } = await supabase
      .from("transcripts")
      .select("id")
      .eq("technician_id", transcript.technician_id)
      .eq("eval_status", "completed")
      .neq("id", transcriptId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (prevTranscripts && prevTranscripts.length > 0) {
      const prevId = prevTranscripts[0].id;
      const { data: prevResults } = await supabase
        .from("eval_results")
        .select("passed")
        .eq("transcript_id", prevId);

      if (prevResults && prevResults.length > 0) {
        const prevPassed = prevResults.filter((r) => r.passed === true).length;
        const prevRate = prevPassed / prevResults.length;
        changeVsPrevious = passRate - prevRate;
      }
    }
  }

  // 6. Prepare email props
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://callscore.vercel.app";
  const formattedDate = new Date(transcript.created_at).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  const emailProps: EvalNotificationEmailProps = {
    orgName: org.name,
    orgId: org.id,
    technicianName: techName,
    transcriptId,
    date: formattedDate,
    passRate,
    passedCount,
    totalCount,
    changeVsPrevious,
    results,
    summary: transcript.summary || null,
    appUrl,
  };

  // 7. Send via Resend
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Send email: RESEND_API_KEY not set");
    return NextResponse.json({
      sent: false,
      reason: "email_service_not_configured",
    });
  }

  const resend = new Resend(apiKey);
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "CallScore <onboarding@resend.dev>";

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: org.notification_email,
      subject: `Call Evaluation: ${techName} — ${passedCount}/${totalCount} passed`,
      react: EvalNotificationEmail(emailProps),
    });

    // 8. Update transcript metadata with email status
    const existingMetadata =
      typeof transcript.metadata === "object" && transcript.metadata !== null
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

    return NextResponse.json({
      sent: true,
      emailId: result.data?.id || null,
    });
  } catch (err) {
    console.error("Send email: Resend error:", err);

    // Store failure in metadata but don't fail the overall request
    const existingMetadata =
      typeof transcript.metadata === "object" && transcript.metadata !== null
        ? transcript.metadata
        : {};

    await supabase
      .from("transcripts")
      .update({
        metadata: {
          ...existingMetadata,
          emailSent: false,
          emailError:
            err instanceof Error ? err.message : "Email send failed",
        },
      })
      .eq("id", transcriptId);

    return NextResponse.json({
      sent: false,
      reason: "send_failed",
    });
  }
}
