import { createServerClient } from "@/lib/supabase/server";

export interface TechnicianStats {
  totalCalls: number;
  passRate: number | null;
}

export async function computeTechnicianStats(
  orgId: string,
  techIds: string[]
): Promise<Map<string, TechnicianStats>> {
  if (techIds.length === 0) return new Map();

  const supabase = createServerClient();

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

  const statsMap = new Map<string, TechnicianStats>();
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

  return statsMap;
}
