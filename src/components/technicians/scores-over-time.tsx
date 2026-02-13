"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface DataPoint {
  month: string;
  label: string;
  passRate: number;
}

interface Props {
  data: DataPoint[];
}

export function ScoresOverTime({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ left: 0, right: 10, top: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
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
          formatter={(value) => [`${Number(value)}%`, "Pass Rate"]}
          labelStyle={{ fontWeight: 600 }}
        />
        <ReferenceLine
          y={80}
          stroke="#22c55e"
          strokeDasharray="4 4"
          strokeOpacity={0.5}
        />
        <Line
          type="monotone"
          dataKey="passRate"
          stroke="#7c3aed"
          strokeWidth={2}
          dot={{ r: 4, fill: "#7c3aed" }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
