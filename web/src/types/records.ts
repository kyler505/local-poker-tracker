// Minimal record types used by the Next.js app when reading from Supabase.
// These are deliberately small and UI-focused to keep Render builds simple.

export type PlayerRecord = {
  id: string;
  name: string;
  nickname: string | null;
};

export type SessionRecord = {
  id: string;
  date: string;
  location?: string | null;
  status?: string | null;
};

export type TransactionRecord = {
  id?: string;
  session_id: string;
  player_id: string;
  buy_in_amount: string | null;
  cash_out_amount: string | null;
  net_profit: string | null;
};
