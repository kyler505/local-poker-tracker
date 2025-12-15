"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";

export type LeaderboardRow = {
  playerId: string;
  name: string;
  totalProfit: number;
  sessionsPlayed: number;
  winningSessions: number;
  winRate: number;
};

type SortKey = "totalProfit" | "sessionsPlayed" | "winRate";
type SortDirection = "asc" | "desc";

interface LeaderboardTableProps {
  rows: LeaderboardRow[];
}

function sortRows(
  rows: LeaderboardRow[],
  key: SortKey,
  direction: SortDirection
): LeaderboardRow[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === "sessionsPlayed") {
      if (a.sessionsPlayed === b.sessionsPlayed) {
        // Tie-breaker by total profit (desc)
        return (b.totalProfit - a.totalProfit) * factor;
      }
      return (a.sessionsPlayed - b.sessionsPlayed) * factor;
    }

    if (key === "winRate") {
      if (a.winRate === b.winRate) {
        // Tie-breaker by sessions (desc)
        return (b.sessionsPlayed - a.sessionsPlayed) * factor;
      }
      return (a.winRate - b.winRate) * factor;
    }

    // key === "totalProfit"
    if (a.totalProfit === b.totalProfit) {
      // Tie-breaker by sessions (desc)
      return (b.sessionsPlayed - a.sessionsPlayed) * factor;
    }
    return (a.totalProfit - b.totalProfit) * factor;
  });
}

export function LeaderboardTable({ rows }: LeaderboardTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("totalProfit");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const onHeaderClick = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  const sorted = sortRows(rows, sortKey, sortDirection);

  const arrow = (key: SortKey) => {
    if (key !== sortKey) return "";
    return sortDirection === "desc" ? "▼" : "▲";
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px]">#</TableHead>
          <TableHead>Player</TableHead>
          <TableHead
            className="w-[120px] cursor-pointer text-right"
            onClick={() => onHeaderClick("sessionsPlayed")}
          >
            <span className="inline-flex items-center gap-1">
              Sessions <span className="text-[10px] text-muted-foreground">{arrow("sessionsPlayed")}</span>
            </span>
          </TableHead>
          <TableHead
            className="w-[140px] cursor-pointer text-right"
            onClick={() => onHeaderClick("totalProfit")}
          >
            <span className="inline-flex items-center gap-1">
              Total Profit{" "}
              <span className="text-[10px] text-muted-foreground">
                {arrow("totalProfit")}
              </span>
            </span>
          </TableHead>
          <TableHead
            className="w-[120px] cursor-pointer text-right"
            onClick={() => onHeaderClick("winRate")}
          >
            <span className="inline-flex items-center gap-1">
              Win Rate{" "}
              <span className="text-[10px] text-muted-foreground">
                {arrow("winRate")}
              </span>
            </span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.length ? (
          sorted.map((row, idx) => (
            <TableRow key={row.playerId}>
              <TableCell className="text-xs">{idx + 1}</TableCell>
              <TableCell className="text-sm">
                <Link
                  href={`/players/${row.playerId}`}
                  className="hover:underline"
                >
                  {row.name}
                </Link>
              </TableCell>
              <TableCell className="text-right text-sm">
                {row.sessionsPlayed.toLocaleString("en-US")}
              </TableCell>
              <TableCell className="text-right text-sm">
                <span
                  className={
                    row.totalProfit >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }
                >
                  $
                  {row.totalProfit.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </TableCell>
              <TableCell className="text-right text-sm">
                {row.sessionsPlayed ? `${row.winRate.toFixed(0)}%` : "—"}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="py-4 text-center text-sm">
              No player results yet. Play a session to populate the leaderboard.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
