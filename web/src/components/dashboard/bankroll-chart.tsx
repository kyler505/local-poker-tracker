"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type BankrollPoint = {
  date: string;
  cumulative: number;
};

interface BankrollChartProps {
  data: BankrollPoint[];
}

export function BankrollChart({ data }: BankrollChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground">
        Not enough data yet to render a bankroll curve.
      </div>
    );
  }

  return (
    <div className="h-[220px] w-full text-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis
            dataKey="date"
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            tickFormatter={(value) => `$${value}`}
            tick={{ fontSize: 10 }}
            domain={["auto", "auto"]}
          />
          <Tooltip
            formatter={(value) =>
              typeof value === "number"
                ? [`$${value.toFixed(2)}`, "value"]
                : [String(value ?? ""), "value"]
            }
            labelFormatter={(value: string) =>
              new Date(value).toLocaleDateString()
            }
          />
          <Line
            type="monotone"
            dataKey="cumulative"
            stroke="#16a34a"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
