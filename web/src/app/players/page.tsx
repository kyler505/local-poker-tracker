import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Player } from "../../../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function PlayersPage() {
  const [{ data: players }, { data: transactions }] = await Promise.all([
    supabase.from("players").select("*").order("name", { ascending: true }),
    supabase
      .from("transactions")
      .select("player_id,session_id,net_profit,buy_in_amount,cash_out_amount"),
  ]);

  type PlayerRow = {
    playerId: string;
    name: string;
    nickname: string | null;
    totalProfit: number;
    sessionsPlayed: number;
  };

  const playerMap = new Map<string, PlayerRow>();
  const sessionSet = new Set<string>(); // playerId|sessionId with action

  const typedPlayers = (players ?? []) as Player[];

  for (const p of typedPlayers) {
    playerMap.set(p.id as string, {
      playerId: p.id as string,
      name: p.name as string,
      nickname: (p.nickname as string | null) ?? null,
      totalProfit: 0,
      sessionsPlayed: 0,
    });
  }

  for (const tx of transactions ?? []) {
    const playerId = tx.player_id as string;
    const sessionId = tx.session_id as string;
    const net = Number(tx.net_profit ?? 0);
    const buyIn = Number(tx.buy_in_amount ?? 0);
    const cashOut = Number(tx.cash_out_amount ?? 0);

    const row = playerMap.get(playerId);
    if (!row) continue;

    row.totalProfit += net;

    if (buyIn !== 0 || cashOut !== 0) {
      const key = `${playerId}|${sessionId}`;
      if (!sessionSet.has(key)) {
        sessionSet.add(key);
        row.sessionsPlayed += 1;
      }
    }
  }

  const rows = Array.from(playerMap.values()).sort(
    (a, b) => b.totalProfit - a.totalProfit
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Players
        </h1>
        <p className="text-sm text-muted-foreground">
          Browse all players and drill into their individual performance.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead className="w-[120px] text-right">
                Sessions
              </TableHead>
              <TableHead className="w-[140px] text-right">
                Total Profit
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.playerId}>
                  <TableCell className="text-sm">
                    <Link
                      href={`/players/${row.playerId}`}
                      className="hover:underline"
                    >
                      {row.name}
                    </Link>
                    {row.nickname ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({row.nickname})
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {row.sessionsPlayed}
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
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-center text-sm">
                  No players yet. Add players in Supabase or via future admin
                  tools.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
