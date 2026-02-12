export default async function TechniciansPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Technicians</h1>
      <p className="text-muted-foreground">
        Technician profiles and performance. Coming in Phase 4.
      </p>
      <p className="text-xs text-muted-foreground">Org: {orgId}</p>
    </div>
  );
}
