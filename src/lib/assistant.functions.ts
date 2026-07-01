import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  prompt: z.string().min(1).max(4000),
  context: z.string().max(200).optional().default(""),
  lang: z.enum(["fr", "en"]).optional().default("en"),
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
    const { chatCompletion } = await import("./ai-provider.server");

    const langLabel = data.lang === "fr" ? "French" : "English";
    const system = `You are TaskX Assistant, a concise cybersecurity co-pilot for a solo practitioner
(pentester, SOC analyst, CISO, security architect or forensic analyst).
Context page: ${data.context || "unknown"}.
Rules:
- ALWAYS reply in ${langLabel}, regardless of the language of the user's question. Never switch language.
- Be direct, short, technical. No fluff, no "as an AI".
- Prefer markdown lists and fenced code blocks for commands/config.
- If asked to run/change something in the app, explain how to do it in the current TaskX module (todos, notes, snippets, diagrams, feeds, meetings, projects).
- If the question is out-of-scope for cyber/productivity, answer briefly and suggest to refocus.`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: system },
    ];
    for (const h of data.history) messages.push({ role: h.role, content: h.content });
    messages.push({ role: "user", content: data.prompt });

    const content = await chatCompletion({ messages, fallbackModel: "google/gemini-3-flash-preview" });
    return { content };
  });
