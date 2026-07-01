import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  prompt: z.string().min(1).max(4000),
  context: z.string().max(200).optional().default(""),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20_000) }))
    .max(20)
    .optional()
    .default([]),
});

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const system = `You are TaskX Assistant, a concise cybersecurity co-pilot for a solo practitioner
(pentester, SOC analyst, CISO, security architect or forensic analyst).
Context page: ${data.context || "unknown"}.
Rules:
- Be direct, short, technical. No fluff, no "as an AI".
- Prefer markdown lists and fenced code blocks for commands/config.
- If asked to run/change something in the app, explain how to do it in the current TaskX module (todos, notes, snippets, diagrams, feeds, meetings, projects).
- If the question is out-of-scope for cyber/productivity, answer briefly and suggest to refocus.`;

    const messages: Array<{ role: string; content: string }> = [{ role: "system", content: system }];
    for (const h of data.history) messages.push({ role: h.role, content: h.content });
    messages.push({ role: "user", content: data.prompt });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("AI rate limit, retry shortly");
      if (res.status === 402) throw new Error("AI credits exhausted");
      throw new Error(`AI error ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return { content: json.choices?.[0]?.message?.content ?? "" };
  });
