"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import type { TrendDataPoint } from "@/lib/dashboard-types";
import { format, parseISO } from "date-fns";

interface Props {
  data: TrendDataPoint[];
  technicians: { id: string; name: string }[];
}

const TECH_COLORS = [
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#ef4444",
];

export function TrendChart({ data, technicians }: Props) {
  const [enabledTechs, setEnabledTechs] = useState<Set<string>>(new Set());

  const chartData = useMemo(() => {
    return data.map((point) => {
      const entry: Record<string, string | number | null> = {
        period: format(parseISO(point.period), "MMM d"),
        overallPassRate:
          point.overallPassRate !== null
            ? Math.round(point.overallPassRate * 100)
            : null,
      };
      for (const tt of point.technicianTrends) {
        entry[tt.technicianId] =
          tt.passRate !== null ? Math.round(tt.passRate * 100) : null;
      }
      return entry;
    });
  }, [data]);

  const toggleTech = (techId: string) => {
    setEnabledTechs((prev) => {
      const next = new Set(prev);
      if (next.has(techId)) {
        next.delete(techId);
      } else {
        next.add(techId);
      }
      return next;
    });
  };

  if (data.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Need at least 2 data points for trend analysis
      </p>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ left: 0, right: 10, top: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            width={45}
          />
          <Tooltip
            formatter={(value) => [
              `${Number(value)}%`,
              "",
            ]}
            labelStyle={{ fontWeight: 600 }}
          />
          <Legend />
          <ReferenceLine
            y={80}
            stroke="#22c55e"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
          <Line
            type="monotone"
            dataKey="overallPassRate"
            name="Overall"
            stroke="#7c3aed"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#7c3aed" }}
            activeDot={{ r: 6 }}
            connectNulls
          />
          {technicians.map((tech, i) => {
            if (!enabledTechs.has(tech.id)) return null;
            return (
              <Line
                key={tech.id}
                type="monotone"
                dataKey={tech.id}
                name={tech.name}
                stroke={TECH_COLORS[i % TECH_COLORS.length]}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>

      {technicians.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {technicians.map((tech, i) => (
            <label
              key={tech.id}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={enabledTechs.has(tech.id)}
                onCheckedChange={() => toggleTech(tech.id)}
              />
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    TECH_COLORS[i % TECH_COLORS.length],
                }}
              />
              {tech.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
