import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  addBuyIn,
  addPlayerToSession,
  completeSession,
  setCashOut,
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

  const session = {
    id: (sessionRow as { id: string }).id,
    date: (sessionRow as { date: string }).date,
    location: (sessionRow as { location: string }).location,
    status: (sessionRow as { status: string }).status,
  };

  const { data: playerRows } = await supabase
    .from("players")
    .select("id,name,nickname")
    .order("name", { ascending: true });

  type PlayerRow = { id: string; name: string; nickname: string | null };
  const players = (playerRows ?? []) as PlayerRow[];

  const { data: txRows } = await supabase
    .from("transactions")
    .select("id,buy_in_amount,cash_out_amount,net_profit,player:players(id,name,nickname)")
    .eq("session_id", sessionId);

  type TxRow = {
    id: string;
    buy_in_amount: string | null;
    cash_out_amount: string | null;
    net_profit: string | null;
    player: { id: string; name: string; nickname: string | null } | null;
  };

  const transactions = (txRows ?? []) as TxRow[];

  const isCompleted = session.status === "completed";

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
            Active Game · {session.location}
          </h1>
          <p className="text-sm text-muted-foreground">
            Track buy-ins, cash-outs, and player results live for this session.
          </p>
        </div>
        <form action={completeSession}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <Button
            type="submit"
            size="sm"
            variant={isCompleted ? "outline" : "default"}
            disabled={isCompleted}
          >
            {isCompleted ? "Completed" : "Complete Session"}
          </Button>
        </form>
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
              <TableHead className="w-[260px] text-right">
                Quick Actions
              </TableHead>
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
