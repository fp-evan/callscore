import { createServerClient } from "@/lib/supabase/server";
import { RecordingInterface } from "@/components/recording/recording-interface";

export default async function RecordPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = createServerClient();

  const { data: technicians } = await supabase
    .from("technicians")
    .select("id, name, role")
    .eq("organization_id", orgId)
    .order("name");

  const { data: org } = await supabase
    .from("organizations")
    .select("industry")
    .eq("id", orgId)
    .single();

  return (
    <RecordingInterface
      orgId={orgId}
      technicians={technicians || []}
      industry={org?.industry || "general"}
    />
  );
}
