"use client";

import { useState } from "react";
import { BankrollChart } from "./bankroll-chart";
import { PlayerComparisonChart } from "./player-comparison-chart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

type MoneyPoint = { date: string; cumulative: number };

type PlayerSeries = {
  playerId: string;
  name: string;
  series: { date: string; cumulative: number; hasParticipation: boolean }[];
};

interface DashboardPanelsProps {
  moneyOnTableSeries: MoneyPoint[];
  topPlayerSeries: PlayerSeries[];
  topN: number;
  activeSessionDate?: string | null;
  activePlayerIds?: Set<string>;
}

type PanelKey = "money" | "comparison";

export function DashboardPanels({
  moneyOnTableSeries,
  topPlayerSeries,
  topN,
  activeSessionDate,
  activePlayerIds,
}: DashboardPanelsProps) {
  const [active, setActive] = useState<PanelKey>("money");
  const [enlargedChart, setEnlargedChart] = useState<PanelKey | null>(null);

  const tabClass = (key: PanelKey) =>
    `px-2 py-1 rounded-full border text-xs ${
      active === key ? "bg-primary text-primary-foreground" : ""
    }`;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase">
          Bankroll Views
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={tabClass("money")}
            onClick={() => setActive("money")}
          >
            Money on Table
          </button>
          <button
            type="button"
            className={tabClass("comparison")}
            onClick={() => setActive("comparison")}
          >
            Player Comparison
          </button>
        </div>
      </div>

      {active === "money" && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">
            Money on Table per Session
          </p>
          <div
            className="h-64 cursor-pointer"
            onClick={() => setEnlargedChart("money")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setEnlargedChart("money");
              }
            }}
            aria-label="Click to enlarge graph"
          >
            <BankrollChart data={moneyOnTableSeries} activeSessionDate={activeSessionDate ?? undefined} />
          </div>
        </div>
      )}

      {active === "comparison" && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">
            Player Comparison (Cumulative Profit)
          </p>
          <p className="text-[11px] text-muted-foreground">
            Top {topN} players in current range
          </p>
          <div
            className="h-64 cursor-pointer"
            onClick={() => setEnlargedChart("comparison")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setEnlargedChart("comparison");
              }
            }}
            aria-label="Click to enlarge graph"
          >
            <PlayerComparisonChart players={topPlayerSeries} activePlayerIds={activePlayerIds} />
          </div>
        </div>
      )}

      <Dialog open={enlargedChart !== null} onOpenChange={(open) => !open && setEnlargedChart(null)}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>
              {enlargedChart === "money"
                ? "Money on Table per Session"
                : "Player Comparison (Cumulative Profit)"}
            </DialogTitle>
            <DialogClose onClose={() => setEnlargedChart(null)} />
          </DialogHeader>
          <div className="h-[600px] w-full">
            {enlargedChart === "money" && (
              <BankrollChart data={moneyOnTableSeries} activeSessionDate={activeSessionDate ?? undefined} />
            )}
            {enlargedChart === "comparison" && (
              <PlayerComparisonChart players={topPlayerSeries} activePlayerIds={activePlayerIds} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
