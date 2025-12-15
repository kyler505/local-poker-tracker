"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

type PlayerSeries = {
  playerId: string;
  name: string;
  series: { date: string; cumulative: number }[];
};

interface PlayerComparisonChartProps {
  players: PlayerSeries[];
}

export function PlayerComparisonChart({ players }: PlayerComparisonChartProps) {
  if (!players.length) {
    return (
      <div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground">
        Not enough data yet to compare players.
      </div>
    );
  }

  const allDates = Array.from(
    new Set(players.flatMap((p) => p.series.map((s) => s.date)))
  ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const data = allDates.map((date) => {
    const row: Record<string, any> = { date };
    for (const p of players) {
      const point = p.series.find((s) => s.date === date);
      row[p.playerId] = point ? point.cumulative : null;
    }
    return row;
  });

  const colors = ["#16a34a", "#2563eb", "#e11d48", "#f59e0b", "#7c3aed"];

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
            formatter={(value, key) => {
              if (typeof value === "number") {
                const player = players.find((p) => p.playerId === key);
                return [
                  `$${value.toFixed(2)}`,
                  player ? player.name : (key as string),
                ];
              }
              return [String(value ?? ""), key as string];
            }}
            labelFormatter={(value: string) =>
              new Date(value).toLocaleDateString()
            }
          />
          <Legend />
          {players.map((p, idx) => (
            <Line
              key={p.playerId}
              type="monotone"
              dataKey={p.playerId}
              name={p.name}
              stroke={colors[idx % colors.length]}
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
