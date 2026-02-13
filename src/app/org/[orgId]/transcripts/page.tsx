import { createServerClient } from "@/lib/supabase/server";
import { TranscriptList } from "@/components/transcripts/transcript-list";

export default async function TranscriptsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = createServerClient();

  const { data: transcripts } = await supabase
    .from("transcripts")
    .select("*, technicians(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  const { data: technicians } = await supabase
    .from("technicians")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name");

  return (
    <TranscriptList
      orgId={orgId}
      transcripts={transcripts || []}
      technicians={technicians || []}
    />
  );
}
