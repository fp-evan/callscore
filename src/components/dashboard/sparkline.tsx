"use client";

import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface Props {
  data: { value: number | null }[];
  color?: string;
  height?: number;
}

export function Sparkline({
  data,
  color = "#7c3aed",
  height = 60,
}: Props) {
  const filteredData = data
    .filter((d) => d.value !== null)
    .map((d) => ({ value: d.value }));

  if (filteredData.length < 2) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={filteredData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={`sparkGrad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#sparkGrad-${color.replace("#", "")})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
