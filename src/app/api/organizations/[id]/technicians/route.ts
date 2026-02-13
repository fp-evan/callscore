import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const createTechnicianSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().max(200).nullable().optional(),
  specialties: z.array(z.string()).nullable().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();
  const url = new URL(request.url);
  const includeStats = url.searchParams.get("stats") === "true";

  const { data: technicians, error } = await supabase
    .from("technicians")
    .select("*")
    .eq("organization_id", id)
    .order("created_at");

  if (error) {
    console.error("technicians GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch technicians" },
      { status: 500 }
    );
  }

  if (!includeStats || !technicians || technicians.length === 0) {
    return NextResponse.json(technicians);
  }

  // Fetch aggregate stats: transcript count + pass rate per technician
  const techIds = technicians.map((t) => t.id);

  const { data: transcripts } = await supabase
    .from("transcripts")
    .select("id, technician_id, eval_status")
    .eq("organization_id", id)
    .in("technician_id", techIds);

  const transcriptIds = (transcripts || [])
    .filter((t) => t.eval_status === "completed")
    .map((t) => t.id);

  let evalResults: Array<{ transcript_id: string; passed: boolean | null }> = [];
  if (transcriptIds.length > 0) {
    const { data: results } = await supabase
      .from("eval_results")
      .select("transcript_id, passed")
      .in("transcript_id", transcriptIds);
    evalResults = results || [];
  }

  // Build lookup: technician_id -> { totalCalls, passRate }
  const statsMap = new Map<string, { totalCalls: number; passRate: number | null }>();

  // Count transcripts per technician
  const callCounts = new Map<string, number>();
  const techTranscripts = new Map<string, string[]>();
  for (const t of transcripts || []) {
    if (t.technician_id) {
      callCounts.set(t.technician_id, (callCounts.get(t.technician_id) || 0) + 1);
      if (t.eval_status === "completed") {
        const existing = techTranscripts.get(t.technician_id) || [];
        existing.push(t.id);
        techTranscripts.set(t.technician_id, existing);
      }
    }
  }

  // Compute pass rate per technician from eval results
  for (const techId of techIds) {
    const totalCalls = callCounts.get(techId) || 0;
    const completedTranscriptIds = techTranscripts.get(techId) || [];

    let passRate: number | null = null;
    if (completedTranscriptIds.length > 0) {
      const techResults = evalResults.filter((r) =>
        completedTranscriptIds.includes(r.transcript_id)
      );
      if (techResults.length > 0) {
        const passed = techResults.filter((r) => r.passed === true).length;
        passRate = passed / techResults.length;
      }
    }

    statsMap.set(techId, { totalCalls, passRate });
  }

  const techniciansWithStats = technicians.map((tech) => ({
    ...tech,
    stats: statsMap.get(tech.id) || { totalCalls: 0, passRate: null },
  }));

  return NextResponse.json(techniciansWithStats);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createTechnicianSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("technicians")
    .insert({
      organization_id: id,
      name: parsed.data.name,
      role: parsed.data.role || null,
      specialties: parsed.data.specialties || null,
    })
    .select()
    .single();

  if (error) {
    console.error("technicians POST error:", error);
    return NextResponse.json(
      { error: "Failed to create technician" },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
