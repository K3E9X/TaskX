import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    // ---- Totals (head:true → count only) ----
    const tables = [
      "profiles", "todos", "notes", "bookmarks", "projects",
      "meetings", "diagrams", "snippets", "feed_items", "routines", "usage_tips",
    ] as const;
    const totals: Record<string, number> = {};
    await Promise.all(tables.map(async (t) => {
      const { count } = await supabaseAdmin.from(t).select("id", { head: true, count: "exact" });
      totals[t] = count ?? 0;
    }));

    // ---- Users (auth admin API) ----
    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const users = usersPage?.users ?? [];

    // Signups per day (last 30 days)
    const days: { date: string; signups: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push({ date: iso, signups: 0 });
    }
    users.forEach((u) => {
      const iso = (u.created_at ?? "").slice(0, 10);
      const day = days.find((d) => d.date === iso);
      if (day) day.signups += 1;
    });

    // ---- Content created per day (last 30 days) — todos, notes, feed_items ----
    const since = new Date(now); since.setDate(since.getDate() - 29);
    const sinceIso = since.toISOString();
    async function perDay(table: "todos" | "notes" | "feed_items") {
      const { data } = await supabaseAdmin.from(table).select("created_at").gte("created_at", sinceIso);
      const map = new Map<string, number>();
      (data ?? []).forEach((r) => {
        const k = (r as { created_at: string }).created_at.slice(0, 10);
        map.set(k, (map.get(k) ?? 0) + 1);
      });
      return map;
    }
    const [tMap, nMap, fMap] = await Promise.all([perDay("todos"), perDay("notes"), perDay("feed_items")]);
    const activity = days.map((d) => ({
      date: d.date.slice(5),
      todos: tMap.get(d.date) ?? 0,
      notes: nMap.get(d.date) ?? 0,
      feeds: fMap.get(d.date) ?? 0,
    }));

    // ---- Cron job runs (last 20) ----
    type CronRun = {
      jobid: number; runid: number; job_pid: number | null;
      status: string; return_message: string | null;
      start_time: string; end_time: string | null;
    };
    let cronRuns: (CronRun & { jobname: string })[] = [];
    try {
      const { data } = await supabaseAdmin.rpc("get_cron_recent_runs" as never);
      cronRuns = (data ?? []) as never;
    } catch {
      // RPC may not exist — best-effort
    }

    // ---- Top RSS sources by feed_items count ----
    const { data: sources } = await supabaseAdmin
      .from("rss_sources").select("id, name, url, source_type, last_fetched_at, enabled");

    // ---- Recent feed_items (last 10) ----
    const { data: recentFeeds } = await supabaseAdmin
      .from("feed_items").select("id, title, source, severity, published_at")
      .order("published_at", { ascending: false }).limit(10);

    // ---- Severity breakdown ----
    const sevCounts: Record<string, number> = {};
    const { data: allFeeds } = await supabaseAdmin.from("feed_items").select("severity");
    (allFeeds ?? []).forEach((f) => {
      const s = (f as { severity: string }).severity;
      sevCounts[s] = (sevCounts[s] ?? 0) + 1;
    });

    return {
      totals,
      usersCount: users.length,
      signupsPerDay: days.map((d) => ({ date: d.date.slice(5), signups: d.signups })),
      activity,
      cronRuns,
      sources: sources ?? [],
      recentFeeds: recentFeeds ?? [],
      severityBreakdown: Object.entries(sevCounts).map(([severity, count]) => ({ severity, count })),
    };
  });
