import { createServerClient } from "@/lib/supabase/server";
import { PasteForm } from "@/components/transcripts/paste-form";

export default async function PastePage({
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Paste Transcript</h1>
        <p className="text-muted-foreground mt-1">
          Paste an existing call transcript for AI evaluation.
        </p>
      </div>
      <PasteForm
        orgId={orgId}
        technicians={technicians || []}
        industry={org?.industry || "general"}
      />
    </div>
  );
}
