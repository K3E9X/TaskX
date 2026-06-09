import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  prompt: z.string().min(1).max(4000),
  language: z.string().min(1).max(40).default("bash"),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20_000) }))
    .max(20)
    .optional()
    .default([]),
});

function extractCommand(text: string, language: string): string | null {
  const fenceRe = new RegExp("```(?:" + language + "|bash|sh|powershell|ps1|python|py|sql|yaml|json)?\\s*\\n([\\s\\S]*?)```", "i");
  const m = text.match(fenceRe);
  if (m) return m[1].trim();
  const any = text.match(/```\s*\n?([\s\S]*?)```/);
  if (any) return any[1].trim();
  return null;
}

export const generateSnippet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const system = `You are a cybersecurity command-line expert assistant.
Help the user craft reusable ${data.language} commands / snippets (pentest, recon, forensic, sysadmin, etc.).
Rules:
- Always return the runnable command/snippet in a single fenced code block tagged \`${data.language}\`.
- Keep it concise and ready to copy-paste; use placeholders like TARGET, FILE, PORT in UPPERCASE.
- A short explanation (1-3 lines) BEFORE the code block is welcome.
- No disclaimers, no "as an AI" preamble.`;

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
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("AI rate limit, retry shortly");
      if (res.status === 402) throw new Error("AI credits exhausted");
      throw new Error(`AI error ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    const code = extractCommand(content, data.language);
    return { content, code };
  });
