import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkCronHookAuth } from "@/lib/cron-hook-auth";

type GeneratedSnippet = {
  title: string;
  command: string;
  description: string;
  language: string;
  tags: string[];
};

async function generateSnippet(): Promise<GeneratedSnippet> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const month = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const prompt = `Propose un snippet shell original, utile et peu connu pour ${month}.
Privilégie des one-liners pratiques liés à la cybersécurité, l'administration système, le networking ou le debugging.
Évite les classiques (ls, grep, find basiques). Choisis quelque chose comme: ss, lsof avancé, journalctl filters, nftables, auditctl, eBPF tools, namespaces, etc.
Réponds via l'appel d'outil save_snippet.`;

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
            name: "save_snippet",
            description: "Sauvegarde un snippet shell",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Titre court et explicite" },
                command: { type: "string", description: "Commande shell complète, prête à copier" },
                description: { type: "string", description: "Explication claire en 2-4 phrases" },
                language: { type: "string", description: "bash | powershell | python" },
                tags: { type: "array", items: { type: "string" } },
              },
              required: ["title", "command", "description", "language", "tags"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "save_snippet" } },
    }),
  });

  if (!res.ok) throw new Error(`AI gateway error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("No tool call in AI response");
  return JSON.parse(call.function.arguments) as GeneratedSnippet;
}

export const Route = createFileRoute("/api/public/hooks/monthly-tip")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await checkCronHookAuth(request);
        if (denied) return denied;

        let snippet: GeneratedSnippet;
        try {
          snippet = await generateSnippet();
        } catch (e) {
          return new Response(
            JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        // Insert one snippet for every user
        const { data: users, error: usersErr } = await supabaseAdmin
          .from("profiles")
          .select("id");
        if (usersErr) {
          return new Response(JSON.stringify({ error: usersErr.message }), { status: 500 });
        }

        const rows = (users ?? []).map((u) => ({
          user_id: u.id,
          title: snippet.title,
          command: snippet.command,
          description: snippet.description,
          language: snippet.language || "bash",
          tags: [...snippet.tags, "auto", "monthly"],
        }));

        let inserted = 0;
        if (rows.length > 0) {
          const { error: insErr } = await supabaseAdmin.from("snippets").insert(rows);
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
