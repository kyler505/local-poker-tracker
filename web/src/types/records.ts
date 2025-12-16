import type { SessionStatus } from "./database";

export type PlayerRecord = {
  id: string;
  name: string;
  nickname: string | null;
};

export type SessionRecord = {
  id: string;
  date: string; // YYYY-MM-DD
  location: string | null;
  status: SessionStatus;
  duration_hours?: string | null;
};

export type TransactionRecord = {
  id?: string;
  session_id: string;
  player_id: string;
  buy_in_amount: string | null;
  cash_out_amount: string | null;
  net_profit: string | null;
};
