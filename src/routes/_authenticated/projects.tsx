import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { title: "Projects — TaskX" },
      { name: "description", content: "Track your cybersecurity projects in TaskX: status, risk level, milestones and notes for every initiative across your team." },
      { property: "og:title", content: "Projects — TaskX" },
      { property: "og:description", content: "Track cybersecurity projects with status, risk level and milestones in TaskX." },
      { property: "og:url", content: "https://taskxx.lovable.app/projects" },
    ],
    links: [{ rel: "canonical", href: "https://taskxx.lovable.app/projects" }],
  }),
  component: ProjectsPage,
});

type Status = "draft" | "active" | "on_hold" | "done";
type Risk = "low" | "medium" | "high" | "critical";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: Status;
  risk_level: Risk;
  data_classification: string | null;
  compliance: string[];
  security_controls: string | null;
  threat_model: string | null;
  updated_at: string;
};

const RISK_VARIANT: Record<Risk, "default" | "secondary" | "destructive" | "outline"> = {
  critical: "destructive", high: "destructive", medium: "default", low: "secondary",
};
const STATUS_VARIANT: Record<Status, "default" | "secondary" | "outline"> = {
  active: "default", draft: "outline", on_hold: "secondary", done: "secondary",
};

function ProjectsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });

  const create = useMutation({
    mutationFn: async (p: Partial<Project>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("projects").insert({
        user_id: user.id,
        name: p.name!,
        description: p.description || null,
        status: p.status || "draft",
        risk_level: p.risk_level || "medium",
        data_classification: p.data_classification || null,
        compliance: p.compliance || [],
        security_controls: p.security_controls || null,
        threat_model: p.threat_model || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); setShowNew(false); },
    onError: (e) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Project> }) => {
      const { error } = await supabase.from("projects").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("projects.title")}</h1>
        <Button size="sm" onClick={() => setShowNew(!showNew)}>
          <Plus className="h-4 w-4" /> {t("projects.new")}
        </Button>
      </div>

      {showNew && <NewProjectForm onCreate={(p) => create.mutate(p)} pending={create.isPending} />}

      <div className="mt-6 space-y-2">
        {isLoading && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}
        {!isLoading && projects.length === 0 && (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            {t("common.empty")}
          </div>
        )}
        {projects.map((p) => {
          const isOpen = expanded === p.id;
          return (
            <div key={p.id} className="rounded-lg border bg-card overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-accent/40 transition-colors"
                onClick={() => setExpanded(isOpen ? null : p.id)}
              >
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    {p.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</div>
                    )}
                  </div>
                  <Badge variant={STATUS_VARIANT[p.status]} className="h-5 px-1.5 text-[10px]">
                    {t(`projects.status.${p.status}` as TKey)}
                  </Badge>
                  <Badge variant={RISK_VARIANT[p.risk_level]} className="h-5 px-1.5 text-[10px]">
                    {t(`projects.risk.${p.risk_level}` as TKey)}
                  </Badge>
                </div>
              </div>
              {isOpen && (
                <div className="border-t p-4 space-y-3 bg-muted/20">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("common.menu")}</label>
                      <Select value={p.status} onValueChange={(v) => update.mutate({ id: p.id, patch: { status: v as Status } })}>
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["draft", "active", "on_hold", "done"] as Status[]).map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">{t(`projects.status.${s}` as TKey)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Risk</label>
                      <Select value={p.risk_level} onValueChange={(v) => update.mutate({ id: p.id, patch: { risk_level: v as Risk } })}>
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["low", "medium", "high", "critical"] as Risk[]).map((r) => (
                            <SelectItem key={r} value={r} className="text-xs">{t(`projects.risk.${r}` as TKey)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Field label={t("projects.dataClass")} value={p.data_classification ?? ""} placeholder={t("projects.dataClassPh")}
                    onSave={(v) => update.mutate({ id: p.id, patch: { data_classification: v || null } })} />
                  <Field label={t("projects.compliance")} value={p.compliance.join(", ")} placeholder={t("projects.compliancePh")}
                    onSave={(v) => update.mutate({ id: p.id, patch: { compliance: v.split(",").map((s) => s.trim()).filter(Boolean) } })} />
                  <Area label={t("projects.controls")} value={p.security_controls ?? ""} placeholder={t("projects.controlsPh")}
                    onSave={(v) => update.mutate({ id: p.id, patch: { security_controls: v || null } })} />
                  <Area label={t("projects.threat")} value={p.threat_model ?? ""} placeholder={t("projects.threatPh")}
                    onSave={(v) => update.mutate({ id: p.id, patch: { threat_model: v || null } })} />
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-[10px] text-muted-foreground">{format(parseISO(p.updated_at), "dd MMM yyyy HH:mm")}</span>
                    <button
                      onClick={() => remove.mutate(p.id)}
                      className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {t("common.delete")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, value, placeholder, onSave }: {
  label: string; value: string; placeholder?: string; onSave: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <Input
        className="h-8 text-xs mt-1"
        value={v}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onSave(v)}
      />
    </div>
  );
}

function Area({ label, value, placeholder, onSave }: {
  label: string; value: string; placeholder?: string; onSave: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <Textarea
        className="text-xs mt-1"
        rows={3}
        value={v}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onSave(v)}
      />
    </div>
  );
}

function NewProjectForm({ onCreate, pending }: { onCreate: (p: Partial<Project>) => void; pending: boolean }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [risk, setRisk] = useState<Risk>("medium");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onCreate({ name: name.trim(), description, risk_level: risk });
        setName(""); setDescription(""); setRisk("medium");
      }}
      className="rounded-lg border bg-card p-4 space-y-3"
    >
      <Input placeholder={t("projects.namePh")} value={name} onChange={(e) => setName(e.target.value)} />
      <Textarea placeholder={t("projects.descPh")} value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      <div className="flex items-center gap-2">
        <Select value={risk} onValueChange={(v) => setRisk(v as Risk)}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["low", "medium", "high", "critical"] as Risk[]).map((r) => (
              <SelectItem key={r} value={r}>{t(`projects.risk.${r}` as TKey)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" disabled={pending}>{t("common.save")}</Button>
      </div>
    </form>
  );
}
