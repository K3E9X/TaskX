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
import { MorningBrief } from "@/components/MorningBrief";
import { DynamicPulse } from "@/components/DynamicPulse";
import {
  Maximize2, Minimize2, X, Plus, RotateCcw, Sparkles, Star, ExternalLink, ShieldAlert,
  AlertTriangle, CheckSquare, CalendarClock, FolderKanban, GitBranch, Bookmark, Terminal,
  Rss, Users, Code2,
} from "lucide-react";
import { NOTE_TEMPLATES, type TemplateRole } from "@/lib/note-templates";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

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
  | "routines-today" | "recent-notes" | "tip" | "suggested-templates"
  | "cve-watch" | "cve-starred";

type LayoutItem = { id: WidgetId; size: Size; visible: boolean };

const DEFAULT_LAYOUT: LayoutItem[] = [
  { id: "kpi-overdue", size: "sm", visible: true },
  { id: "kpi-today", size: "sm", visible: true },
  { id: "kpi-routines", size: "sm", visible: true },
  { id: "kpi-done", size: "sm", visible: true },
  { id: "today-todos", size: "md", visible: true },
  { id: "overdue-todos", size: "md", visible: true },
  { id: "cve-watch", size: "lg", visible: true },
  { id: "cve-starred", size: "md", visible: true },
  { id: "suggested-templates", size: "md", visible: true },
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
  "suggested-templates": "dash.suggestedTemplates",
  "cve-watch": "dash.cveWatch",
  "cve-starred": "dash.cveStarred",
};

function DashboardPage() {
  const { t, lang } = useI18n();
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

  const { data: meetings = [] } = useQuery({
    queryKey: ["dash", "next-meetings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("meetings").select("id,title,meeting_date")
        .gte("meeting_date", new Date().toISOString())
        .order("meeting_date", { ascending: true }).limit(1);
      return data ?? [];
    },
  });

  const qc = useQueryClient();
  type CveItem = {
    id: string; source: string; severity: "info"|"low"|"medium"|"high"|"critical";
    title: string; summary: string|null; url: string|null; external_id: string|null;
    tags: string[]; published_at: string; starred: boolean;
  };

  const { data: cveRecent = [] } = useQuery({
    queryKey: ["dash", "cve-recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feed_items")
        .select("id,source,severity,title,summary,url,external_id,tags,published_at,starred")
        .in("source", ["cve", "cti"])
        .order("published_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data as CveItem[];
    },
    refetchOnMount: "always",
    staleTime: 0,
  });

  const { data: cveStarred = [] } = useQuery({
    queryKey: ["dash", "cve-starred"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feed_items")
        .select("id,source,severity,title,summary,url,external_id,tags,published_at,starred")
        .eq("starred", true)
        .order("published_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data as CveItem[];
    },
  });

  const toggleStar = useMutation({
    mutationFn: async ({ id, starred }: { id: string; starred: boolean }) => {
      const { error } = await supabase.from("feed_items").update({ starred }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dash", "cve-recent"] });
      qc.invalidateQueries({ queryKey: ["dash", "cve-starred"] });
      qc.invalidateQueries({ queryKey: ["feed_items"] });
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

  const { data: profile } = useQuery({
    queryKey: ["dash", "profile-role"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("team_role").maybeSingle();
      return data;
    },
  });
  const role = (profile?.team_role ?? "architect") as TemplateRole;
  const suggestedTemplates = useMemo(() => {
    const mine = NOTE_TEMPLATES.filter((tpl) => tpl.role === role);
    const universal = NOTE_TEMPLATES.filter((tpl) => tpl.role === "universal");
    return [...mine, ...universal].slice(0, 4);
  }, [role]);

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
      case "suggested-templates":
        return (
          <Tile key={item.id} {...common} title={t("dash.suggestedTemplates")}
            action={<Link to="/templates" className="text-xs text-muted-foreground hover:text-foreground">{t("dash.openTemplates")} →</Link>}>
            {suggestedTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{t("common.empty")}</p>
            ) : (
              <ul className="divide-y divide-border -mx-1">
                {suggestedTemplates.map((tpl) => (
                  <li key={tpl.id}>
                    <Link
                      to="/templates"
                      className="flex items-start gap-2 py-2 px-1 hover:bg-accent/40 rounded-sm transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{tpl[lang].title}</div>
                        <div className="text-[10px] text-muted-foreground capitalize">{tpl.role}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Tile>
        );
      case "cve-watch":
        return (
          <Tile key={item.id} {...common} title={t("dash.cveWatch")}
            action={<Link to="/feeds" className="text-xs text-muted-foreground hover:text-foreground">{t("dash.viewAll")} →</Link>}>
            {cveRecent.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{t("dash.cveWatchEmpty")}</p>
            ) : (
              <ul className="divide-y divide-border -mx-1">
                {cveRecent.map((c) => (
                  <CveRow key={c.id} item={c} onToggleStar={() => toggleStar.mutate({ id: c.id, starred: !c.starred })} />
                ))}
              </ul>
            )}
          </Tile>
        );
      case "cve-starred":
        return (
          <Tile key={item.id} {...common} title={t("dash.cveStarred")}
            action={<Link to="/feeds" className="text-xs text-muted-foreground hover:text-foreground">{t("dash.viewAll")} →</Link>}>
            {cveStarred.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{t("dash.cveStarredEmpty")}</p>
            ) : (
              <ul className="divide-y divide-border -mx-1">
                {cveStarred.map((c) => (
                  <CveRow key={c.id} item={c} onToggleStar={() => toggleStar.mutate({ id: c.id, starred: !c.starred })} compact />
                ))}
              </ul>
            )}
          </Tile>
        );
    }
  };

  const nextMeeting = meetings[0];
  const criticalCves = cveRecent.filter((c) => c.severity === "critical");

  const visibleByGroup = (ids: WidgetId[]) =>
    layout.filter((x) => x.visible && ids.includes(x.id));

  const priorityWidgets = visibleByGroup(["today-todos", "overdue-todos"]);
  const watchWidgets = visibleByGroup(["cve-watch", "cve-starred"]);
  const workWidgets = visibleByGroup(["done-yesterday", "routines-today", "recent-notes", "suggested-templates", "tip"]);

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("dash.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground capitalize">
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

      {/* Hero brief */}
      <HeroBrief
        overdueCount={overdue.length}
        todayCount={today.length}
        criticalCveCount={criticalCves.length}
        nextMeeting={nextMeeting ? { title: nextMeeting.title, at: nextMeeting.meeting_date } : null}
        firstOverdue={overdue[0]?.title ?? null}
        firstToday={today[0]?.title ?? null}
        firstCve={criticalCves[0]?.title ?? null}
      />

      <div className="mb-6">
        <MorningBrief />
      </div>

      {/* Section: priority */}
      {priorityWidgets.length > 0 && (
        <Section label={t("dash.section.priority")}>
          <div className="grid gap-4 md:grid-cols-4">
            {priorityWidgets.map(renderWidget)}
          </div>
        </Section>
      )}

      {/* Section: security watch */}
      {watchWidgets.length > 0 && (
        <Section label={t("dash.section.watch")}>
          <div className="grid gap-4 md:grid-cols-4">
            {watchWidgets.map(renderWidget)}
          </div>
        </Section>
      )}

      {/* Section: your work */}
      {workWidgets.length > 0 && (
        <Section label={t("dash.section.work")}>
          <div className="grid gap-4 md:grid-cols-4">
            {workWidgets.map(renderWidget)}
          </div>
        </Section>
      )}

      {/* KPIs at the end (if visible) */}
      {(() => {
        const kpis = visibleByGroup(["kpi-overdue", "kpi-today", "kpi-routines", "kpi-done"]);
        if (kpis.length === 0) return null;
        return (
          <Section label="KPI">
            <div className="grid gap-4 md:grid-cols-4">{kpis.map(renderWidget)}</div>
          </Section>
        );
      })()}

      {/* Section: quick access */}
      <Section label={t("dash.section.quickAccess")}>
        <QuickAccessGrid t={t} />
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</h2>
        <div className="flex-1 h-px bg-border" />
      </div>
      {children}
    </section>
  );
}

function greetingKey(): "dash.hero.greeting.morning" | "dash.hero.greeting.afternoon" | "dash.hero.greeting.evening" {
  const h = new Date().getHours();
  if (h < 12) return "dash.hero.greeting.morning";
  if (h < 18) return "dash.hero.greeting.afternoon";
  return "dash.hero.greeting.evening";
}

function HeroBrief({
  overdueCount, todayCount, criticalCveCount, nextMeeting,
  firstOverdue, firstToday, firstCve,
}: {
  overdueCount: number;
  todayCount: number;
  criticalCveCount: number;
  nextMeeting: { title: string; at: string } | null;
  firstOverdue: string | null;
  firstToday: string | null;
  firstCve: string | null;
}) {
  const { t } = useI18n();
  const { data: profile } = useQuery({
    queryKey: ["dash", "hero-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("display_name,team_role").maybeSingle();
      return data;
    },
  });
  const firstName = (profile?.display_name ?? "").split(" ")[0] || "";
  const allClear = overdueCount === 0 && criticalCveCount === 0;

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl border bg-gradient-to-br from-card via-card to-accent/30">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,oklch(0.74_0.18_295/_0.08),transparent_60%)]" />
      <div className="relative p-6">
        <div className="mb-5 flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold tracking-tight">
            {t(greetingKey())}{firstName ? `, ${firstName}` : ""}.
          </h2>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {allClear ? t("dash.hero.kpi.allClear") : "Brief"}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HeroTile
            to="/todos"
            icon={AlertTriangle}
            tone={overdueCount > 0 ? "danger" : "neutral"}
            label={t("dash.hero.kpi.overdue")}
            value={overdueCount}
            sub={firstOverdue ?? t("dash.hero.kpi.empty")}
          />
          <HeroTile
            to="/todos"
            icon={CheckSquare}
            tone="neutral"
            label={t("dash.hero.kpi.today")}
            value={todayCount}
            sub={firstToday ?? t("dash.hero.kpi.empty")}
          />
          <HeroTile
            to="/feeds"
            icon={ShieldAlert}
            tone={criticalCveCount > 0 ? "danger" : "neutral"}
            label={t("dash.hero.kpi.cve")}
            value={criticalCveCount}
            sub={firstCve ?? t("dash.hero.kpi.empty")}
          />
          <HeroTile
            to="/meetings"
            icon={CalendarClock}
            tone="neutral"
            label={t("dash.hero.kpi.next")}
            value={nextMeeting ? format(parseISO(nextMeeting.at), "HH:mm") : "—"}
            sub={nextMeeting?.title ?? t("dash.hero.kpi.empty")}
          />
        </div>
      </div>
    </div>
  );
}

function HeroTile({
  to, icon: Icon, label, value, sub, tone,
}: {
  to: string;
  icon: typeof AlertTriangle;
  label: string;
  value: React.ReactNode;
  sub: string;
  tone: "danger" | "neutral";
}) {
  const danger = tone === "danger";
  return (
    <Link
      to={to}
      className={`group relative rounded-lg border p-4 transition-all hover:shadow-md hover:-translate-y-px ${
        danger ? "border-destructive/40 bg-destructive/[0.04]" : "border-border bg-background/60"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-medium uppercase tracking-wider ${danger ? "text-destructive" : "text-muted-foreground"}`}>
          {label}
        </span>
        <Icon className={`h-3.5 w-3.5 ${danger ? "text-destructive" : "text-muted-foreground"}`} />
      </div>
      <div className={`text-2xl font-semibold tabular-nums leading-none ${danger ? "text-destructive" : "text-foreground"}`}>
        {value}
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground line-clamp-1 min-h-[1em]">{sub}</div>
    </Link>
  );
}

function QuickAccessGrid({ t }: { t: (k: TKey) => string }) {
  const { data: counts } = useQuery({
    queryKey: ["dash", "quick-counts"],
    queryFn: async () => {
      const [p, m, d, b, ti, s, f] = await Promise.all([
        supabase.from("projects").select("id", { count: "exact", head: true }).in("status", ["active", "draft"]),
        supabase.from("meetings").select("id", { count: "exact", head: true }).gte("meeting_date", new Date().toISOString()),
        supabase.from("diagrams").select("id", { count: "exact", head: true }),
        supabase.from("bookmarks").select("id", { count: "exact", head: true }),
        supabase.from("usage_tips").select("id", { count: "exact", head: true }).eq("published", true),
        supabase.from("snippets").select("id", { count: "exact", head: true }),
        supabase.from("feed_items").select("id", { count: "exact", head: true }).eq("read", false),
      ]);
      return {
        projects: p.count ?? 0, meetings: m.count ?? 0, diagrams: d.count ?? 0,
        bookmarks: b.count ?? 0, tips: ti.count ?? 0, snippets: s.count ?? 0, feeds: f.count ?? 0,
      };
    },
  });

  const items: { to: string; icon: typeof FolderKanban; label: string; value: number | string }[] = [
    { to: "/projects", icon: FolderKanban, label: t("dash.quick.projects"), value: counts?.projects ?? "—" },
    { to: "/meetings", icon: CalendarClock, label: t("dash.quick.meetings"), value: counts?.meetings ?? "—" },
    { to: "/diagrams", icon: GitBranch, label: t("dash.quick.diagrams"), value: counts?.diagrams ?? "—" },
    { to: "/feeds", icon: Rss, label: t("dash.quick.feeds"), value: counts?.feeds ?? "—" },
    { to: "/snippets", icon: Code2, label: t("dash.quick.snippets"), value: counts?.snippets ?? "—" },
    { to: "/tips", icon: Terminal, label: t("dash.quick.tips"), value: counts?.tips ?? "—" },
    { to: "/bookmarks", icon: Bookmark, label: t("dash.quick.bookmarks"), value: counts?.bookmarks ?? "—" },
    { to: "/team", icon: Users, label: t("dash.quick.team"), value: "→" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
      {items.map((it) => (
        <Link
          key={it.to}
          to={it.to}
          className="group rounded-lg border bg-card p-3 hover:bg-accent/40 hover:border-foreground/20 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <it.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="text-base font-semibold tabular-nums leading-none">{it.value}</span>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{it.label}</div>
        </Link>
      ))}
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

const SEV_VARIANT_DASH = {
  info: "outline", low: "secondary", medium: "secondary", high: "default", critical: "destructive",
} as const;

function CveRow({
  item, onToggleStar, compact,
}: {
  item: {
    id: string; source: string; severity: keyof typeof SEV_VARIANT_DASH;
    title: string; summary: string | null; url: string | null;
    external_id: string | null; published_at: string; starred: boolean;
  };
  onToggleStar: () => void;
  compact?: boolean;
}) {
  return (
    <li className="flex items-start gap-2 py-2 px-1">
      <ShieldAlert className="h-3.5 w-3.5 mt-1 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <Badge variant={SEV_VARIANT_DASH[item.severity]} className="h-4 px-1 text-[9px] uppercase">
            {item.severity}
          </Badge>
          <Badge variant="outline" className="h-4 px-1 text-[9px] uppercase">{item.source}</Badge>
          {item.external_id && (
            <span className="text-[10px] font-mono text-muted-foreground truncate">{item.external_id}</span>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
            {formatDistanceToNow(parseISO(item.published_at), { addSuffix: true })}
          </span>
        </div>
        <div className="text-sm leading-snug truncate">{item.title}</div>
        {!compact && item.summary && (
          <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{item.summary}</div>
        )}
        {item.url && (
          <a href={item.url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-0.5">
            <ExternalLink className="h-2.5 w-2.5" /> {new URL(item.url).hostname}
          </a>
        )}
      </div>
      <button
        onClick={onToggleStar}
        title={item.starred ? "Unpin" : "Pin"}
        className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent/60 shrink-0"
      >
        <Star className={`h-3.5 w-3.5 ${item.starred ? "fill-yellow-500 text-yellow-500" : ""}`} />
      </button>
    </li>
  );
}
