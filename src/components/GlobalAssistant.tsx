import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { Sparkles, Send, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askAssistant } from "@/lib/assistant.functions";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

export function GlobalAssistant() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const ask = useServerFn(askAssistant);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { lang } = useI18n();
  const bottomRef = useRef<HTMLDivElement>(null);
  const isFr = lang === "fr";
  const T = {
    hint: isFr ? "Pose une question cyber ou demande de l'aide sur cette page." : "Ask a cyber question or get help on this page.",
    thinking: isFr ? "Réflexion…" : "Thinking…",
    placeholder: isFr ? "Demande quelque chose…" : "Ask something…",
    aiError: isFr ? "Erreur IA" : "AI error",
    suggestions: isFr
      ? ["Explique CVSS 4.0", "Payload XSS bypass CSP", "Différence EDR/XDR"]
      : ["Explain CVSS 4.0", "XSS payload bypassing CSP", "EDR vs XDR"],
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  const send = async () => {
    const p = prompt.trim();
    if (!p || loading) return;
    setPrompt("");
    const next: Msg[] = [...messages, { role: "user", content: p }];
    setMessages(next);
    setLoading(true);
    try {
      const history = next.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const res = await ask({ data: { prompt: p, context: path, history } });
      setMessages((m) => [...m, { role: "assistant", content: res.content }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "AI error";
      toast.error(msg);
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Ask AI"
        className="fixed bottom-4 right-4 z-40 h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition flex items-center justify-center"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-40 w-[92vw] max-w-md h-[70vh] max-h-[560px] rounded-lg border bg-background shadow-2xl flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" /> TaskX Assistant
            </div>
            <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]">{path}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
            {messages.length === 0 && (
              <div className="text-xs text-muted-foreground space-y-2">
                <p>Pose une question cyber ou demande de l'aide sur cette page.</p>
                <div className="flex flex-wrap gap-1">
                  {["Explique CVSS 4.0", "Payload XSS bypass CSP", "Différence EDR/XDR"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setPrompt(s)}
                      className="text-[10px] rounded border px-2 py-0.5 hover:bg-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <div
                  className={
                    m.role === "user"
                      ? "rounded-md bg-primary text-primary-foreground px-3 py-2 max-w-[85%]"
                      : "prose prose-sm dark:prose-invert max-w-none [&_pre]:text-xs [&_pre]:my-2"
                  }
                >
                  {m.role === "assistant" ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Réflexion…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t p-2 flex items-end gap-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Demande quelque chose…"
              className="min-h-[40px] max-h-32 text-sm resize-none"
            />
            <Button size="icon" onClick={send} disabled={loading || !prompt.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
