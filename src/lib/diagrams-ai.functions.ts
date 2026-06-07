import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  prompt: z.string().min(1).max(4000),
  diagramType: z.enum(["flowchart", "sequence", "erd", "architecture", "state", "other"]),
  currentSource: z.string().max(20_000).optional().default(""),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20_000) }))
    .max(20)
    .optional()
    .default([]),
});

function extractMermaid(text: string): string | null {
  const fence = text.match(/```(?:mermaid)?\s*\n([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  // Heuristic: starts with a known mermaid keyword
  const t = text.trim();
  if (/^(graph|flowchart|sequenceDiagram|erDiagram|stateDiagram|classDiagram|gantt|pie|journey)\b/i.test(t)) {
    return t;
  }
  return null;
}

export const generateMermaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const system = `You are a Mermaid.js diagram-as-code expert helping a cybersecurity professional.
Generate valid Mermaid syntax for the requested diagram (type: ${data.diagramType}).
Rules:
- Always return the FULL diagram code in a single \`\`\`mermaid fenced block.
- Use clear, concise node labels.
- No prose outside the code block unless the user asked a question.
- Prefer the requested diagram type but adapt if the user asks otherwise.`;

    const messages: Array<{ role: string; content: string }> = [{ role: "system", content: system }];
    if (data.currentSource.trim()) {
      messages.push({
        role: "user",
        content: `Current diagram code:\n\`\`\`mermaid\n${data.currentSource}\n\`\`\``,
      });
      messages.push({ role: "assistant", content: "Got it. What change would you like?" });
    }
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
    const code = extractMermaid(content);
    return { content, code };
  });
