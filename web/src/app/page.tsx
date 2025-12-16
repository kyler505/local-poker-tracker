import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { DashboardPanels } from "@/components/dashboard/dashboard-panels";
import { LeaderboardTable } from "@/components/dashboard/leaderboard-table";
import { formatCSTDate, getCurrentCSTDate, parseCSTDate } from "@/lib/dateUtils";
import type { SessionRecord, TransactionRecord } from "@/types/records";

export const dynamic = "force-dynamic";

type HomeSearchParams = {
  [key: string]: string | string[] | undefined;
};

function normalizeParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseDateRange(params: HomeSearchParams) {
  const preset = normalizeParam(params.preset) ?? "all";
  // Use CST date for "today"
  const todayCST = getCurrentCSTDate();

  const rawTo = normalizeParam(params.to);
  const to =
    rawTo && !Number.isNaN(Date.parse(rawTo))
      ? rawTo
      : todayCST;

  const mkFrom = (days: number) => {
    const d = parseCSTDate(to);
    d.setUTCDate(d.getUTCDate() - (days - 1));
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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

  const rawFrom = normalizeParam(params.from);

  // Custom range
  if (rawFrom && !Number.isNaN(Date.parse(rawFrom))) {
    return {
      preset: "custom",
      from: rawFrom,
      to,
      label: `From ${rawFrom} to ${to}`,
    };
  }

  // All time
  return { preset: "all", from: undefined, to: undefined, label: "All time" };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  const { from, to, label: rangeLabel, preset } = parseDateRange(
    resolvedSearchParams ?? {}
  );

  const [
    { data: sessionRows },
    { data: txRows },
    { data: activeSessions },
  ] = await Promise.all([
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
    supabase
      .from("sessions")
      .select("id,date")
      .eq("status", "active")
      .order("date", { ascending: false })
      .limit(1),
  ]);

  // Query transactions for active sessions
  const activeSessionIds = (activeSessions ?? []).map((s) => s.id);
  const { data: activeSessionTransactions } = activeSessionIds.length > 0
    ? await supabase
        .from("transactions")
        .select("player_id")
        .in("session_id", activeSessionIds)
    : { data: null };

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

  const recentSessions = [...filteredSessions].sort((a, b) =>
    a.date < b.date ? 1 : -1
  );

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

  // Top earner from most recent completed session
  const completedSessions = filteredSessions.filter(
    (s) => s.status === "completed"
  );
  const mostRecentCompletedSession =
    completedSessions.length > 0
      ? [...completedSessions].sort((a, b) => (a.date < b.date ? 1 : -1))[0]
      : undefined;

  let lastSessionWinner:
    | { name: string; profit: number }
    | undefined = undefined;

  if (mostRecentCompletedSession) {
    const sessionTransactions = transactions.filter(
      (t) => t.session_id === mostRecentCompletedSession.id
    );

    // Group by player and sum net profit
    const playerProfitMap = new Map<string, { name: string; profit: number }>();
    for (const tx of sessionTransactions) {
      const playerId = tx.player_id;
      const net = Number(tx.net_profit ?? 0);
      const playerName = tx.player?.name ?? "Unknown";

      if (!playerProfitMap.has(playerId)) {
        playerProfitMap.set(playerId, { name: playerName, profit: 0 });
      }
      const entry = playerProfitMap.get(playerId)!;
      entry.profit += net;
    }

    // Find player with highest profit
    if (playerProfitMap.size > 0) {
      const entries = Array.from(playerProfitMap.values());
      lastSessionWinner = entries.reduce((max, curr) =>
        curr.profit > max.profit ? curr : max
      );
    }
  }

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

  // Get active session date if exists
  const activeSessionDate = activeSessions && activeSessions.length > 0
    ? (activeSessions[0] as SessionRecord).date
    : null;

  // Get set of active player IDs
  const activePlayerIds = new Set<string>(
    (activeSessionTransactions ?? []).map((t: { player_id: string }) => t.player_id)
  );

  // Money on the table per session (sum of buy-ins for that date)
  const moneyOnTableSeries = Array.from(sessionBuyins.entries())
    .map(([sessionId, amount]) => ({
      date: sessionDateMap.get(sessionId) ?? "",
      cumulative: amount, // reuse `cumulative` field for chart y-value
    }))
    .filter((d) => d.date)
    .sort(
      (a, b) => parseCSTDate(a.date).getTime() - parseCSTDate(b.date).getTime()
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
    series: { date: string; cumulative: number; hasParticipation: boolean }[];
  };

  // Build a map of player participation per session
  const playerParticipationMap = new Map<string, Set<string>>(); // playerId -> Set of sessionIds where they participated
  for (const tx of transactions) {
    const playerId = tx.player_id;
    const sessionId = tx.session_id;
    const buyIn = Number(tx.buy_in_amount ?? 0);
    const cashOut = Number(tx.cash_out_amount ?? 0);

    // Only mark as participation if player had actual action
    if (buyIn !== 0 || cashOut !== 0) {
      if (!playerParticipationMap.has(playerId)) {
        playerParticipationMap.set(playerId, new Set());
      }
      playerParticipationMap.get(playerId)!.add(sessionId);
    }
  }

  const playerSeries: PlayerSeries[] = [];

  // Get all unique dates from filtered sessions, sorted
  const allSessionDates = Array.from(
    new Set(filteredSessions.map((s) => s.date))
  ).sort((a, b) => (a < b ? -1 : 1));

  for (const [playerId, entries] of playerSessionMap.entries()) {
    const bySession = new Map<string, { date: string; net: number }>();
    for (const e of entries) {
      const prev = bySession.get(e.sessionId) ?? { date: e.date, net: 0 };
      prev.net += e.net;
      prev.date = e.date;
      bySession.set(e.sessionId, prev);
    }

    // Build series including all sessions, with participation flags
    const participationSet = playerParticipationMap.get(playerId) ?? new Set();
    let cumulative = 0;
    const series = allSessionDates.map((date) => {
      // Find session ID for this date
      const sessionForDate = filteredSessions.find((s) => s.date === date);
      if (!sessionForDate) {
        return { date, cumulative, hasParticipation: false };
      }

      const sessionNet = bySession.get(sessionForDate.id)?.net ?? 0;
      cumulative += sessionNet;
      const hasParticipation = participationSet.has(sessionForDate.id);

      return { date, cumulative, hasParticipation };
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="flex flex-col rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Total Sessions
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {typeof totalSessions === "number"
              ? totalSessions.toLocaleString("en-US")
              : "—"}
          </p>
        </div>
        <div className="flex flex-col rounded-xl border border-border bg-card p-4">
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
            Top Winner{preset === "all" ? " (All Time)" : ""}
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
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Last Session Winner
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {lastSessionWinner
              ? `${lastSessionWinner.name} ($${lastSessionWinner.profit.toLocaleString(
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
        <div className="md:col-span-2">
          <DashboardPanels
            moneyOnTableSeries={moneyOnTableSeries}
            topPlayerSeries={topPlayerSeries}
            topN={TOP_N}
            activeSessionDate={activeSessionDate}
            activePlayerIds={activePlayerIds}
          />
        </div>

        <div className="flex h-[320px] flex-col rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Recent Sessions
            </p>
            <Link
              href="/sessions"
              className="text-xs text-primary hover:underline active:opacity-70 transition-opacity"
            >
              View all
            </Link>
          </div>
          <div className="mt-2 flex-1 space-y-2 overflow-y-auto pr-1 text-sm">
            {recentSessions.length ? (
              recentSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-2 py-1.5 text-xs hover:bg-muted active:scale-[0.98] active:bg-muted/80 transition-transform"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {formatCSTDate(s.date as string)}
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

      <div className="rounded-xl border border-border bg-card p-4 mt-4">
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
          activePlayerIds={activePlayerIds}
        />
      </div>
    </div>
  );
}
