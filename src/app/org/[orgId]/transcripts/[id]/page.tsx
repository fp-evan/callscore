export default async function TranscriptDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; id: string }>;
}) {
  const { orgId, id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Transcript Detail</h1>
      <p className="text-muted-foreground">
        Transcript viewer with eval results. Coming in Phase 2.
      </p>
      <p className="text-xs text-muted-foreground">
        Org: {orgId} | Transcript: {id}
      </p>
    </div>
  );
}
