import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type {
  PlayerRecord,
  TransactionRecord,
  SessionRecord,
} from "@/types/records";

export const dynamic = "force-dynamic";
import {
  addBuyIn,
  addPlayerToSession,
  completeSession,
  deleteSession,
  removePlayerFromSession,
  reopenSession,
  setCashOut,
  updateSessionLocation,
} from "../actions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

type SessionWithDuration = SessionRecord & {
  duration_hours?: string | null;
};

export default async function SessionPage({ params }: SessionPageProps) {
  const { id: sessionId } = await params;

  const { data: sessionRow } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (!sessionRow) {
    notFound();
  }

  const session = sessionRow as SessionWithDuration;

  const { data: playerRows } = await supabase
    .from("players")
    .select("id,name,nickname")
    .order("name", { ascending: true });

  const players = (playerRows ?? []) as PlayerRecord[];

  const { data: txRows } = await supabase
    .from("transactions")
    .select(
      "id,session_id,player_id,buy_in_amount,cash_out_amount,net_profit,player:players(id,name,nickname)"
    )
    .eq("session_id", sessionId)
    .returns<
      (TransactionRecord & {
        id: string;
        player: { id: string; name: string; nickname: string | null } | null;
      })[]
    >();

  const transactions = (txRows ?? []) as (TransactionRecord & {
    id: string;
    player: { id: string; name: string; nickname: string | null } | null;
  })[];

  const isCompleted = session.status === "completed";

  const sessionTotals = transactions.reduce(
    (acc, tx) => {
      const buyIn = Number(tx.buy_in_amount ?? 0);
      const cashOut = Number(tx.cash_out_amount ?? 0);
      acc.totalBuyIns += buyIn;
      acc.totalCashOuts += cashOut;
      return acc;
    },
    { totalBuyIns: 0, totalCashOuts: 0 }
  );

  const tableProfit = sessionTotals.totalCashOuts - sessionTotals.totalBuyIns;

  const durationHours = (() => {
    const raw = session.duration_hours ?? null;
    if (!raw) return null;
    const num = Number(raw);
    if (Number.isNaN(num)) return null;
    return num;
  })();

  const hourly =
    durationHours && durationHours > 0 ? tableProfit / durationHours : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/sessions" className="hover:underline">
              Sessions
            </Link>
            <span>/</span>
            <span>{new Date(session.date).toLocaleDateString()}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Active Game
          </h1>
          <form
            action={updateSessionLocation}
            className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
          >
            <input type="hidden" name="sessionId" value={sessionId} />
            <span className="font-medium">Location:</span>
            <input
              type="text"
              name="location"
              defaultValue={session.location ?? ""}
              className="h-7 min-w-[140px] rounded-md border border-border bg-background px-2 text-xs outline-none ring-0 focus-visible:ring-1"
            />
            <Button type="submit" size="sm" variant="outline" className="h-7 px-2 text-[11px]">
              Save
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">
            Track buy-ins, cash-outs, and player results live for this session.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form action={isCompleted ? reopenSession : completeSession} className="flex items-center gap-2">
            <input type="hidden" name="sessionId" value={sessionId} />
            {!isCompleted && (
              <input
                type="number"
                name="durationHours"
                step="0.5"
                min="0"
                placeholder="Duration (hrs)"
                className="h-8 w-28 rounded-md border border-border bg-background px-2 text-xs outline-none ring-0 focus-visible:ring-1"
              />
            )}
            <Button
              type="submit"
              size="sm"
              variant={isCompleted ? "outline" : "default"}
            >
              {isCompleted ? "Reopen Session" : "Complete Session"}
            </Button>
          </form>
          {!isCompleted && (
            <form action={deleteSession}>
              <input type="hidden" name="sessionId" value={sessionId} />
              <Button type="submit" size="sm" variant="outline">
                Delete
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3 text-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">
            Duration
          </p>
          <p className="mt-1 text-sm">
            {durationHours != null ? `${durationHours.toFixed(1)} h` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">
            Total Buy-ins
          </p>
          <p className="mt-1 text-sm">
            ${sessionTotals.totalBuyIns.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">
            Total Cash-outs
          </p>
          <p className="mt-1 text-sm">
            ${sessionTotals.totalCashOuts.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">
            Table Profit {hourly != null ? "(Hourly)" : ""}
          </p>
          <p className="mt-1 text-sm">
            <span
              className={
                tableProfit >= 0 ? "text-emerald-600" : "text-red-600"
              }
            >
              ${tableProfit.toFixed(2)}
            </span>
            {hourly != null && (
              <span className="ml-2 text-[11px] text-muted-foreground">
                (${hourly.toFixed(2)}/h)
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:flex-row md:items-end md:justify-between">
        <form
          action={addPlayerToSession}
          className="flex flex-1 flex-col gap-2 text-sm md:flex-row md:items-center"
        >
          <input type="hidden" name="sessionId" value={sessionId} />
          <label className="flex flex-1 items-center gap-2">
            <span className="whitespace-nowrap text-xs font-medium">
              Add Player
            </span>
            <select
              name="playerId"
              className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-xs outline-none ring-0 focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
              required
              disabled={isCompleted}
            >
              <option value="">Select player…</option>
              {players?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.nickname ? ` (${p.nickname})` : ""}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="submit"
            size="sm"
            className="mt-1 md:mt-0"
            disabled={isCompleted}
          >
            Add to Session
          </Button>
        </form>
        <div className="text-xs text-muted-foreground">
          {isCompleted
            ? "This session is completed and cannot be modified."
            : "Quick buy-ins and cash-outs can be used below per player."}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead className="w-[120px] text-right">Buy-ins</TableHead>
              <TableHead className="w-[140px] text-right">Cash-out</TableHead>
              <TableHead className="w-[120px] text-right">Net</TableHead>
              <TableHead className="w-[260px] text-right">Add Buy-in</TableHead>
              <TableHead className="w-[80px] text-right">Remove</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions?.length ? (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-sm">
                    {tx.player ? (
                      <>
                        <Link
                          href={`/players/${tx.player.id}`}
                          className="hover:underline"
                        >
                          {tx.player.name}
                        </Link>
                        {tx.player.nickname ? (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({tx.player.nickname})
                          </span>
                        ) : null}
                      </>
                    ) : (
                      "Unknown"
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    ${Number(tx.buy_in_amount ?? 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    <form
                      action={setCashOut}
                      className="flex items-center justify-end gap-2"
                    >
                      <input type="hidden" name="sessionId" value={sessionId} />
                      <input
                        type="hidden"
                        name="playerId"
                        value={tx.player?.id}
                      />
                      <input
                        type="number"
                        name="cashOutAmount"
                        min="0"
                        step="10"
                        defaultValue={Number(tx.cash_out_amount ?? 0)}
                        className="h-8 w-20 rounded-md border border-border bg-background px-1 text-right text-xs outline-none ring-0 focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isCompleted}
                      />
                      <Button
                        type="submit"
                        size="icon"
                        variant="outline"
                        disabled={isCompleted}
                      >
                        $
                      </Button>
                    </form>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    <span
                      className={
                        Number(tx.net_profit ?? 0) >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }
                    >
                      ${Number(tx.net_profit ?? 0).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                      {/* Quick $25 buy-in */}
                      <form action={addBuyIn}>
                        <input
                          type="hidden"
                          name="sessionId"
                          value={sessionId}
                        />
                        <input
                          type="hidden"
                          name="playerId"
                          value={tx.player?.id}
                        />
                        <input type="hidden" name="amount" value="25" />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          disabled={isCompleted}
                        >
                          +$25
                        </Button>
                      </form>

                      {/* Custom buy-in amount */}
                      <form
                        action={addBuyIn}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="hidden"
                          name="sessionId"
                          value={sessionId}
                        />
                        <input
                          type="hidden"
                          name="playerId"
                          value={tx.player?.id}
                        />
                        <input
                          type="number"
                          name="amount"
                          min="1"
                          step="1"
                          placeholder="Custom"
                          className="h-8 w-20 rounded-md border border-border bg-background px-1 text-right text-xs outline-none ring-0 focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isCompleted}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          disabled={isCompleted}
                        >
                          Add
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={removePlayerFromSession}>
                      <input type="hidden" name="sessionId" value={sessionId} />
                      <input
                        type="hidden"
                        name="playerId"
                        value={tx.player?.id}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        disabled={isCompleted}
                      >
                        Remove
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm">
                  No players in this session yet. Use &quot;Add Player&quot; to
                  start tracking.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
