"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export type RealtimeChannelConfig = {
  table: "sessions" | "transactions";
  filter?: string; // e.g., session_id=eq.<id>
};

interface RealtimeListenerProps {
  channels: RealtimeChannelConfig[];
}

export function RealtimeListener({ channels }: RealtimeListenerProps) {
  const router = useRouter();

  useEffect(() => {
    if (!channels.length) return;

    const channel = supabase.channel("poker-realtime");

    channels.forEach(({ table, filter }) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter,
        },
        () => {
          router.refresh();
        }
      );
    });

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [channels, router]);

  return null;
}
