import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkCronHookAuth } from "@/lib/cron-hook-auth";

type GeneratedTip = {
  title: string;
  command: string;
  explanation: string;
  category: string;
  tags: string[];
};

async function generateTip(): Promise<GeneratedTip> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const month = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const prompt = `Propose un tip Linux original, utile et peu connu pour ${month}.
Privilégie des commandes pratiques liées à la cybersécurité, l'administration système, le networking ou le debugging.
Évite les classiques (ls, grep, find basiques). Choisis quelque chose comme: ss, lsof avancé, journalctl filters, nftables, auditctl, eBPF tools, namespaces, etc.
Réponds via l'appel d'outil save_tip.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "Tu es un expert Linux et cybersécurité. Tu réponds toujours en français." },
        { role: "user", content: prompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "save_tip",
            description: "Sauvegarde un tip Linux",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Titre court et explicite" },
                command: { type: "string", description: "Commande shell complète, prête à copier" },
                explanation: { type: "string", description: "Explication claire en 2-4 phrases" },
                category: { type: "string", description: "Catégorie: security | network | system | debug | files" },
                tags: { type: "array", items: { type: "string" } },
              },
              required: ["title", "command", "explanation", "category", "tags"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "save_tip" } },
    }),
  });

  if (!res.ok) throw new Error(`AI gateway error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("No tool call in AI response");
  return JSON.parse(call.function.arguments) as GeneratedTip;
}

export const Route = createFileRoute("/api/public/hooks/monthly-tip")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await checkCronHookAuth(request);
        if (denied) return denied;

        // 1. Generate one tip
        let tip: GeneratedTip;
        try {
          tip = await generateTip();
        } catch (e) {
          return new Response(
            JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        // 2. Insert for every user with auto_tip_enabled
        const { data: users, error: usersErr } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("auto_tip_enabled", true);
        if (usersErr) {
          return new Response(JSON.stringify({ error: usersErr.message }), { status: 500 });
        }

        const rows = (users ?? []).map((u) => ({
          user_id: u.id,
          title: tip.title,
          command: tip.command,
          explanation: tip.explanation,
          category: tip.category,
          tags: [...tip.tags, "auto", "monthly"],
        }));

        let inserted = 0;
        if (rows.length > 0) {
          const { error: insErr } = await supabaseAdmin.from("tips").insert(rows);
          if (insErr) {
            return new Response(JSON.stringify({ error: insErr.message }), { status: 500 });
          }
          inserted = rows.length;
        }

        return new Response(
          JSON.stringify({ ok: true, users: rows.length, inserted }),
          { headers: { "Content-Type": "application/json" } }
        );
      },
    },
  },
});
