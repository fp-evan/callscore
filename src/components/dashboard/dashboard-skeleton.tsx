"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-muted ${className || ""}`}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-8 w-48" />

      {/* Filter bar skeleton */}
      <div className="flex flex-wrap gap-2">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-8 w-28" />
        <SkeletonBlock className="h-8 w-24" />
        <SkeletonBlock className="h-8 w-28" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <SkeletonBlock className="mb-2 h-4 w-24" />
              <SkeletonBlock className="mb-1 h-8 w-16" />
              <SkeletonBlock className="mb-2 h-3 w-32" />
              <SkeletonBlock className="h-[60px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Heatmap skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <SkeletonBlock className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <SkeletonBlock className="h-48 w-full" />
        </CardContent>
      </Card>

      {/* Criteria chart skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <SkeletonBlock className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <SkeletonBlock className="h-64 w-full" />
        </CardContent>
      </Card>

      {/* Trend chart skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <SkeletonBlock className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <SkeletonBlock className="h-64 w-full" />
        </CardContent>
      </Card>

      {/* Needs attention skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <SkeletonBlock className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <SkeletonBlock className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
