import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { createSession } from "./actions";
import { Button } from "@/components/ui/button";

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
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
          <input
            type="text"
            name="location"
            placeholder="Location"
            className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-xs outline-none ring-0 focus-visible:ring-1"
            required
          />
          <Button type="submit" size="sm" className="whitespace-nowrap">
            New Session
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions?.length ? (
              sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="text-sm">
                    {new Date(session.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm">{session.location}</TableCell>
                  <TableCell className="text-xs capitalize">
                    {session.status}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/sessions/${session.id}`}>Open</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm">
                  No sessions yet. Create your first session to start tracking.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
