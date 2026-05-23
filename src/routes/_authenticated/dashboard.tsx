import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { format, isPast, parseISO, isToday, startOfDay, endOfDay, subDays } from "date-fns";
import { SendDigestButton } from "@/components/SendDigestButton";
import { Maximize2, Minimize2, X, Plus, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TaskX" },
      { name: "description", content: "Your TaskX dashboard: today's to-dos, overdue tasks, daily routines, recent notes and CTI tip of the day in one cockpit." },
      { property: "og:title", content: "Dashboard — TaskX" },
      { property: "og:description", content: "Your TaskX cockpit with today's to-dos, overdue tasks, routines and recent notes." },
      { property: "og:url", content: "https://taskxx.lovable.app/dashboard" },
    ],
    links: [{ rel: "canonical", href: "https://taskxx.lovable.app/dashboard" }],
  }),
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

type Size = "sm" | "md" | "lg";
type WidgetId =
  | "kpi-overdue" | "kpi-today" | "kpi-routines" | "kpi-done"
  | "today-todos" | "overdue-todos" | "done-yesterday"
  | "routines-today" | "recent-notes" | "tip";

type LayoutItem = { id: WidgetId; size: Size; visible: boolean };

const DEFAULT_LAYOUT: LayoutItem[] = [
  { id: "kpi-overdue", size: "sm", visible: true },
  { id: "kpi-today", size: "sm", visible: true },
  { id: "kpi-routines", size: "sm", visible: true },
  { id: "kpi-done", size: "sm", visible: true },
  { id: "today-todos", size: "md", visible: true },
  { id: "overdue-todos", size: "md", visible: true },
  { id: "done-yesterday", size: "md", visible: true },
  { id: "routines-today", size: "md", visible: true },
  { id: "recent-notes", size: "md", visible: true },
  { id: "tip", size: "md", visible: true },
];

const LAYOUT_KEY = "taskx.dashboard.layout.v1";

function loadLayout(): LayoutItem[] {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = window.localStorage.getItem(LAYOUT_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as LayoutItem[];
    // merge with defaults to keep newly added widgets visible
    const known = new Set(parsed.map((x) => x.id));
    const merged = [...parsed];
    for (const def of DEFAULT_LAYOUT) {
      if (!known.has(def.id)) merged.push(def);
    }
    return merged;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function sizeClass(s: Size) {
  // 4-column grid on lg
  if (s === "sm") return "md:col-span-2 lg:col-span-1";
  if (s === "md") return "md:col-span-2 lg:col-span-2";
  return "md:col-span-2 lg:col-span-4";
}

function nextSize(s: Size): Size {
  return s === "sm" ? "md" : s === "md" ? "lg" : "sm";
}
function prevSize(s: Size): Size {
  return s === "lg" ? "md" : s === "md" ? "sm" : "lg";
}

function Tile({
  size, title, action, onResize, onShrink, onRemove, children, compact,
}: {
  size: Size;
  title: string;
  action?: React.ReactNode;
  onResize: () => void;
  onShrink: () => void;
  onRemove: () => void;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`group relative rounded-lg border bg-card ${sizeClass(size)}`}>
      <div className={`flex items-center justify-between ${compact ? "px-4 pt-3 pb-1" : "px-5 pt-4 pb-2"}`}>
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">{title}</h2>
        <div className="flex items-center gap-1">
          <div className="hidden group-hover:flex items-center gap-0.5">
            <button onClick={onShrink} aria-label={`Shrink ${title}`} title="−" className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent/60">
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={onResize} aria-label={`Resize ${title}`} title="+" className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent/60">
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={onRemove} aria-label={`Remove ${title}`} title="×" className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-accent/60">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {action}
        </div>
      </div>
      <div className={compact ? "px-4 pb-3" : "px-5 pb-4"}>{children}</div>
    </div>
  );
}

const WIDGET_TITLE: Record<WidgetId, TKey> = {
  "kpi-overdue": "dash.kpi.overdue",
  "kpi-today": "dash.todayTodos",
  "kpi-routines": "dash.routinesToday",
  "kpi-done": "dash.doneYesterday",
  "today-todos": "dash.todayTodos",
  "overdue-todos": "dash.overdueTodos",
  "done-yesterday": "dash.doneYesterday",
  "routines-today": "dash.routinesToday",
  "recent-notes": "dash.recentNotes",
  "tip": "dash.tip",
};

function DashboardPage() {
  const { t } = useI18n();
  const [layout, setLayout] = useState<LayoutItem[]>(() => loadLayout());

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    }
  }, [layout]);

  const setSize = (id: WidgetId, size: Size) =>
    setLayout((L) => L.map((x) => (x.id === id ? { ...x, size } : x)));
  const setVisible = (id: WidgetId, visible: boolean) =>
    setLayout((L) => L.map((x) => (x.id === id ? { ...x, visible } : x)));
  const resetLayout = () => setLayout(DEFAULT_LAYOUT);

  const hidden = useMemo(() => layout.filter((x) => !x.visible), [layout]);

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

  const renderWidget = (item: LayoutItem) => {
    const common = {
      size: item.size,
      onResize: () => setSize(item.id, nextSize(item.size)),
      onShrink: () => setSize(item.id, prevSize(item.size)),
      onRemove: () => setVisible(item.id, false),
    };
    switch (item.id) {
      case "kpi-overdue":
        return <KPITile key={item.id} {...common} title={t("dash.kpi.overdue")} value={overdue.length} />;
      case "kpi-today":
        return <KPITile key={item.id} {...common} title={t("dash.todayTodos")} value={today.length} />;
      case "kpi-routines":
        return <KPITile key={item.id} {...common} title={t("dash.routinesToday")} value={`${routineDoneCount}/${dailyRoutines.length}`} />;
      case "kpi-done":
        return <KPITile key={item.id} {...common} title={t("dash.doneYesterday")} value={doneYesterday.length} />;
      case "today-todos":
        return (
          <Tile key={item.id} {...common} title={t("dash.todayTodos")}
            action={<Link to="/todos" className="text-xs text-muted-foreground hover:text-foreground">{t("dash.viewAll")} →</Link>}>
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
          </Tile>
        );
      case "overdue-todos":
        return (
          <Tile key={item.id} {...common} title={t("dash.overdueTodos")}
            action={<Link to="/todos" className="text-xs text-muted-foreground hover:text-foreground">{t("dash.viewAll")} →</Link>}>
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
          </Tile>
        );
      case "done-yesterday":
        return (
          <Tile key={item.id} {...common} title={t("dash.doneYesterday")}
            action={<span className="text-xs text-muted-foreground">{format(subDays(new Date(), 1), "dd MMM")}</span>}>
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
          </Tile>
        );
      case "routines-today":
        return (
          <Tile key={item.id} {...common} title={t("dash.routinesToday")}
            action={<Link to="/routines" className="text-xs text-muted-foreground hover:text-foreground">{t("dash.viewAll")} →</Link>}>
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
          </Tile>
        );
      case "recent-notes":
        return (
          <Tile key={item.id} {...common} title={t("dash.recentNotes")}
            action={<Link to="/notes" className="text-xs text-muted-foreground hover:text-foreground">{t("dash.viewAll")} →</Link>}>
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
          </Tile>
        );
      case "tip":
        return (
          <Tile key={item.id} {...common} title={t("dash.tip")}>
            <p className="text-sm text-muted-foreground py-4">{t("dash.tipSoon")}</p>
          </Tile>
        );
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("dash.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(new Date(), "EEEE d MMMM yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> {t("common.add_widget")}
                {hidden.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{hidden.length}</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t("common.add_widget")}</DropdownMenuLabel>
              {hidden.length === 0 ? (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  {t("common.empty")}
                </DropdownMenuItem>
              ) : (
                hidden.map((w) => (
                  <DropdownMenuItem key={w.id} onClick={() => setVisible(w.id, true)}>
                    <Plus className="h-3.5 w-3.5 mr-2" /> {t(WIDGET_TITLE[w.id])}
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={resetLayout}>
                <RotateCcw className="h-3.5 w-3.5 mr-2" /> {t("common.reset_layout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <SendDigestButton />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {layout.filter((x) => x.visible).map(renderWidget)}
      </div>
    </div>
  );
}

function KPITile({
  size, title, value, onResize, onShrink, onRemove,
}: {
  size: Size;
  title: string;
  value: string | number;
  onResize: () => void;
  onShrink: () => void;
  onRemove: () => void;
}) {
  return (
    <div className={`group relative rounded-lg border bg-card p-5 ${sizeClass(size)}`}>
      <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-0.5">
        <button onClick={onShrink} aria-label={`Shrink ${title}`} className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent/60">
          <Minimize2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={onResize} aria-label={`Resize ${title}`} className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent/60">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={onRemove} aria-label={`Remove ${title}`} className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-accent/60">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
