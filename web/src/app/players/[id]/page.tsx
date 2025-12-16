import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { BankrollChart } from "@/components/dashboard/bankroll-chart";
import { formatCSTDate, parseCSTDate } from "@/lib/dateUtils";
import type {
  SessionRecord,
  TransactionRecord,
  PlayerRecord,
} from "@/types/records";

export const dynamic = "force-dynamic";

interface PlayerPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { id: playerId } = await params;

  const [
    { data: playerRow },
    { data: txs },
    { data: sessionRows },
  ] = await Promise.all([
    supabase
      .from("players")
      .select("id,name,nickname")
      .eq("id", playerId)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("session_id,net_profit,buy_in_amount,cash_out_amount")
      .eq("player_id", playerId),
    supabase.from("sessions").select("id,date"),
  ]);

  if (!playerRow) {
    notFound();
  }

  const player = playerRow as PlayerRecord;

  const perSessionMap = new Map<string, number>();
  const typedTxs = (txs ?? []) as Pick<
    TransactionRecord,
    "session_id" | "net_profit" | "buy_in_amount" | "cash_out_amount"
  >[];
  for (const tx of typedTxs) {
    const sessionId = tx.session_id;
    const buyIn = Number(tx.buy_in_amount ?? 0);
    const cashOut = Number(tx.cash_out_amount ?? 0);
    // Only include sessions where player actually participated (had money on the table)
    if (buyIn === 0 && cashOut === 0) {
      continue; // Skip sessions with no actual participation
    }
    const net = Number(tx.net_profit ?? 0);
    perSessionMap.set(sessionId, (perSessionMap.get(sessionId) ?? 0) + net);
  }

  const sessionDateMap = new Map<string, string>();
  const typedSessions = (sessionRows ?? []) as SessionRecord[];
  for (const s of typedSessions) {
    sessionDateMap.set(s.id, s.date);
  }

  // Only include sessions where player actually participated (has transactions)
  // This already filters out sessions the player wasn't at since perSessionMap
  // only contains sessions with transactions for this player
  const perSessionAsc = Array.from(perSessionMap.entries())
    .map(([sessionId, net]) => ({
      sessionId,
      date: sessionDateMap.get(sessionId) ?? "",
      net,
    }))
    .filter((d) => d.date) // Only sessions with valid dates
    .sort(
      (a, b) => parseCSTDate(a.date).getTime() - parseCSTDate(b.date).getTime()
    );

  // For display, show most recent first
  const perSessionDesc = [...perSessionAsc].sort(
    (a, b) => parseCSTDate(b.date).getTime() - parseCSTDate(a.date).getTime()
  );

  // Find the first session where the player participated
  const firstParticipationDate =
    perSessionAsc.length > 0 ? perSessionAsc[0].date : null;

  // Build cumulative profit graph - includes ALL sessions from first participation onward
  // For sessions where player participated, use actual net profit
  // For sessions where player didn't participate, use 0 net (flat line) and no dot
  const allSessionsSorted = Array.from(sessionDateMap.entries())
    .map(([sessionId, date]) => ({
      sessionId,
      date,
    }))
    .filter((d) => d.date)
    .sort(
      (a, b) => parseCSTDate(a.date).getTime() - parseCSTDate(b.date).getTime()
    );

  // Filter to only include sessions from first participation date onward
  const sessionsFromFirstParticipation = firstParticipationDate
    ? allSessionsSorted.filter(
        (s) => parseCSTDate(s.date).getTime() >= parseCSTDate(firstParticipationDate).getTime()
      )
    : allSessionsSorted;

  const profitOverTime = sessionsFromFirstParticipation.reduce<
    { date: string; cumulative: number; hasParticipation: boolean }[]
  >((acc, curr) => {
    const prev = acc[acc.length - 1]?.cumulative ?? 0;
    const net = perSessionMap.get(curr.sessionId) ?? 0; // 0 if player didn't participate
    const hasParticipation = perSessionMap.has(curr.sessionId);
    acc.push({
      date: curr.date,
      cumulative: prev + net, // For non-participation sessions, net is 0, so cumulative stays same
      hasParticipation,
    });
    return acc;
  }, []);

  const totalProfit = perSessionAsc.reduce((sum, s) => sum + s.net, 0);
  const bestWin =
    perSessionAsc.length > 0
      ? Math.max(...perSessionAsc.map((s) => s.net))
      : undefined;
  const worstLoss =
    perSessionAsc.length > 0
      ? Math.min(...perSessionAsc.map((s) => s.net))
      : undefined;
  const avgProfit =
    perSessionAsc.length > 0 ? totalProfit / perSessionAsc.length : undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/players" className="hover:underline">
            Players
          </Link>
          <span>/</span>
          <span>{player.name}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {player.name}
          {player.nickname ? (
            <span className="ml-2 text-base text-muted-foreground">
              ({player.nickname})
            </span>
          ) : null}
        </h1>
        <p className="text-sm text-muted-foreground">
          Cumulative profit and session results over time.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Total Profit
          </p>
          <p className="mt-2 text-2xl font-semibold">
            <span
              className={
                totalProfit >= 0 ? "text-emerald-600" : "text-red-600"
              }
            >
              $
              {totalProfit.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Best Win
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {typeof bestWin === "number"
              ? `$${bestWin.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Worst Loss
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {typeof worstLoss === "number"
              ? `$${worstLoss.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Avg Profit / Session
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {typeof avgProfit === "number"
              ? `$${avgProfit.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "—"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Cumulative Profit Over Time
          </p>
        </div>
        <div className="h-64">
          <BankrollChart data={profitOverTime} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
          Session Results
        </p>
        <div className="space-y-2 text-sm">
          {perSessionDesc.length ? (
            perSessionDesc.map((s) => (
              <div
                key={s.sessionId}
                className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-2 py-1.5 text-xs"
              >
                <span>{formatCSTDate(s.date)}</span>
                <span
                  className={
                    s.net >= 0 ? "text-emerald-600" : "text-red-600"
                  }
                >
                  $
                  {s.net.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">
              No sessions recorded yet for this player.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
