"use client";

import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { parseCSTDate } from "@/lib/dateUtils";

type BankrollPoint = {
  date: string;
  cumulative: number;
  hasParticipation?: boolean; // If false/undefined, don't show dot for this point
};

interface BankrollChartProps {
  data: BankrollPoint[];
  activeSessionDate?: string;
}

export function BankrollChart({ data, activeSessionDate }: BankrollChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground">
        Not enough data yet to render a bankroll curve.
      </div>
    );
  }

  // Check if data contains any negative values
  const hasNegativeValues = data.some((point) => point.cumulative < 0);

  const formatChartDate = (value: string) => {
    const d = parseCSTDate(value);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  };

  return (
    <div className="h-full w-full text-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis
            dataKey="date"
            tickFormatter={formatChartDate}
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
            formatter={(value) =>
              typeof value === "number"
                ? [`$${value.toFixed(2)}`, "value"]
                : [String(value ?? ""), "value"]
            }
            labelFormatter={(value: string) => formatChartDate(value)}
          />
          <Line
            type="monotone"
            dataKey="cumulative"
            stroke="#16a34a"
            strokeWidth={2.5}
            dot={(props: any) => {
              // Only show dot if hasParticipation is true (or undefined for backward compatibility)
              if (props.payload?.hasParticipation === false) {
                return null;
              }
              const isActiveSession =
                activeSessionDate && props.payload?.date === activeSessionDate;
              if (isActiveSession) {
                // Special marker for active session - pulsing effect with larger radius
                return (
                  <g>
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={6}
                      fill="#16a34a"
                      opacity={0.3}
                    />
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={4}
                      fill="#16a34a"
                      opacity={0.6}
                    />
                    <circle cx={props.cx} cy={props.cy} r={3} fill="#16a34a" />
                  </g>
                );
              }
              return <circle cx={props.cx} cy={props.cy} r={3} fill="#16a34a" />;
            }}
            activeDot={(props: any) => {
              // Only show active dot if hasParticipation is true
              if (props.payload?.hasParticipation === false) {
                return null;
              }
              const isActiveSession =
                activeSessionDate && props.payload?.date === activeSessionDate;
              if (isActiveSession) {
                return (
                  <g>
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={7}
                      fill="#16a34a"
                      opacity={0.3}
                    />
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={5}
                      fill="#16a34a"
                      opacity={0.6}
                    />
                    <circle cx={props.cx} cy={props.cy} r={4} fill="#16a34a" />
                  </g>
                );
              }
              return <circle cx={props.cx} cy={props.cy} r={4} fill="#16a34a" />;
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
