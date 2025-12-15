"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabaseClient";

async function ensureSessionIsActive(sessionId: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select("status")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Session not found.");
  if (data.status === "completed") {
    throw new Error("This session is completed and can no longer be modified.");
  }
}

async function getSessionTotals(sessionId: string) {
  const { data, error } = await supabase
    .from("transactions")
    .select("buy_in_amount,cash_out_amount")
    .eq("session_id", sessionId);

  if (error) throw error;

  return (data ?? []).reduce(
    (acc, t) => {
      const buyIn = Number(t.buy_in_amount ?? 0);
      const cashOut = Number(t.cash_out_amount ?? 0);
      acc.totalBuyIns += buyIn;
      acc.totalCashOuts += cashOut;
      return acc;
    },
    { totalBuyIns: 0, totalCashOuts: 0 }
  );
}

export async function createSession(formData: FormData) {
  const date = formData.get("date")?.toString();
  const location = formData.get("location")?.toString().trim();

  if (!date || !location) {
    throw new Error("Date and location are required.");
  }

  const { error } = await supabase
    .from("sessions")
    .insert({ date, location, status: "active" });

  if (error) throw error;

  revalidatePath("/sessions");
  revalidatePath("/");
}

export async function addPlayerToSession(formData: FormData) {
  const sessionId = formData.get("sessionId")?.toString();
  const playerId = formData.get("playerId")?.toString();

  if (!sessionId || !playerId) {
    throw new Error("Session and player are required.");
  }

  await ensureSessionIsActive(sessionId);

  const { error } = await supabase.from("transactions").insert({
    session_id: sessionId,
    player_id: playerId,
    buy_in_amount: "0",
    cash_out_amount: "0",
  });

  if (error) {
    // Ignore uniqueness error if player is already in session
    if (error.code !== "23505") {
      throw error;
    }
  }

  revalidatePath(`/sessions/${sessionId}`);
}

export async function addBuyIn(formData: FormData) {
  const sessionId = formData.get("sessionId")?.toString();
  const playerId = formData.get("playerId")?.toString();
  const amount = Number(formData.get("amount") ?? 0);

  if (!sessionId || !playerId || !amount) {
    throw new Error("Invalid buy-in request.");
  }

  await ensureSessionIsActive(sessionId);

  const { data, error } = await supabase
    .from("transactions")
    .select("id,buy_in_amount")
    .eq("session_id", sessionId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Transaction not found for player in this session.");
  }

  const current = Number(data.buy_in_amount ?? 0);
  const newTotal = current + amount;

  const { error: updateError } = await supabase
    .from("transactions")
    .update({ buy_in_amount: newTotal.toString() })
    .eq("id", data.id);

  if (updateError) throw updateError;

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/sessions");
}

export async function setCashOut(formData: FormData) {
  const sessionId = formData.get("sessionId")?.toString();
  const playerId = formData.get("playerId")?.toString();
  const cashOutAmount = Number(formData.get("cashOutAmount") ?? 0);

  if (!sessionId || !playerId) {
    throw new Error("Invalid cash-out request.");
  }

  await ensureSessionIsActive(sessionId);

  const { data, error } = await supabase
    .from("transactions")
    .select("id")
    .eq("session_id", sessionId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Transaction not found for player in this session.");
  }

  const { error: updateError } = await supabase
    .from("transactions")
    .update({ cash_out_amount: cashOutAmount.toString() })
    .eq("id", data.id);

  if (updateError) throw updateError;

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/sessions");
}

export async function completeSession(formData: FormData) {
  const sessionId = formData.get("sessionId")?.toString();

  if (!sessionId) {
    throw new Error("Session id is required.");
  }

  const totals = await getSessionTotals(sessionId);

  if (totals.totalBuyIns !== totals.totalCashOuts) {
    throw new Error(
      "Session cannot be completed until total buy-ins equal total cash-outs."
    );
  }

  const { error } = await supabase
    .from("sessions")
    .update({ status: "completed" })
    .eq("id", sessionId);

  if (error) throw error;

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/sessions");
  revalidatePath("/");
}
