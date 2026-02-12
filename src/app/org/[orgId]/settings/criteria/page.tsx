export default async function CriteriaPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Eval Criteria</h1>
      <p className="text-muted-foreground">
        Manage evaluation criteria for your organization. Coming in Phase 3.
      </p>
      <p className="text-xs text-muted-foreground">Org: {orgId}</p>
    </div>
  );
}
