import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { BankrollChart } from "@/components/dashboard/bankroll-chart";
import { LeaderboardTable } from "@/components/dashboard/leaderboard-table";
import { PlayerComparisonChart } from "@/components/dashboard/player-comparison-chart";
import type { SessionRecord, TransactionRecord } from "@/types/records";

export const dynamic = "force-dynamic";

// Helper to render Postgres `date` (YYYY-MM-DD) without timezone shifting it.
function formatDbDate(date: string | null | undefined) {
  if (!date) return "";
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US");
}

type HomeSearchParams = {
  preset?: string;
  from?: string;
  to?: string;
};

function parseDateRange(params: HomeSearchParams) {
  const preset = params.preset ?? "all";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const to =
    params.to && !Number.isNaN(Date.parse(params.to))
      ? params.to
      : today.toISOString().slice(0, 10);

  const mkFrom = (days: number) => {
    const d = new Date(to);
    d.setDate(d.getDate() - (days - 1));
    return d.toISOString().slice(0, 10);
  };

  if (preset === "7d") {
    const from = mkFrom(7);
    return { preset, from, to, label: "Last 7 days" };
  }
  if (preset === "30d") {
    const from = mkFrom(30);
    return { preset, from, to, label: "Last 30 days" };
  }
  if (preset === "90d") {
    const from = mkFrom(90);
    return { preset, from, to, label: "Last 90 days" };
  }

  // Custom range
  if (params.from && !Number.isNaN(Date.parse(params.from))) {
    return {
      preset: "custom",
      from: params.from,
      to,
      label: `From ${params.from} to ${to}`,
    };
  }

  // All time
  return { preset: "all", from: undefined, to: undefined, label: "All time" };
}

export default async function Home({
  searchParams,
}: {
  searchParams?: HomeSearchParams;
}) {
  const { from, to, label: rangeLabel, preset } = parseDateRange(
    searchParams ?? {}
  );

  const [{ data: sessionRows }, { data: txRows }] = await Promise.all([
    supabase
      .from("sessions")
      .select("*")
      .order("date", { ascending: true }),
    supabase
      .from("transactions")
      .select(
        "session_id,player_id,buy_in_amount,cash_out_amount,net_profit,player:players(id,name)"
      )
      .returns<
        (Omit<TransactionRecord, "id"> & {
          player: { id: string; name: string } | null;
        })[]
      >(),
  ]);

  const allSessions = (sessionRows ?? []) as SessionRecord[];

  const filteredSessions = allSessions.filter((s) => {
    if (!from && !to) return true;
    const d = s.date;
    if (!d) return false;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });

  const filteredSessionIds = new Set(filteredSessions.map((s) => s.id));

  const transactions = ((txRows ?? []) as (TransactionRecord & {
    player: { id: string; name: string } | null;
  })[]).filter((t) => filteredSessionIds.has(t.session_id));

  const recentSessions = [...filteredSessions]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5);

  const totalSessions = filteredSessions.length;

  const totals = transactions.reduce(
    (acc, t) => {
      const buyIn = Number(t.buy_in_amount ?? 0);
      const cashOut = Number(t.cash_out_amount ?? 0);
      acc.totalBuyIns += buyIn;
      acc.totalCashOuts += cashOut;
      return acc;
    },
    { totalBuyIns: 0, totalCashOuts: 0 }
  );

  // Interpret \"Total Money Circulated\" as the total amount of money
  // that has been put onto the table across all sessions (sum of buy-ins).
  const totalMoneyCirculated = totals.totalBuyIns || undefined;

  // Leaderboard aggregation
  type LeaderboardEntry = {
    playerId: string;
    name: string;
    totalProfit: number;
    sessionsPlayed: number;
    winningSessions: number;
  };

  const leaderboardMap = new Map<string, LeaderboardEntry>();
  const playerSessionOutcome = new Map<string, number>(); // key: playerId|sessionId, value: net
  const playerSessionHasVolume = new Set<string>(); // sessions where player actually put money on the table

  for (const tx of transactions) {
    const playerId = tx.player_id;
    const sessionId = tx.session_id;
    const net = Number(tx.net_profit ?? 0);
    const buyIn = Number(tx.buy_in_amount ?? 0);
    const cashOut = Number(tx.cash_out_amount ?? 0);
    const key = `${playerId}|${sessionId}`;
    playerSessionOutcome.set(key, (playerSessionOutcome.get(key) ?? 0) + net);

    // Only count sessions where the player actually had action
    // (non-zero buy-in or cash-out) toward sessionsPlayed.
    if (buyIn !== 0 || cashOut !== 0) {
      playerSessionHasVolume.add(key);
    }

    if (!leaderboardMap.has(playerId)) {
      leaderboardMap.set(playerId, {
        playerId,
        name: tx.player?.name ?? "Unknown",
        totalProfit: 0,
        sessionsPlayed: 0,
        winningSessions: 0,
      });
    }

    const entry = leaderboardMap.get(playerId)!;
    entry.totalProfit += net;
  }

  // compute session counts and win rate
  for (const [key, net] of playerSessionOutcome.entries()) {
    // Skip sessions where the player never actually put money on the table.
    if (!playerSessionHasVolume.has(key)) continue;
    const [playerId] = key.split("|");
    const entry = leaderboardMap.get(playerId);
    if (!entry) continue;
    entry.sessionsPlayed += 1;
    if (net > 0) {
      entry.winningSessions += 1;
    }
  }

  const leaderboard = Array.from(leaderboardMap.values()).map((entry) => ({
    ...entry,
    winRate:
      entry.sessionsPlayed > 0
        ? (entry.winningSessions / entry.sessionsPlayed) * 100
        : 0,
  }));

  const topWinner =
    leaderboard.length > 0
      ? [...leaderboard].sort((a, b) => b.totalProfit - a.totalProfit)[0]
      : undefined;

  // Cumulative total money put on the table over time (sum of buy-ins)
  const sessionBuyins = transactions.reduce((map, tx) => {
    const sessionId = tx.session_id;
    const buyIn = Number(tx.buy_in_amount ?? 0);
    map.set(sessionId, (map.get(sessionId) ?? 0) + buyIn);
    return map;
  }, new Map<string, number>());

  const sessionDateMap = new Map<string, string>();
  for (const s of filteredSessions) {
    sessionDateMap.set(s.id, s.date);
  }

  // Money on the table per session (sum of buy-ins for that date)
  const moneyOnTableSeries = Array.from(sessionBuyins.entries())
    .map(([sessionId, amount]) => ({
      date: sessionDateMap.get(sessionId) ?? "",
      cumulative: amount, // reuse `cumulative` field for chart y-value
    }))
    .filter((d) => d.date)
    .sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

  // Per-player cumulative profit series for comparison chart
  type PlayerSessionNet = {
    sessionId: string;
    date: string;
    net: number;
    playerId: string;
    name: string;
  };

  const playerSessionMap = new Map<string, PlayerSessionNet[]>(); // playerId -> entries

  for (const tx of transactions) {
    const playerId = tx.player_id;
    const name = tx.player?.name ?? "Unknown";
    const sessionId = tx.session_id;
    const date = sessionDateMap.get(sessionId) ?? "";
    if (!date) continue;
    const net = Number(tx.net_profit ?? 0);

    const arr = playerSessionMap.get(playerId) ?? [];
    arr.push({ sessionId, date, net, playerId, name });
    playerSessionMap.set(playerId, arr);
  }

  type PlayerSeries = {
    playerId: string;
    name: string;
    series: { date: string; cumulative: number }[];
  };

  const playerSeries: PlayerSeries[] = [];

  for (const [playerId, entries] of playerSessionMap.entries()) {
    const bySession = new Map<string, { date: string; net: number }>();
    for (const e of entries) {
      const prev = bySession.get(e.sessionId) ?? { date: e.date, net: 0 };
      prev.net += e.net;
      prev.date = e.date;
      bySession.set(e.sessionId, prev);
    }

    const perSession = Array.from(bySession.values()).sort((a, b) =>
      a.date < b.date ? -1 : 1
    );

    let cumulative = 0;
    const series = perSession.map((s) => {
      cumulative += s.net;
      return { date: s.date, cumulative };
    });

    if (!series.length) continue;

    const name = entries[0]?.name ?? "Unknown";
    playerSeries.push({ playerId, name, series });
  }

  const TOP_N = 5;
  const topPlayerSeries = playerSeries
    .sort(
      (a, b) =>
        (b.series[b.series.length - 1]?.cumulative ?? 0) -
        (a.series[a.series.length - 1]?.cumulative ?? 0)
    )
    .slice(0, TOP_N);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Welcome to Dong's Sun Run
        </h1>
        <p className="text-xs text-muted-foreground">
          Showing results: {rangeLabel}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Link
            href="/"
            className={`rounded-full border px-2 py-1 ${
              preset === "all" ? "bg-primary text-primary-foreground" : ""
            }`}
          >
            All time
          </Link>
          <Link
            href="/?preset=7d"
            className={`rounded-full border px-2 py-1 ${
              preset === "7d" ? "bg-primary text-primary-foreground" : ""
            }`}
          >
            Last 7 days
          </Link>
          <Link
            href="/?preset=30d"
            className={`rounded-full border px-2 py-1 ${
              preset === "30d" ? "bg-primary text-primary-foreground" : ""
            }`}
          >
            Last 30 days
          </Link>
          <Link
            href="/?preset=90d"
            className={`rounded-full border px-2 py-1 ${
              preset === "90d" ? "bg-primary text-primary-foreground" : ""
            }`}
          >
            Last 90 days
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Total Sessions
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {typeof totalSessions === "number"
              ? totalSessions.toLocaleString("en-US")
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Total Money Circulated
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {typeof totalMoneyCirculated === "number"
              ? `$${totalMoneyCirculated.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Top Winner (All Time)
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {topWinner
              ? `${topWinner.name} ($${topWinner.totalProfit.toLocaleString(
                  "en-US",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )})`
              : "—"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 md:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Money on Table per Session
            </p>
          </div>
          <div className="h-64">
            <BankrollChart data={moneyOnTableSeries} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Recent Sessions
            </p>
            <Link
              href="/sessions"
              className="text-xs text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2 text-sm">
            {recentSessions.length ? (
              recentSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-2 py-1.5 text-xs hover:bg-muted"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {formatDbDate(s.date as string)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {s.location}
                    </span>
                  </div>
                  <span className="text-[11px] capitalize text-muted-foreground">
                    {s.status}
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">
                No recent sessions.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Player Comparison (Cumulative Profit)
          </p>
          <p className="text-[11px] text-muted-foreground">
            Top {TOP_N} players in current range
          </p>
        </div>
        <div className="h-64">
          <PlayerComparisonChart players={topPlayerSeries} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Leaderboard
          </p>
          <Link
            href="/players"
            className="text-xs text-primary hover:underline"
          >
            View players
          </Link>
        </div>
        <LeaderboardTable
          rows={leaderboard.map((row) => ({
            playerId: row.playerId,
            name: row.name,
            totalProfit: row.totalProfit,
            sessionsPlayed: row.sessionsPlayed,
            winningSessions: row.winningSessions,
            winRate: row.winRate,
          }))}
        />
      </div>
    </div>
  );
}
