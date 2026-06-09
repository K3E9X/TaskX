import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Sparkles, Send, Loader2, Check } from "lucide-react";
import mermaid from "mermaid";
import { generateMermaid } from "@/lib/diagrams-ai.functions";

export const Route = createFileRoute("/_authenticated/diagrams")({
  head: () => ({
    meta: [
      { title: "Diagrams — TaskX" },
      { name: "description", content: "Architecture diagrams in TaskX: design, version and share your security and infrastructure schemas with your team." },
      { property: "og:title", content: "Diagrams — TaskX" },
      { property: "og:description", content: "Architecture diagrams in TaskX: design, version and share your security and infrastructure schemas with your team." },
      { property: "og:url", content: "https://taskxx.lovable.app/diagrams" },
    ],
    links: [{ rel: "canonical", href: "https://taskxx.lovable.app/diagrams" }],
  }),
  component: DiagramsPage,
});

type DType = "flowchart" | "sequence" | "erd" | "architecture" | "state" | "other";
type Diagram = {
  id: string; title: string; diagram_type: DType; source: string;
  description: string | null; updated_at: string;
};

const TEMPLATES: Record<DType, string> = {
  flowchart: "graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Action]\n  B -->|No| D[End]",
  sequence: "sequenceDiagram\n  participant U as User\n  participant S as Server\n  U->>S: Request\n  S-->>U: Response",
  erd: "erDiagram\n  USER ||--o{ POST : creates\n  USER {\n    uuid id\n    string email\n  }\n  POST {\n    uuid id\n    string title\n  }",
  architecture: "graph LR\n  Client --> API\n  API --> DB[(Database)]\n  API --> Cache[(Redis)]",
  state: "stateDiagram-v2\n  [*] --> Idle\n  Idle --> Active : start\n  Active --> Idle : stop\n  Active --> [*]",
  other: "graph TD\n  A --> B",
};

mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict" });

function DiagramsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const { data: diagrams = [], isLoading } = useQuery({
    queryKey: ["diagrams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagrams").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Diagram[];
    },
  });

  useEffect(() => {
    if (!selected && diagrams.length > 0) setSelected(diagrams[0].id);
  }, [diagrams, selected]);

  const create = useMutation({
    mutationFn: async (p: { title: string; diagram_type: DType }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase.from("diagrams").insert({
        user_id: user.id,
        title: p.title,
        diagram_type: p.diagram_type,
        source: TEMPLATES[p.diagram_type],
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["diagrams"] }); setShowNew(false); setSelected(d.id); },
    onError: (e) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Diagram> }) => {
      const { error } = await supabase.from("diagrams").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["diagrams"] }),
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("diagrams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["diagrams"] }); setSelected(null); },
  });

  const current = diagrams.find((d) => d.id === selected);

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("diagrams.title")}</h1>
        <Button size="sm" onClick={() => setShowNew(!showNew)}>
          <Plus className="h-4 w-4" /> {t("diagrams.new")}
        </Button>
      </div>

      {showNew && <NewDiagramForm onCreate={(p) => create.mutate(p)} pending={create.isPending} />}

      <div className="mt-6 grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="space-y-1">
          {isLoading && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}
          {!isLoading && diagrams.length === 0 && (
            <div className="text-sm text-muted-foreground p-2">{t("common.empty")}</div>
          )}
          {diagrams.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelected(d.id)}
              className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                selected === d.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/40 text-muted-foreground"
              }`}
            >
              <div className="truncate font-medium">{d.title}</div>
              <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                {t(`diagrams.type.${d.diagram_type}` as TKey)}
              </div>
            </button>
          ))}
        </div>

        {current && (
          <DiagramEditor
            key={current.id}
            diagram={current}
            onUpdate={(patch) => update.mutate({ id: current.id, patch })}
            onDelete={() => remove.mutate(current.id)}
          />
        )}
      </div>
    </div>
  );
}

function DiagramEditor({ diagram, onUpdate, onDelete }: {
  diagram: Diagram;
  onUpdate: (patch: Partial<Diagram>) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState(diagram.title);
  const [source, setSource] = useState(diagram.source);
  const [type, setType] = useState<DType>(diagram.diagram_type);
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="p-3 border-b flex items-center gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== diagram.title && onUpdate({ title })}
          className="h-8 text-sm flex-1"
        />
        <Select value={type} onValueChange={(v) => { setType(v as DType); onUpdate({ diagram_type: v as DType }); }}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["flowchart", "sequence", "erd", "architecture", "state", "other"] as DType[]).map((d) => (
              <SelectItem key={d} value={d} className="text-xs">{t(`diagrams.type.${d}` as TKey)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant={aiOpen ? "default" : "outline"}
          onClick={() => setAiOpen((v) => !v)}
          className="h-8 gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" /> {t("diagrams.ai.toggle")}
        </Button>
        <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className={`grid divide-x divide-border ${aiOpen ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        <div className="p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{t("diagrams.source")}</div>
          <Textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onBlur={() => source !== diagram.source && onUpdate({ source })}
            rows={18}
            className="font-mono text-xs"
          />
        </div>
        <div className="p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{t("diagrams.preview")}</div>
          <MermaidPreview source={source} />
        </div>
        {aiOpen && (
          <AiChatPanel
            diagramType={type}
            currentSource={source}
            onApply={(code) => {
              setSource(code);
              onUpdate({ source: code });
            }}
          />
        )}
      </div>
    </div>
  );
}

type ChatMsg = { role: "user" | "assistant"; content: string; code?: string };

function AiChatPanel({ diagramType, currentSource, onApply }: {
  diagramType: DType;
  currentSource: string;
  onApply: (code: string) => void;
}) {
  const { t } = useI18n();
  const generate = useServerFn(generateMermaid);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  const send = async () => {
    const p = prompt.trim();
    if (!p || busy) return;
    setPrompt("");
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: p }]);
    setBusy(true);
    try {
      const res = await generate({
        data: { prompt: p, diagramType, currentSource, history },
      });
      setMessages((m) => [...m, { role: "assistant", content: res.content, code: res.code ?? undefined }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI error");
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ " + (e instanceof Error ? e.message : "error") }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-[560px]">
      <div className="px-3 py-2 border-b flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <div className="text-xs font-medium">{t("diagrams.ai.title")}</div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-xs text-muted-foreground">
            {t("diagrams.ai.hint")}
            <ul className="mt-2 space-y-1 list-disc list-inside opacity-80">
              <li>{t("diagrams.ai.ex1")}</li>
              <li>{t("diagrams.ai.ex2")}</li>
              <li>{t("diagrams.ai.ex3")}</li>
            </ul>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`text-xs ${m.role === "user" ? "text-foreground" : "text-muted-foreground"}`}>
            <div className="text-[10px] uppercase tracking-wider mb-1 opacity-60">
              {m.role === "user" ? t("diagrams.ai.you") : t("diagrams.ai.assistant")}
            </div>
            {m.code ? (
              <div className="space-y-2">
                {m.content
                  .replace(/```(?:mermaid)?[\s\S]*?```/g, "")
                  .trim() && (
                  <div className="whitespace-pre-wrap">
                    {m.content.replace(/```(?:mermaid)?[\s\S]*?```/g, "").trim()}
                  </div>
                )}
                <pre className="rounded-md bg-muted/50 border p-2 overflow-x-auto text-[10px] font-mono max-h-40">
                  {m.code}
                </pre>
                <Button size="sm" variant="secondary" onClick={() => onApply(m.code!)} className="h-7 gap-1.5">
                  <Check className="h-3 w-3" /> {t("diagrams.ai.apply")}
                </Button>
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{m.content}</div>
            )}
          </div>
        ))}
        {busy && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> {t("diagrams.ai.thinking")}
          </div>
        )}
      </div>
      <div className="border-t p-2 flex gap-2">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={t("diagrams.ai.placeholder")}
          rows={2}
          className="text-xs resize-none"
          disabled={busy}
        />
        <Button size="sm" onClick={send} disabled={busy || !prompt.trim()} className="self-end">
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function MermaidPreview({ source }: { source: string }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let cancelled = false;
    const id = `mmd-${Math.random().toString(36).slice(2)}`;
    mermaid.render(id, source).then(({ svg }) => {
      if (cancelled || !ref.current) return;
      ref.current.innerHTML = svg;
      setError(null);
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }).catch((e) => {
      if (cancelled) return;
      setError(String(e.message ?? e));
    });
    return () => { cancelled = true; };
  }, [source]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((s) => Math.min(Math.max(s + delta, 0.1), 5));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const handleMouseUp = () => setIsPanning(false);

  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
        <div className="font-medium mb-1">{t("diagrams.renderError")}</div>
        <pre className="whitespace-pre-wrap text-[10px] opacity-80">{error}</pre>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden h-[560px] rounded-md border bg-background/50 cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="absolute top-2 right-2 flex gap-1 z-10">
        <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => setScale((s) => Math.min(s + 0.2, 5))}>
          <span className="text-xs">+</span>
        </Button>
        <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => setScale((s) => Math.max(s - 0.2, 0.1))}>
          <span className="text-xs">−</span>
        </Button>
        <Button size="icon" variant="secondary" className="h-7 w-7" onClick={resetView} title="Reset">
          <span className="text-xs">⟲</span>
        </Button>
      </div>
      <div
        ref={ref}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: isPanning ? "none" : "transform 0.1s ease-out",
        }}
        className="w-full h-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:h-auto"
      />
    </div>
  );
}

function NewDiagramForm({ onCreate, pending }: {
  onCreate: (p: { title: string; diagram_type: DType }) => void;
  pending: boolean;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DType>("flowchart");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onCreate({ title: title.trim(), diagram_type: type });
        setTitle(""); setType("flowchart");
      }}
      className="rounded-lg border bg-card p-4 flex gap-2"
    >
      <Input placeholder={t("diagrams.titlePh")} value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1" />
      <Select value={type} onValueChange={(v) => setType(v as DType)}>
        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          {(["flowchart", "sequence", "erd", "architecture", "state", "other"] as DType[]).map((d) => (
            <SelectItem key={d} value={d}>{t(`diagrams.type.${d}` as TKey)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" disabled={pending}>{t("common.save")}</Button>
    </form>
  );
}
