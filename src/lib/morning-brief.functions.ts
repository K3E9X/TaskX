import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateMorningBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lang?: "fr" | "en" }) =>
    z.object({ lang: z.enum(["fr", "en"]).default("en") }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const today = new Date();
    const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today); endOfDay.setHours(23, 59, 59, 999);
    const dayAgo = new Date(today.getTime() - 24 * 3600 * 1000);

    const [todosRes, meetingsRes, feedsRes, profileRes, streakRes, lastNote] = await Promise.all([
      supabase.from("todos").select("id,title,priority,due_at,status")
        .neq("status", "done").lte("due_at", endOfDay.toISOString())
        .order("due_at", { ascending: true }).limit(15),
      supabase.from("meetings").select("id,title,meeting_date")
        .gte("meeting_date", startOfDay.toISOString())
        .lte("meeting_date", endOfDay.toISOString())
        .order("meeting_date", { ascending: true }),
      supabase.from("feed_items").select("id,title,severity,source,url")
        .eq("read", false).in("severity", ["high", "critical"])
        .gte("published_at", dayAgo.toISOString())
        .order("published_at", { ascending: false }).limit(5),
      supabase.from("profiles").select("first_name,display_name,profile_type").eq("id", userId).maybeSingle(),
      supabase.rpc("get_current_streak"),
      supabase.from("notes").select("id,title,updated_at").order("updated_at", { ascending: false }).limit(1),
    ]);

    const todos = todosRes.data ?? [];
    const meetings = meetingsRes.data ?? [];
    const feeds = feedsRes.data ?? [];
    const profile = profileRes.data;
    const streak = (streakRes.data as number | null) ?? 0;
    const lastEdited = lastNote.data?.[0] ?? null;

    const stats = {
      todos: todos.length,
      meetings: meetings.length,
      criticalCves: feeds.length,
      streak,
    };

    // Build AI prompt
    const firstName = profile?.first_name || profile?.display_name || "";
    const role = profile?.profile_type ?? "architect";
    const lang = data.lang;

    const factSheet = JSON.stringify({
      role, streak,
      todos: todos.slice(0, 8).map((t) => ({ title: t.title, priority: t.priority, due: t.due_at })),
      meetings: meetings.map((m) => ({ title: m.title, at: m.meeting_date })),
      critical_feeds: feeds.map((f) => ({ title: f.title, severity: f.severity, source: f.source })),
    });

    const systemPrompt = lang === "fr"
      ? "Tu es l'assistant quotidien d'un professionnel cybersécurité. Tu écris un briefing matinal en français, ton direct, concret, sans flatterie. 3 à 5 puces maximum, chacune commence par un verbe d'action. Pas d'intro ni de conclusion. Pas d'emojis."
      : "You are the daily assistant of a cybersecurity professional. Write a morning brief in English, direct and concrete, no flattery. 3 to 5 bullets max, each starts with an action verb. No intro, no outro. No emojis.";

    const userPrompt = lang === "fr"
      ? `Prénom: ${firstName || "—"}. Métier: ${role}. Voici les données du jour (JSON):\n${factSheet}\n\nProduis 3-5 puces pour orienter sa journée. Si rien n'est urgent, dis-le honnêtement.`
      : `Name: ${firstName || "—"}. Role: ${role}. Today's data (JSON):\n${factSheet}\n\nProduce 3-5 bullets to guide the day. If nothing is urgent, say so honestly.`;

    let summary = "";
    try {
      const { chatCompletion } = await import("./ai-provider.server");
      summary = (
        await chatCompletion({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          fallbackModel: "google/gemini-2.5-flash",
        })
      ).trim();
    } catch (e) {
      console.error("Morning brief AI failed", e);
    }

    if (!summary) {
      // Fallback deterministic brief
      const parts: string[] = [];
      if (todos.length) parts.push(lang === "fr"
        ? `- Traiter ${todos.length} todo(s) en cours, dont ${todos.filter((t) => t.priority === "high" || t.priority === "urgent").length} prioritaire(s).`
        : `- Tackle ${todos.length} open todo(s), incl. ${todos.filter((t) => t.priority === "high" || t.priority === "urgent").length} high priority.`);
      if (meetings.length) parts.push(lang === "fr"
        ? `- Préparer ${meetings.length} meeting(s) aujourd'hui.`
        : `- Prep for ${meetings.length} meeting(s) today.`);
      if (feeds.length) parts.push(lang === "fr"
        ? `- Lire ${feeds.length} alerte(s) CVE/CTI critiques des dernières 24h.`
        : `- Review ${feeds.length} critical CVE/CTI alert(s) from the last 24h.`);
      if (!parts.length) parts.push(lang === "fr"
        ? "- Rien d'urgent. Bonne fenêtre pour avancer sur le fond."
        : "- Nothing urgent. Good window for deep work.");
      summary = parts.join("\n");
    }

    return {
      summary,
      stats,
      lastEdited: lastEdited ? { id: lastEdited.id, title: lastEdited.title, kind: "note" as const } : null,
    };
  });
