import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import mermaid from "mermaid";

export const Route = createFileRoute("/_authenticated/diagrams")({
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

mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" });

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
            onDelete={() => confirm(t("diagrams.deleteConfirm")) && remove.mutate(current.id)}
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
        <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid md:grid-cols-2 divide-x divide-border">
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
      </div>
    </div>
  );
}

function MermaidPreview({ source }: { source: string }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = `mmd-${Math.random().toString(36).slice(2)}`;
    mermaid.render(id, source).then(({ svg }) => {
      if (cancelled || !ref.current) return;
      ref.current.innerHTML = svg;
      setError(null);
    }).catch((e) => {
      if (cancelled) return;
      setError(String(e.message ?? e));
    });
    return () => { cancelled = true; };
  }, [source]);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
        <div className="font-medium mb-1">{t("diagrams.renderError")}</div>
        <pre className="whitespace-pre-wrap text-[10px] opacity-80">{error}</pre>
      </div>
    );
  }

  return <div ref={ref} className="overflow-auto [&_svg]:max-w-full [&_svg]:h-auto" />;
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
