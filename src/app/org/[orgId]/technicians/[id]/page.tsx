import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { TechnicianProfile } from "@/components/technicians/technician-profile";

export default async function TechnicianDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; id: string }>;
}) {
  const { orgId, id } = await params;
  const supabase = createServerClient();

  // Fetch technician
  const { data: technician, error: techError } = await supabase
    .from("technicians")
    .select("*")
    .eq("id", id)
    .single();

  if (techError || !technician) {
    notFound();
  }

  // Fetch org info (industry for mock call scenarios)
  const { data: org } = await supabase
    .from("organizations")
    .select("name, industry")
    .eq("id", orgId)
    .single();

  // Fetch technician's transcripts with eval results
  const { data: transcripts } = await supabase
    .from("transcripts")
    .select("id, source, raw_transcript, service_type, eval_status, created_at, summary")
    .eq("technician_id", id)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  // Fetch all eval results for this technician's completed transcripts
  const completedTranscriptIds = (transcripts || [])
    .filter((t) => t.eval_status === "completed")
    .map((t) => t.id);

  let evalResults: Array<{
    id: string;
    transcript_id: string;
    eval_criteria_id: string;
    passed: boolean | null;
    confidence: number | null;
    reasoning: string | null;
    created_at: string;
  }> = [];

  if (completedTranscriptIds.length > 0) {
    const { data: results } = await supabase
      .from("eval_results")
      .select("id, transcript_id, eval_criteria_id, passed, confidence, reasoning, created_at")
      .in("transcript_id", completedTranscriptIds);
    evalResults = results || [];
  }

  // Fetch eval criteria for the org (for radar chart labels)
  const { data: criteria } = await supabase
    .from("eval_criteria")
    .select("id, name, category, description")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .eq("status", "published")
    .order("sort_order");

  // Fetch mock transcripts separately for training tab
  const mockTranscripts = (transcripts || []).filter((t) => t.source === "mock");

  return (
    <TechnicianProfile
      orgId={orgId}
      technician={technician}
      orgIndustry={org?.industry || "general"}
      transcripts={transcripts || []}
      evalResults={evalResults}
      criteria={criteria || []}
      mockTranscripts={mockTranscripts}
    />
  );
}
