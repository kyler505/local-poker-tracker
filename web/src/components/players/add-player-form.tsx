"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { createPlayer } from "@/app/players/actions";
import { Button } from "@/components/ui/button";

const initialState = { error: null as string | null, success: false };

export function AddPlayerForm() {
  const [state, formAction] = useFormState(createPlayer, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset();
    }
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 text-sm md:flex-row md:items-center"
    >
      <div className="flex flex-1 flex-col gap-1">
        <label className="text-[11px] font-medium text-muted-foreground">
          Name *
        </label>
        <input
          type="text"
          name="name"
          required
          placeholder="Player name"
          className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs outline-none ring-0 focus-visible:ring-1"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <label className="text-[11px] font-medium text-muted-foreground">
          Nickname (optional)
        </label>
        <input
          type="text"
          name="nickname"
          placeholder="Nickname"
          className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs outline-none ring-0 focus-visible:ring-1"
        />
      </div>
      <div className="flex flex-col gap-1 md:self-end">
        <Button type="submit" size="sm" className="w-full md:w-auto">
          Add Player
        </Button>
        {state.error ? (
          <span className="text-[11px] text-red-600">{state.error}</span>
        ) : null}
      </div>
    </form>
  );
}
