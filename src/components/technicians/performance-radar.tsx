"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

interface CriteriaData {
  name: string;
  category: string;
  passRate: number;
  total: number;
}

interface Props {
  data: CriteriaData[];
}

function getBarColor(rate: number): string {
  if (rate >= 80) return "#22c55e";
  if (rate >= 50) return "#f59e0b";
  return "#ef4444";
}

export function PerformanceRadar({ data }: Props) {
  // Need at least 3 data points for a meaningful radar chart
  if (data.length < 3) {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 20, right: 20, top: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value) => [`${Math.round(Number(value))}%`, "Pass Rate"]}
          />
          <Bar dataKey="passRate" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={getBarColor(entry.passRate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid strokeDasharray="3 3" />
        <PolarAngleAxis
          dataKey="name"
          tick={{ fontSize: 11 }}
          tickFormatter={(value: string) =>
            value.length > 14 ? value.slice(0, 12) + "..." : value
          }
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 10 }}
          tickFormatter={(v) => `${v}%`}
        />
        <Radar
          dataKey="passRate"
          stroke="#7c3aed"
          fill="#7c3aed"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Tooltip
          formatter={(value) => [`${Math.round(Number(value))}%`, "Pass Rate"]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
