"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { CriteriaPassRate } from "@/lib/dashboard-types";

interface Props {
  data: CriteriaPassRate[];
  onCriteriaClick?: (criteriaId: string) => void;
}

function getBarColor(rate: number): string {
  if (rate >= 80) return "#22c55e";
  if (rate >= 50) return "#f59e0b";
  return "#ef4444";
}

export function CriteriaChart({ data, onCriteriaClick }: Props) {
  // Sort by pass rate ascending (worst at top)
  const chartData = [...data]
    .filter((c) => c.totalEvals > 0 && c.passRate !== null)
    .map((c) => ({
      ...c,
      passRatePct: Math.round((c.passRate ?? 0) * 100),
      targetPct: Math.round(c.targetPassRate * 100),
    }))
    .sort((a, b) => a.passRatePct - b.passRatePct);

  if (chartData.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No criteria evaluation data yet
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 44)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ left: 10, right: 30, top: 10, bottom: 10 }}
        onClick={(e: Record<string, unknown>) => {
          const payload = e?.activePayload as
            | { payload: { criteriaId: string } }[]
            | undefined;
          if (payload?.[0]?.payload?.criteriaId) {
            onCriteriaClick?.(payload[0].payload.criteriaId);
          }
        }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          type="category"
          dataKey="criteriaName"
          width={140}
          tick={{ fontSize: 12 }}
          tickFormatter={(value: string) =>
            value.length > 20 ? value.slice(0, 18) + "..." : value
          }
        />
        <Tooltip
          formatter={(value) => [
            `${Number(value)}%`,
            "Pass Rate",
          ]}
          labelStyle={{ fontWeight: 600 }}
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
        />
        <ReferenceLine
          x={80}
          stroke="#22c55e"
          strokeDasharray="4 4"
          strokeOpacity={0.5}
          label={{ value: "Target", position: "top", fontSize: 10 }}
        />
        <Bar dataKey="passRatePct" radius={[0, 4, 4, 0]} cursor="pointer">
          {chartData.map((entry, i) => (
            <Cell key={i} fill={getBarColor(entry.passRatePct)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
