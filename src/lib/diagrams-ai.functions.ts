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
    const { chatCompletion } = await import("./ai-provider.server");

    const system = `You are a Mermaid.js diagram-as-code expert helping a cybersecurity professional.
Generate valid Mermaid syntax for the requested diagram (type: ${data.diagramType}).
Rules:
- Always return the FULL diagram code in a single \`\`\`mermaid fenced block.
- Use clear, concise node labels.
- No prose outside the code block unless the user asked a question.
- Prefer the requested diagram type but adapt if the user asks otherwise.`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: system },
    ];
    if (data.currentSource.trim()) {
      messages.push({
        role: "user",
        content: `Current diagram code:\n\`\`\`mermaid\n${data.currentSource}\n\`\`\``,
      });
      messages.push({ role: "assistant", content: "Got it. What change would you like?" });
    }
    for (const h of data.history) messages.push({ role: h.role, content: h.content });
    messages.push({ role: "user", content: data.prompt });

    const content = await chatCompletion({ messages, fallbackModel: "google/gemini-3-flash-preview" });
    const code = extractMermaid(content);
    return { content, code };
  });
