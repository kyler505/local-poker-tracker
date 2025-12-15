/**
 * CSV import script to backfill Supabase from historical session data.
 *
 * Expected CSV format (one row per player-session):
 *   date,location,player,nickname,buy_in,cash_out
 *
 * - `date`      : YYYY-MM-DD
 * - `location`  : string (e.g. "Home Game")
 * - `player`    : player name (matches `players.name`, will be created if missing)
 * - `nickname`  : optional nickname
 * - `buy_in`    : total buy-in amount for that player in that session
 * - `cash_out`  : total cash-out amount for that player in that session
 *
 * Usage (from `web/` directory):
 *   npm run import:csv -- ./path/to/csv-directory
 *
 * You must set these env vars (e.g. in `.env.local`):
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *   NEXT_PUBLIC_SUPABASE_URL=...
 */

import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../types";

dotenv.config({ path: ".env.local" });
dotenv.config(); // Fallback to .env if present

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  // eslint-disable-next-line no-console
  console.error(
    "Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, serviceKey);

type CsvRow = {
  date: string;
  location: string;
  player: string;
  nickname?: string;
  buy_in: string;
  cash_out: string;
};

async function getOrCreatePlayer(name: string, nickname?: string | null) {
  const { data, error } = await supabase
    .from("players")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  if (data) return data.id;

  const { data: inserted, error: insertError } = await supabase
    .from("players")
    .insert({
      name,
      nickname: nickname ?? null,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw insertError ?? new Error("Failed to insert player");
  }

  return inserted.id;
}

async function getOrCreateSession(date: string, location: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select("id")
    .eq("date", date)
    .eq("location", location)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  if (data) return data.id;

  const { data: inserted, error: insertError } = await supabase
    .from("sessions")
    .insert({
      date,
      location,
      status: "completed",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw insertError ?? new Error("Failed to insert session");
  }

  return inserted.id;
}

async function upsertTransaction(
  sessionId: string,
  playerId: string,
  buyIn: number,
  cashOut: number
) {
  const { error } = await supabase
    .from("transactions")
    .upsert(
      {
        session_id: sessionId,
        player_id: playerId,
        buy_in_amount: buyIn.toString(),
        cash_out_amount: cashOut.toString(),
      },
      { onConflict: "session_id,player_id" }
    );

  if (error) {
    throw error;
  }
}

async function importCsvFile(filePath: string) {
  const content = fs.readFileSync(filePath, "utf8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];

  // eslint-disable-next-line no-console
  console.log(`Importing ${records.length} rows from ${filePath}...`);

  for (const row of records) {
    const { date, location, player, nickname, buy_in, cash_out } = row;
    if (!date || !location || !player) {
      // eslint-disable-next-line no-console
      console.warn("Skipping row with missing date/location/player:", row);
      continue;
    }

    const buyIn = Number(buy_in ?? 0);
    const cashOut = Number(cash_out ?? 0);

    const playerId = await getOrCreatePlayer(player, nickname ?? null);
    const sessionId = await getOrCreateSession(date, location);
    await upsertTransaction(sessionId, playerId, buyIn, cashOut);
  }
}

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    // eslint-disable-next-line no-console
    console.error("Usage: npm run import:csv -- ./path/to/csv-directory");
    process.exit(1);
  }

  const absDir = path.resolve(dir);
  const entries = fs.readdirSync(absDir);
  const csvFiles = entries.filter((f) => f.toLowerCase().endsWith(".csv"));

  if (!csvFiles.length) {
    // eslint-disable-next-line no-console
    console.error("No .csv files found in", absDir);
    process.exit(1);
  }

  for (const file of csvFiles) {
    const fullPath = path.join(absDir, file);
    // eslint-disable-next-line no-console
    console.log("Processing", fullPath);
    await importCsvFile(fullPath);
  }

  // eslint-disable-next-line no-console
  console.log("Import complete.");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Import failed:", err);
  process.exit(1);
});
