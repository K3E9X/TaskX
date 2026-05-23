import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Kind = z.enum(["todo_done", "note_edited", "feed_read"]);

export const bumpActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: z.infer<typeof Kind> }) =>
    z.object({ kind: Kind }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);

    // Upsert via select + insert/update to keep RLS simple
    const { data: existing } = await supabase
      .from("daily_activity")
      .select("id,todos_done,notes_edited,feed_read")
      .eq("user_id", userId).eq("day", today).maybeSingle();

    const inc = {
      todos_done: data.kind === "todo_done" ? 1 : 0,
      notes_edited: data.kind === "note_edited" ? 1 : 0,
      feed_read: data.kind === "feed_read" ? 1 : 0,
    };

    if (!existing) {
      await supabase.from("daily_activity").insert({
        user_id: userId, day: today, ...inc,
      });
    } else {
      await supabase.from("daily_activity").update({
        todos_done: existing.todos_done + inc.todos_done,
        notes_edited: existing.notes_edited + inc.notes_edited,
        feed_read: existing.feed_read + inc.feed_read,
      }).eq("id", existing.id);
    }
    return { ok: true };
  });

export const getStreakAndActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10);

    const [streakRes, daysRes] = await Promise.all([
      supabase.rpc("get_current_streak"),
      supabase.from("daily_activity").select("day,todos_done,notes_edited,feed_read")
        .eq("user_id", userId).gte("day", since).order("day", { ascending: true }),
    ]);

    return {
      streak: (streakRes.data as number | null) ?? 0,
      days: daysRes.data ?? [],
    };
  });
