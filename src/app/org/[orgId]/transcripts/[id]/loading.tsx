import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function TranscriptDetailLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-8 w-20 rounded bg-muted" />
          <div className="h-8 w-20 rounded bg-muted" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-5 w-20 rounded bg-muted" />
          ))}
        </div>
        <div className="h-16 w-full rounded bg-muted" />
      </div>

      <div className="hidden md:grid md:grid-cols-5 md:gap-6">
        <div className="col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="h-5 w-24 rounded bg-muted" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-4 w-full rounded bg-muted" />
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="h-5 w-24 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center py-4">
                <div className="h-24 w-24 rounded-full bg-muted" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile skeleton */}
      <div className="md:hidden space-y-3">
        <div className="h-10 w-full rounded bg-muted" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 w-full rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}
