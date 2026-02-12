export default async function TechnicianDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; id: string }>;
}) {
  const { orgId, id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Technician Profile</h1>
      <p className="text-muted-foreground">
        Individual technician performance profile. Coming in Phase 4.
      </p>
      <p className="text-xs text-muted-foreground">
        Org: {orgId} | Tech: {id}
      </p>
    </div>
  );
}
