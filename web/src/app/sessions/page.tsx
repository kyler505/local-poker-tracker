import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { createSession, deleteSession } from "./actions";
import { Button } from "@/components/ui/button";
import { getCurrentCSTDate, formatCSTDate } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function SessionsPage() {
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .order("date", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Sessions
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and manage poker sessions. Use the Active Game view for live
            tracking.
          </p>
        </div>
        <form
          action={createSession}
          className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 text-sm md:flex-row md:items-center"
        >
          <input
            type="date"
            name="date"
            className="h-9 rounded-md border border-border bg-background px-2 text-xs outline-none ring-0 focus-visible:ring-1"
            defaultValue={getCurrentCSTDate()}
            required
          />
          <input
            type="text"
            name="location"
            placeholder="Location"
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs outline-none ring-0 focus-visible:ring-1 md:flex-1"
            required
          />
          <Button
            type="submit"
            size="sm"
            className="w-full whitespace-nowrap md:w-auto"
          >
            New Session
          </Button>
        </form>
      </div>

      {/* Desktop table */}
      <div className="hidden rounded-xl border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="w-[120px]">Duration (hrs)</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[200px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions?.length ? (
              sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="text-sm">
                    {formatCSTDate(session.date)}
                  </TableCell>
                  <TableCell className="text-sm">{session.location}</TableCell>
                  <TableCell className="text-sm">
                    {(() => {
                      const raw = (session.duration_hours ??
                        null) as string | null;
                      if (!raw) return "—";
                      const num = Number(raw);
                      if (Number.isNaN(num)) return "—";
                      return `${num.toFixed(1)} h`;
                    })()}
                  </TableCell>
                  <TableCell className="text-xs capitalize">
                    {session.status}
                  </TableCell>
                  <TableCell className="flex justify-end gap-2 text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/sessions/${session.id}`}>Open</Link>
                    </Button>
                    {session.status === "active" && (
                      <form action={deleteSession}>
                        <input
                          type="hidden"
                          name="sessionId"
                          value={session.id as string}
                        />
                        <Button type="submit" size="sm" variant="outline">
                          Delete
                        </Button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm">
                  No sessions yet. Create your first session to start tracking.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="space-y-3 md:hidden">
        {sessions?.length ? (
          sessions.map((session) => {
            const durationLabel = (() => {
              const raw = (session.duration_hours ?? null) as string | null;
              if (!raw) return "—";
              const num = Number(raw);
              if (Number.isNaN(num)) return "—";
              return `${num.toFixed(1)} h`;
            })();

            return (
              <div
                key={session.id}
                className="rounded-xl border border-border bg-card p-3 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {formatCSTDate(session.date)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {session.location}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
                    {session.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Duration</span>
                  <span className="font-medium text-foreground">
                    {durationLabel}
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <Button asChild size="sm" className="w-full">
                    <Link href={`/sessions/${session.id}`}>Open Session</Link>
                  </Button>
                  {session.status === "active" && (
                    <form action={deleteSession}>
                      <input
                        type="hidden"
                        name="sessionId"
                        value={session.id as string}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        Delete
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No sessions yet. Create your first session to start tracking.
          </p>
        )}
      </div>
    </div>
  );
}
