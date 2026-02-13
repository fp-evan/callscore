import { createServerClient } from "@/lib/supabase/server";
import { TechnicianManagement } from "@/components/technicians/technician-management";

export default async function TechniciansPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = createServerClient();

  // Fetch technicians with aggregate stats
  const { data: technicians } = await supabase
    .from("technicians")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at");

  // Fetch transcript counts + eval results per technician in two queries
  const techIds = (technicians || []).map((t) => t.id);
  let statsMap = new Map<string, { totalCalls: number; passRate: number | null }>();

  if (techIds.length > 0) {
    const { data: transcripts } = await supabase
      .from("transcripts")
      .select("id, technician_id, eval_status")
      .eq("organization_id", orgId)
      .in("technician_id", techIds);

    const completedTranscriptIds = (transcripts || [])
      .filter((t) => t.eval_status === "completed")
      .map((t) => t.id);

    let evalResults: Array<{ transcript_id: string; passed: boolean | null }> = [];
    if (completedTranscriptIds.length > 0) {
      const { data: results } = await supabase
        .from("eval_results")
        .select("transcript_id, passed")
        .in("transcript_id", completedTranscriptIds);
      evalResults = results || [];
    }

    // Build stats per technician
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

    for (const techId of techIds) {
      const totalCalls = callCounts.get(techId) || 0;
      const completed = techTranscripts.get(techId) || [];
      let passRate: number | null = null;
      if (completed.length > 0) {
        const techResults = evalResults.filter((r) =>
          completed.includes(r.transcript_id)
        );
        if (techResults.length > 0) {
          const passed = techResults.filter((r) => r.passed === true).length;
          passRate = passed / techResults.length;
        }
      }
      statsMap.set(techId, { totalCalls, passRate });
    }
  }

  const techniciansWithStats = (technicians || []).map((tech) => ({
    ...tech,
    stats: statsMap.get(tech.id) || { totalCalls: 0, passRate: null },
  }));

  return <TechnicianManagement orgId={orgId} initialTechnicians={techniciansWithStats} />;
}
