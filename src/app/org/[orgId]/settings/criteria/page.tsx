import { createServerClient } from "@/lib/supabase/server";
import { CriteriaManager } from "@/components/criteria/criteria-manager";

export default async function CriteriaPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = createServerClient();

  const { data: criteria } = await supabase
    .from("eval_criteria")
    .select("*, few_shot_examples(*)")
    .eq("organization_id", orgId)
    .order("sort_order");

  return (
    <CriteriaManager
      orgId={orgId}
      initialCriteria={criteria || []}
    />
  );
}
