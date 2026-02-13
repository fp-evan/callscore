import { Card, CardContent } from "@/components/ui/card";

export default function TechniciansLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 rounded bg-muted animate-pulse" />
        <div className="h-9 w-36 rounded bg-muted animate-pulse" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 shrink-0 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 rounded bg-muted" />
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="flex gap-1">
                    <div className="h-5 w-16 rounded bg-muted" />
                    <div className="h-5 w-16 rounded bg-muted" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 mt-4 pt-4 border-t">
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
