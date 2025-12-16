"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabaseClient";

type ActionState = {
  error?: string | null;
  success?: boolean;
};

export async function createPlayer(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = formData.get("name")?.toString().trim() ?? "";
  const nicknameRaw = formData.get("nickname")?.toString().trim() ?? "";
  const nickname = nicknameRaw.length ? nicknameRaw : null;

  if (!name) {
    return { error: "Name is required.", success: false };
  }

  const { error } = await supabase
    .from("players")
    .insert({ name, nickname })
    .single();

  if (error) {
    // 23505 = unique_violation
    if (error.code === "23505") {
      return { error: "A player with that name already exists.", success: false };
    }
    return { error: "Unable to add player. Please try again.", success: false };
  }

  revalidatePath("/players");
  return { error: null, success: true };
}
