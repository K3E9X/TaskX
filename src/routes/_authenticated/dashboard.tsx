import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format, isPast, parseISO, isToday, startOfDay, endOfDay, subDays } from "date-fns";
import { SendDigestButton } from "@/components/SendDigestButton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

type Todo = {
  id: string; title: string; status: "todo" | "doing" | "done";
  priority: "low" | "med" | "high" | "urgent";
  due_at: string | null; updated_at: string;
};
type Note = { id: string; title: string; updated_at: string };
type Routine = { id: string; name: string; steps: string[]; frequency: "daily" | "weekly" };
type Run = { routine_id: string; completed_steps: number[] };

const PRIO_VARIANT = {
  urgent: "destructive", high: "default", med: "secondary", low: "outline",
} as const;

const TODAY = () => new Date().toISOString().slice(0, 10);

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
        {action}
      </div>
      <div className="px-5 pb-4">{children}</div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function DashboardPage() {
  const { t } = useI18n();

  const yStart = startOfDay(subDays(new Date(), 1)).toISOString();
  const yEnd = endOfDay(subDays(new Date(), 1)).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  const { data: todos = [] } = useQuery({
    queryKey: ["dash", "todos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todos").select("id,title,status,priority,due_at,updated_at")
        .order("due_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Todo[];
    },
  });

  const { data: doneYesterday = [] } = useQuery({
    queryKey: ["dash", "doneYesterday"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todos").select("id,title,status,priority,due_at,updated_at")
        .eq("status", "done")
        .gte("updated_at", yStart).lte("updated_at", yEnd)
        .order("updated_at", { ascending: false }).limit(10);
      if (error) throw error;
      return data as Todo[];
    },
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["dash", "notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes").select("id,title,updated_at")
        .order("updated_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data as Note[];
    },
  });

  const { data: routines = [] } = useQuery({
    queryKey: ["dash", "routines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("routines").select("id,name,steps,frequency");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r, steps: Array.isArray(r.steps) ? (r.steps as string[]) : [],
      })) as Routine[];
    },
  });

  const { data: runs = [] } = useQuery({
    queryKey: ["dash", "routine_runs", TODAY()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routine_runs").select("routine_id,completed_steps").eq("run_date", TODAY());
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r, completed_steps: Array.isArray(r.completed_steps) ? (r.completed_steps as number[]) : [],
      })) as Run[];
    },
  });

  const overdue = todos.filter((x) => x.status !== "done" && x.due_at && isPast(parseISO(x.due_at)) && !isToday(parseISO(x.due_at)));
  const today = todos.filter((x) => x.status !== "done" && x.due_at && isToday(parseISO(x.due_at)));
  const upcoming = todos.filter((x) => x.status !== "done" && (!x.due_at || (parseISO(x.due_at).toISOString() > todayEnd))).slice(0, 5);
  const dailyRoutines = routines.filter((r) => r.frequency === "daily");
  const routineDoneCount = dailyRoutines.reduce((acc, r) => {
    const run = runs.find((x) => x.routine_id === r.id);
    const done = run?.completed_steps.length ?? 0;
    return acc + (r.steps.length > 0 && done === r.steps.length ? 1 : 0);
  }, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t("dash.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {format(new Date(), "EEEE d MMMM yyyy")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPI label={t("dash.kpi.overdue")} value={overdue.length} />
        <KPI label={t("dash.todayTodos")} value={today.length} />
        <KPI label={t("dash.routinesToday")} value={`${routineDoneCount}/${dailyRoutines.length}`} />
        <KPI label={t("dash.doneYesterday")} value={doneYesterday.length} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Section
          title={t("dash.todayTodos")}
          action={<Link to="/todos" className="text-xs text-muted-foreground hover:text-foreground">{t("dash.viewAll")} →</Link>}
        >
          {today.length === 0 && upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{t("dash.noTodayTodos")}</p>
          ) : (
            <ul className="divide-y divide-border -mx-1">
              {[...today, ...upcoming].slice(0, 8).map((x) => (
                <li key={x.id} className="flex items-start gap-2 py-2 px-1">
                  <Checkbox className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{x.title}</div>
                    {x.due_at && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {format(parseISO(x.due_at), "dd MMM HH:mm")}
                      </div>
                    )}
                  </div>
                  <Badge variant={PRIO_VARIANT[x.priority]} className="h-5 px-1.5 text-[10px]">
                    {t(`todos.prio.${x.priority}` as TKey)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title={t("dash.overdueTodos")}
          action={<Link to="/todos" className="text-xs text-muted-foreground hover:text-foreground">{t("dash.viewAll")} →</Link>}
        >
          {overdue.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{t("dash.noOverdue")}</p>
          ) : (
            <ul className="divide-y divide-border -mx-1">
              {overdue.slice(0, 8).map((x) => (
                <li key={x.id} className="flex items-start gap-2 py-2 px-1">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{x.title}</div>
                    <div className="text-[10px] text-destructive mt-0.5">
                      {t("todos.overdue")} · {format(parseISO(x.due_at!), "dd MMM")}
                    </div>
                  </div>
                  <Badge variant={PRIO_VARIANT[x.priority]} className="h-5 px-1.5 text-[10px]">
                    {t(`todos.prio.${x.priority}` as TKey)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title={t("dash.doneYesterday")}
          action={<span className="text-xs text-muted-foreground">{format(subDays(new Date(), 1), "dd MMM")}</span>}
        >
          {doneYesterday.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{t("dash.noDoneYesterday")}</p>
          ) : (
            <ul className="divide-y divide-border -mx-1">
              {doneYesterday.map((x) => (
                <li key={x.id} className="flex items-start gap-2 py-2 px-1">
                  <Checkbox checked className="mt-0.5" />
                  <div className="text-sm line-through text-muted-foreground truncate flex-1">{x.title}</div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title={t("dash.routinesToday")}
          action={<Link to="/routines" className="text-xs text-muted-foreground hover:text-foreground">{t("dash.viewAll")} →</Link>}
        >
          {dailyRoutines.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{t("dash.noRoutines")}</p>
          ) : (
            <ul className="space-y-3">
              {dailyRoutines.map((r) => {
                const run = runs.find((x) => x.routine_id === r.id);
                const done = run?.completed_steps.length ?? 0;
                const total = r.steps.length;
                const pct = total ? Math.round((done / total) * 100) : 0;
                return (
                  <li key={r.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm truncate">{r.name}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{done}/{total}</span>
                    </div>
                    <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section
          title={t("dash.recentNotes")}
          action={<Link to="/notes" className="text-xs text-muted-foreground hover:text-foreground">{t("dash.viewAll")} →</Link>}
        >
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{t("dash.noNotes")}</p>
          ) : (
            <ul className="divide-y divide-border -mx-1">
              {notes.map((n) => (
                <li key={n.id} className="flex items-baseline justify-between gap-2 py-2 px-1">
                  <span className="text-sm truncate">{n.title}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {format(parseISO(n.updated_at), "dd MMM HH:mm")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={t("dash.tip")}>
          <p className="text-sm text-muted-foreground py-4">{t("dash.tipSoon")}</p>
        </Section>
      </div>
    </div>
  );
}
