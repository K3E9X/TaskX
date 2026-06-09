import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/routines")({
  head: () => ({
    meta: [
      { title: "Routines — TaskX" },
      { name: "description", content: "Daily and weekly security routines in TaskX: build repeatable checklists and track step-by-step completion." },
      { property: "og:title", content: "Routines — TaskX" },
      { property: "og:description", content: "Daily and weekly security routines in TaskX: build repeatable checklists and track step-by-step completion." },
      { property: "og:url", content: "https://taskxx.lovable.app/routines" },
    ],
    links: [{ rel: "canonical", href: "https://taskxx.lovable.app/routines" }],
  }),
  component: RoutinesPage,
});

type Frequency = "daily" | "weekly";
type Routine = {
  id: string;
  name: string;
  description: string | null;
  steps: string[];
  frequency: Frequency;
};
type Run = { id: string; routine_id: string; run_date: string; completed_steps: number[] };

const TODAY = () => new Date().toISOString().slice(0, 10);

function RoutinesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);

  const { data: routines = [], isLoading } = useQuery({
    queryKey: ["routines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("routines").select("*").order("created_at");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        steps: Array.isArray(r.steps) ? (r.steps as string[]) : [],
      })) as Routine[];
    },
  });

  const { data: runs = [] } = useQuery({
    queryKey: ["routine_runs", TODAY()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routine_runs")
        .select("*")
        .eq("run_date", TODAY());
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        completed_steps: Array.isArray(r.completed_steps) ? (r.completed_steps as number[]) : [],
      })) as Run[];
    },
  });

  const create = useMutation({
    mutationFn: async (p: { name: string; description: string; steps: string[]; frequency: Frequency }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("routines").insert({
        user_id: user.id,
        name: p.name,
        description: p.description || null,
        steps: p.steps,
        frequency: p.frequency,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines"] });
      setShowNew(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("routines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routines"] }),
  });

  const toggleStep = useMutation({
    mutationFn: async ({ routine, stepIdx }: { routine: Routine; stepIdx: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const existing = runs.find((r) => r.routine_id === routine.id);
      const current = existing?.completed_steps ?? [];
      const next = current.includes(stepIdx)
        ? current.filter((i) => i !== stepIdx)
        : [...current, stepIdx];
      const { error } = await supabase
        .from("routine_runs")
        .upsert(
          {
            routine_id: routine.id,
            user_id: user.id,
            run_date: TODAY(),
            completed_steps: next,
          },
          { onConflict: "routine_id,run_date" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routine_runs", TODAY()] }),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("routines.title")}</h1>
        <Button size="sm" onClick={() => setShowNew(!showNew)}>
          <Plus className="h-4 w-4" /> {t("routines.new")}
        </Button>
      </div>

      {showNew && <NewRoutineForm onCreate={(p) => create.mutate(p)} pending={create.isPending} />}

      <div className="mt-6 space-y-3">
        {isLoading && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}
        {!isLoading && routines.length === 0 && (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            {t("common.empty")}
          </div>
        )}
        {routines.map((r) => {
          const run = runs.find((x) => x.routine_id === r.id);
          const done = run?.completed_steps.length ?? 0;
          const total = r.steps.length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          return (
            <div key={r.id} className="rounded-lg border bg-card overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{r.name}</div>
                    {r.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">{r.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t(`routines.freq.${r.frequency}` as TKey)}
                    </span>
                    <button
                      onClick={() => remove.mutate(r.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-accent rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">{done}/{total}</span>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  {t("routines.today")}
                </div>
                {r.steps.map((step, idx) => {
                  const checked = run?.completed_steps.includes(idx) ?? false;
                  return (
                    <label key={idx} className="flex items-start gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleStep.mutate({ routine: r, stepIdx: idx })}
                        className="mt-0.5"
                      />
                      <span className={checked ? "line-through text-muted-foreground" : ""}>{step}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewRoutineForm({
  onCreate,
  pending,
}: {
  onCreate: (p: { name: string; description: string; steps: string[]; frequency: Frequency }) => void;
  pending: boolean;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("daily");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const steps = stepsText.split("\n").map((s) => s.trim()).filter(Boolean);
        if (!name.trim() || steps.length === 0) return;
        onCreate({ name: name.trim(), description: description.trim(), steps, frequency });
        setName(""); setDescription(""); setStepsText(""); setFrequency("daily");
      }}
      className="rounded-lg border bg-card p-4 space-y-3"
    >
      <Input placeholder={t("routines.namePh")} value={name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder={t("routines.descPh")} value={description} onChange={(e) => setDescription(e.target.value)} />
      <Textarea
        placeholder={t("routines.stepsPh")}
        value={stepsText}
        onChange={(e) => setStepsText(e.target.value)}
        rows={4}
      />
      <div className="flex items-center gap-2">
        <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">{t("routines.freq.daily")}</SelectItem>
            <SelectItem value="weekly">{t("routines.freq.weekly")}</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" disabled={pending}>{t("common.save")}</Button>
      </div>
    </form>
  );
}
