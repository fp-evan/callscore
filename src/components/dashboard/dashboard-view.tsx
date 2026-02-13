"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { subDays } from "date-fns";
import { BarChart3, FileText, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar } from "./filter-bar";
import { OverviewCards } from "./overview-cards";
import { Heatmap } from "./heatmap";
import { CriteriaChart } from "./criteria-chart";
import { TrendChart } from "./trend-chart";
import { AttentionList } from "./attention-list";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { DashboardEmpty } from "./dashboard-empty";
import type { DashboardData, DashboardFilters } from "@/lib/dashboard-types";

interface Props {
  orgId: string;
}

export function DashboardView({ orgId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize filters from URL search params
  const [filters, setFilters] = useState<DashboardFilters>(() => {
    const now = new Date();
    return {
      startDate:
        searchParams.get("startDate") || subDays(now, 30).toISOString(),
      endDate: searchParams.get("endDate") || now.toISOString(),
      technicianIds: searchParams.get("technicianIds")
        ? searchParams.get("technicianIds")!.split(",")
        : [],
      criteriaIds: searchParams.get("criteriaIds")
        ? searchParams.get("criteriaIds")!.split(",")
        : [],
      excludeMock: searchParams.get("excludeMock") !== "false",
    };
  });

  // Sync filters to URL search params
  const updateFilters = useCallback(
    (newFilters: DashboardFilters) => {
      setFilters(newFilters);
      const params = new URLSearchParams();
      params.set("startDate", newFilters.startDate);
      params.set("endDate", newFilters.endDate);
      if (newFilters.technicianIds.length > 0) {
        params.set("technicianIds", newFilters.technicianIds.join(","));
      }
      if (newFilters.criteriaIds.length > 0) {
        params.set("criteriaIds", newFilters.criteriaIds.join(","));
      }
      if (!newFilters.excludeMock) {
        params.set("excludeMock", "false");
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("startDate", filters.startDate);
      params.set("endDate", filters.endDate);
      if (filters.technicianIds.length > 0) {
        params.set("technicianIds", filters.technicianIds.join(","));
      }
      if (filters.criteriaIds.length > 0) {
        params.set("criteriaIds", filters.criteriaIds.join(","));
      }
      if (!filters.excludeMock) {
        params.set("excludeMock", "false");
      }

      const response = await fetch(
        `/api/dashboard/${orgId}?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error("Failed to load dashboard data");
      }
      const json = await response.json();
      setData(json);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [orgId, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterByCriteria = useCallback(
    (criteriaId: string) => {
      updateFilters({ ...filters, criteriaIds: [criteriaId] });
    },
    [filters, updateFilters]
  );

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          onClick={fetchData}
          className="text-sm font-medium text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  // Empty state — no evaluated transcripts
  const hasEvalData = data.overview.totalEvaluations > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFiltersChange={updateFilters}
        technicians={data.availableTechnicians}
        criteria={data.availableCriteria}
      />

      {!hasEvalData ? (
        <DashboardEmpty orgId={orgId} />
      ) : (
        <>
          {/* KPI Cards */}
          <OverviewCards
            overview={data.overview}
            sparklineData={data.sparklineData}
            orgId={orgId}
            onFilterByCriteria={handleFilterByCriteria}
          />

          {/* Heatmap — only show if >1 technician */}
          {data.availableTechnicians.length > 1 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  Performance Heatmap
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Click any cell to see related transcripts
                </p>
              </CardHeader>
              <CardContent>
                <Heatmap data={data.heatmapData} orgId={orgId} />
              </CardContent>
            </Card>
          )}

          {/* Criteria Pass Rate Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Criteria Pass Rates
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Sorted by pass rate — weakest criteria at top
              </p>
            </CardHeader>
            <CardContent>
              <CriteriaChart
                data={data.criteriaPassRates}
                onCriteriaClick={handleFilterByCriteria}
              />
            </CardContent>
          </Card>

          {/* Trend Over Time */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Trend Over Time
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Toggle technician lines below the chart
              </p>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={data.trendData}
                technicians={data.availableTechnicians}
              />
            </CardContent>
          </Card>

          {/* Needs Attention */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Needs Attention
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Recent transcripts with pass rates below 50%
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <AttentionList data={data.needsAttention} orgId={orgId} />
            </CardContent>
          </Card>
        </>
      )}

      {loading && data && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-card px-3 py-2 text-xs text-muted-foreground shadow-md">
          Refreshing...
        </div>
      )}
    </div>
  );
}
