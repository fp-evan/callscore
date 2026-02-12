export default async function RecordPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-12">
      <h1 className="text-2xl font-semibold">Record a Call</h1>
      <p className="text-muted-foreground">
        Recording interface will be implemented in Phase 2.
      </p>
      <p className="text-xs text-muted-foreground">Org: {orgId}</p>
    </div>
  );
}
