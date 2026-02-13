import { Card, CardContent } from "@/components/ui/card";

export default function CriteriaLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-36 rounded bg-muted" />
          <div className="h-4 w-64 rounded bg-muted" />
        </div>
        <div className="h-9 w-32 rounded bg-muted" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-0">
              <div className="flex items-center gap-3 p-4">
                <div className="h-5 w-5 rounded bg-muted" />
                <div className="h-5 flex-1 rounded bg-muted" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 rounded bg-muted" />
                  <div className="h-5 w-16 rounded bg-muted" />
                  <div className="h-5 w-10 rounded bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
