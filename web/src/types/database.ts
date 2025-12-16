export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SessionStatus = "active" | "completed";

export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          name: string;
          nickname: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          nickname?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          nickname?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          date: string; // YYYY-MM-DD
          location: string;
          status: SessionStatus;
          duration_hours: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          location: string;
          status?: SessionStatus;
          duration_hours?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          location?: string;
          status?: SessionStatus;
          duration_hours?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          session_id: string;
          player_id: string;
          buy_in_amount: string;
          cash_out_amount: string;
          net_profit: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          player_id: string;
          buy_in_amount?: string;
          cash_out_amount?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          player_id?: string;
          buy_in_amount?: string;
          cash_out_amount?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_player_id_fkey";
            columns: ["player_id"];
            referencedRelation: "players";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      session_status: SessionStatus;
    };
    CompositeTypes: {};
  };
}
