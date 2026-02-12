export default async function PastePage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Paste Transcript</h1>
      <p className="text-muted-foreground">
        Paste a transcript for AI evaluation. Coming in Phase 2.
      </p>
      <p className="text-xs text-muted-foreground">Org: {orgId}</p>
    </div>
  );
}
