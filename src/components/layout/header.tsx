"use client";

import Link from "next/link";
import { OrgSwitcher } from "./org-switcher";

export function Header({ orgId, orgName }: { orgId: string; orgName: string }) {
  return (
    <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-lg font-semibold tracking-tight md:hidden">
          CallScore
        </Link>
        <OrgSwitcher orgId={orgId} orgName={orgName} />
      </div>
    </header>
  );
}
