export default async function TranscriptsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Transcripts</h1>
      <p className="text-muted-foreground">
        All call transcripts and evaluation results. Coming in Phase 2.
      </p>
      <p className="text-xs text-muted-foreground">Org: {orgId}</p>
    </div>
  );
}
