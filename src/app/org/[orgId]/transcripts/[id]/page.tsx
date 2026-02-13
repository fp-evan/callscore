import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { TranscriptDetail } from "@/components/transcripts/transcript-detail";

export default async function TranscriptDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; id: string }>;
}) {
  const { orgId, id } = await params;
  const supabase = createServerClient();

  const { data: transcript, error } = await supabase
    .from("transcripts")
    .select("*, technicians(name, role)")
    .eq("id", id)
    .single();

  if (error || !transcript) {
    notFound();
  }

  // Fetch eval results with criterion names
  const { data: evalResults } = await supabase
    .from("eval_results")
    .select("*, eval_criteria(name, category)")
    .eq("transcript_id", id)
    .order("created_at");

  return (
    <TranscriptDetail
      orgId={orgId}
      transcript={transcript}
      initialEvalResults={evalResults || []}
    />
  );
}
