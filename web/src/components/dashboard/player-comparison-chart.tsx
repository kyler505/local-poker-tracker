"use client";

import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

type PlayerSeries = {
  playerId: string;
  name: string;
  series: { date: string; cumulative: number; hasParticipation: boolean }[];
};

interface PlayerComparisonChartProps {
  players: PlayerSeries[];
  activePlayerIds?: Set<string>;
}

export function PlayerComparisonChart({ players, activePlayerIds }: PlayerComparisonChartProps) {
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
      // Store hasParticipation flag for conditional dot rendering
      row[`${p.playerId}_hasParticipation`] = point?.hasParticipation ?? false;
    }
    return row;
  });

  const colors = ["#16a34a", "#2563eb", "#e11d48", "#f59e0b", "#7c3aed"];

  // Check if any player has negative cumulative values
  const hasNegativeValues = players.some((player) =>
    player.series.some((point) => point.cumulative < 0)
  );

  return (
    <div className="h-full w-full text-foreground">
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
          {hasNegativeValues && (
            <ReferenceLine
              y={0}
              stroke="#888"
              strokeDasharray="5 5"
              strokeWidth={1}
            />
          )}
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
          {players.map((p, idx) => {
            const isActive = activePlayerIds?.has(p.playerId);
            return (
              <Line
                key={p.playerId}
                type="monotone"
                dataKey={p.playerId}
                name={p.name}
                stroke={colors[idx % colors.length]}
                strokeWidth={isActive ? 3 : 2}
                strokeDasharray={isActive ? "5 5" : undefined}
                dot={(props: any) => {
                  // Only show dot if hasParticipation is true
                  const hasParticipation = props.payload?.[`${p.playerId}_hasParticipation`];
                  if (hasParticipation === false) {
                    return null;
                  }
                  const radius = isActive ? 3 : 2;
                  return <circle cx={props.cx} cy={props.cy} r={radius} fill={colors[idx % colors.length]} />;
                }}
                activeDot={(props: any) => {
                  // Only show active dot if hasParticipation is true
                  const hasParticipation = props.payload?.[`${p.playerId}_hasParticipation`];
                  if (hasParticipation === false) {
                    return null;
                  }
                  const radius = isActive ? 4 : 3;
                  return <circle cx={props.cx} cy={props.cy} r={radius} fill={colors[idx % colors.length]} />;
                }}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
