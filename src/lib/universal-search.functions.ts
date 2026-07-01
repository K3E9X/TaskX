import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SearchHit = {
  id: string;
  kind: "note" | "todo" | "diagram" | "feed" | "snippet";
  title: string;
  subtitle?: string;
};

export const universalSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { q: string }) =>
    z.object({ q: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ hits: SearchHit[] }> => {
    const { supabase } = context;
    const like = `%${data.q.replace(/[%_]/g, "")}%`;

    const [notes, todos, diagrams, feeds, snippets] = await Promise.all([
      supabase.from("notes").select("id,title,content,kind,link_url").ilike("title", like).limit(5),
      supabase.from("todos").select("id,title,status").ilike("title", like).limit(5),
      supabase.from("diagrams").select("id,title,description").ilike("title", like).limit(5),
      supabase.from("feed_items").select("id,title,source").ilike("title", like).limit(5),
      supabase.from("snippets").select("id,title,language").ilike("title", like).limit(5),
    ]);

    const hits: SearchHit[] = [
      ...(notes.data ?? []).map((x) => ({ id: x.id, kind: "note" as const, title: x.title, subtitle: x.kind === "link" ? (x.link_url ?? undefined) : undefined })),
      ...(todos.data ?? []).map((x) => ({ id: x.id, kind: "todo" as const, title: x.title, subtitle: x.status })),
      ...(diagrams.data ?? []).map((x) => ({ id: x.id, kind: "diagram" as const, title: x.title, subtitle: x.description ?? undefined })),
      ...(feeds.data ?? []).map((x) => ({ id: x.id, kind: "feed" as const, title: x.title, subtitle: x.source })),
      ...(snippets.data ?? []).map((x) => ({ id: x.id, kind: "snippet" as const, title: x.title, subtitle: x.language })),
    ];

    return { hits };
  });
