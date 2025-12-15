"use client";

import { useState } from "react";
import { BankrollChart } from "./bankroll-chart";
import { PlayerComparisonChart } from "./player-comparison-chart";

type MoneyPoint = { date: string; cumulative: number };

type PlayerSeries = {
  playerId: string;
  name: string;
  series: { date: string; cumulative: number }[];
};

interface DashboardPanelsProps {
  moneyOnTableSeries: MoneyPoint[];
  topPlayerSeries: PlayerSeries[];
  topN: number;
}

type PanelKey = "money" | "comparison";

export function DashboardPanels({
  moneyOnTableSeries,
  topPlayerSeries,
  topN,
}: DashboardPanelsProps) {
  const [active, setActive] = useState<PanelKey>("money");

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
          <div className="h-64">
            <BankrollChart data={moneyOnTableSeries} />
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
          <div className="h-64">
            <PlayerComparisonChart players={topPlayerSeries} />
          </div>
        </div>
      )}
    </div>
  );
}
