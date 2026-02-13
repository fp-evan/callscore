import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return <DashboardView orgId={orgId} />;
}
