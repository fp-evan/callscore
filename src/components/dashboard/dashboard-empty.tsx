"use client";

import Link from "next/link";
import { Mic, ClipboardPaste, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  orgId: string;
}

export function DashboardEmpty({ orgId }: Props) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="rounded-full bg-muted p-4">
          <BarChart3 className="h-10 w-10 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">No evaluation data yet</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Record your first call and run an evaluation to see your
            dashboard come to life. Performance analytics, heatmaps, and
            trend charts will appear here.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/org/${orgId}/record`}>
              <Mic className="mr-2 h-4 w-4" />
              Record a Call
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/org/${orgId}/paste`}>
              <ClipboardPaste className="mr-2 h-4 w-4" />
              Paste a Transcript
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
