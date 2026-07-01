import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { format, isPast, parseISO, isToday, startOfDay, endOfDay, subDays } from "date-fns";
import { MorningBrief } from "@/components/MorningBrief";
import {
  Sparkles, Star, ExternalLink, ShieldAlert, AlertTriangle, CheckSquare,
  CalendarClock, FolderKanban, GitBranch, Terminal, Rss, Code2, Settings2,
  Flame, FileText, ArrowRight,
} from "lucide-react";
import { NOTE_TEMPLATES, type TemplateRole } from "@/lib/note-templates";
import { matchStackTags } from "@/lib/stack-match";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TaskX" },
      { name: "description", content: "Ton cockpit cyber : Watch For You, todos du jour, snippets, diagrammes, projets et streak." },
      { property: "og:title", content: "Dashboard — TaskX" },
      { property: "og:description", content: "Ton cockpit cyber quotidien." },
      { property: "og:url", content: "https://taskxx.lovable.app/dashboard" },
    ],
    links: [{ rel: "canonical", href: "https://taskxx.lovable.app/dashboard" }],
  }),
  component: DashboardPage,
});

// ---------- types ----------
type Todo = {
  id: string; title: string; status: "todo" | "doing" | "done";
  priority: "low" | "med" | "high" | "urgent";
  due_at: string | null; updated_at: string;
};
type CveItem = {
  id: string; source: string; severity: "info"|"low"|"medium"|"high"|"critical";
  title: string; summary: string|null; url: string|null; external_id: string|null;
  tags: string[]; published_at: string; starred: boolean;
};

const PRIO_VARIANT = {
  urgent: "destructive", high: "default", med: "secondary", low: "outline",
} as const;

const SEV_VARIANT = {
  info: "outline", low: "secondary", medium: "secondary", high: "default", critical: "destructive",
} as const;

// ---------- widget visibility ----------
type WidgetId =
  | "hero" | "morning-brief"
  | "watch-foryou" | "today-todos" | "overdue-todos"
  | "recent-snippets" | "recent-notes" | "recent-diagrams"
  | "cve-starred" | "active-projects" | "meetings-next"
  | "streak" | "suggested-templates" | "done-yesterday" | "quick-access";

const ALL_WIDGETS: WidgetId[] = [
  "hero", "morning-brief",
  "watch-foryou", "today-todos", "overdue-todos",
  "recent-snippets", "recent-notes", "recent-diagrams",
  "cve-starred", "active-projects", "meetings-next",
  "streak", "suggested-templates", "done-yesterday", "quick-access",
];

const WIDGET_LABEL: Record<WidgetId, TKey> = {
  "hero": "dash.hero.kpi.today",
  "morning-brief": "morningBrief.title" as TKey,
  "watch-foryou": "dash.forYou",
  "today-todos": "dash.todayTodos",
  "overdue-todos": "dash.overdueTodos",
  "recent-snippets": "dash.recentSnippets",
  "recent-notes": "dash.recentNotes",
  "recent-diagrams": "dash.recentDiagrams",
  "cve-starred": "dash.cveStarred",
  "active-projects": "dash.activeProjects",
  "meetings-next": "dash.hero.kpi.next",
  "streak": "dash.streak",
  "suggested-templates": "dash.suggestedTemplates",
  "done-yesterday": "dash.doneYesterday",
  "quick-access": "dash.section.quickAccess",
};

const LAYOUT_KEY = "taskx.dashboard.hidden.v3";

function loadHidden(): Set<WidgetId> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(LAYOUT_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as WidgetId[]);
  } catch {
    return new Set();
  }
}

// ---------- page ----------
function DashboardPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [hidden, setHidden] = useState<Set<WidgetId>>(() => loadHidden());
  const [customizing, setCustomizing] = useState(false);
  const isVisible = (id: WidgetId) => !hidden.has(id);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(Array.from(hidden)));
    }
  }, [hidden]);

  const toggleWidget = (id: WidgetId) => {
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const yStart = startOfDay(subDays(new Date(), 1)).toISOString();
  const yEnd = endOfDay(subDays(new Date(), 1)).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  // ----- queries -----
  const { data: profile } = useQuery({
    queryKey: ["dash", "profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("display_name,profile_type,stack_tags").maybeSingle();
      return data;
    },
  });
  const stackTags = useMemo(
    () => ((profile?.stack_tags as string[] | null) ?? []).map((x) => x.toLowerCase()),
    [profile?.stack_tags],
  );
  const role = (profile?.profile_type ?? "architect") as TemplateRole;

  const { data: todos = [] } = useQuery({
    queryKey: ["dash", "todos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("todos")
        .select("id,title,status,priority,due_at,updated_at")
        .order("due_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Todo[];
    },
  });

  const { data: doneYesterday = [] } = useQuery({
    queryKey: ["dash", "doneYesterday"],
    queryFn: async () => {
      const { data, error } = await supabase.from("todos")
        .select("id,title,status,priority,due_at,updated_at")
        .eq("status", "done").gte("updated_at", yStart).lte("updated_at", yEnd)
        .order("updated_at", { ascending: false }).limit(6);
      if (error) throw error;
      return data as Todo[];
    },
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["dash", "notes-recent"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notes")
        .select("id,title,updated_at,kind")
        .in("kind", ["note", "runbook"])
        .order("updated_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data as { id: string; title: string; updated_at: string; kind: string }[];
    },
  });

  const { data: snippets = [] } = useQuery({
    queryKey: ["dash", "snippets-recent"],
    queryFn: async () => {
      const { data, error } = await supabase.from("snippets")
        .select("id,title,command,language,updated_at")
        .order("updated_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data as { id: string; title: string; command: string; language: string | null; updated_at: string }[];
    },
  });

  const { data: diagrams = [] } = useQuery({
    queryKey: ["dash", "diagrams-recent"],
    queryFn: async () => {
      const { data, error } = await supabase.from("diagrams")
        .select("id,title,diagram_type,updated_at")
        .order("updated_at", { ascending: false }).limit(4);
      if (error) throw error;
      return data as { id: string; title: string; diagram_type: string; updated_at: string }[];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["dash", "projects-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects")
        .select("id,name,status,risk_level,updated_at")
        .in("status", ["active", "draft"])
        .order("updated_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data as { id: string; name: string; status: string; risk_level: string | null; updated_at: string }[];
    },
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ["dash", "meetings-next"],
    queryFn: async () => {
      const { data } = await supabase.from("meetings")
        .select("id,title,meeting_date")
        .gte("meeting_date", new Date().toISOString())
        .order("meeting_date", { ascending: true }).limit(3);
      return (data ?? []) as { id: string; title: string; meeting_date: string }[];
    },
  });

  const { data: cveRecent = [] } = useQuery({
    queryKey: ["dash", "cve-recent"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feed_items")
        .select("id,source,severity,title,summary,url,external_id,tags,published_at,starred")
        .in("source", ["cve", "cti"])
        .order("published_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data as CveItem[];
    },
    refetchOnMount: "always",
    staleTime: 0,
  });

  const { data: cveStarred = [] } = useQuery({
    queryKey: ["dash", "cve-starred"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feed_items")
        .select("id,source,severity,title,summary,url,external_id,tags,published_at,starred")
        .eq("starred", true)
        .order("published_at", { ascending: false }).limit(6);
      if (error) throw error;
      return data as CveItem[];
    },
  });

  const { data: activity7 = [] } = useQuery({
    queryKey: ["dash", "activity7"],
    queryFn: async () => {
      const since = format(subDays(new Date(), 6), "yyyy-MM-dd");
      const { data } = await supabase.from("daily_activity")
        .select("day,todos_done,notes_edited,feed_read")
        .gte("day", since).order("day", { ascending: true });
      return (data ?? []) as { day: string; todos_done: number; notes_edited: number; feed_read: number }[];
    },
  });

  const { data: streak = 0 } = useQuery({
    queryKey: ["dash", "streak"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_current_streak");
      return (data as number) ?? 0;
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

  // ----- derived -----
  const overdue = todos.filter((x) => x.status !== "done" && x.due_at && isPast(parseISO(x.due_at)) && !isToday(parseISO(x.due_at)));
  const today = todos.filter((x) => x.status !== "done" && x.due_at && isToday(parseISO(x.due_at)));
  const upcoming = todos.filter((x) => x.status !== "done" && (!x.due_at || (parseISO(x.due_at).toISOString() > todayEnd))).slice(0, 5);

  const forYou = useMemo(() => {
    if (stackTags.length === 0) return [] as { x: CveItem; matches: string[] }[];
    return cveRecent
      .map((x) => ({ x, matches: matchStackTags(x, stackTags) }))
      .filter((r) => r.matches.length > 0)
      .sort((a, b) => b.matches.length - a.matches.length)
      .slice(0, 5);
  }, [cveRecent, stackTags]);

  const suggestedTemplates = useMemo(() => {
    const mine = NOTE_TEMPLATES.filter((tpl) => tpl.role === role);
    const universal = NOTE_TEMPLATES.filter((tpl) => tpl.role === "universal");
    return [...mine, ...universal].slice(0, 4);
  }, [role]);

  const criticalCves = cveRecent.filter((c) => c.severity === "critical");
  const nextMeeting = meetings[0];
  const firstName = (profile?.display_name ?? "").split(" ")[0] || "";

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight text-foreground">
            {t("dash.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground capitalize">
            {format(new Date(), "EEEE d MMMM yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu open={customizing} onOpenChange={setCustomizing}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Settings2 className="h-3.5 w-3.5" />
                {t("dash.customize")}
                {hidden.size > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">−{hidden.size}</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 max-h-[70vh] overflow-y-auto">
              <DropdownMenuLabel className="text-xs">{t("dash.customize.hint")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_WIDGETS.map((id) => (
                <DropdownMenuCheckboxItem
                  key={id}
                  checked={isVisible(id)}
                  onCheckedChange={() => toggleWidget(id)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {t(WIDGET_LABEL[id])}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Hero brief */}
      {isVisible("hero") && (
        <HeroBrief
          firstName={firstName}
          overdueCount={overdue.length}
          todayCount={today.length}
          criticalCveCount={criticalCves.length}
          nextMeeting={nextMeeting ? { title: nextMeeting.title, at: nextMeeting.meeting_date } : null}
          firstOverdue={overdue[0]?.title ?? null}
          firstToday={today[0]?.title ?? null}
          firstCve={criticalCves[0]?.title ?? null}
        />
      )}

      {isVisible("morning-brief") && (
        <div className="mb-6">
          <MorningBrief />
        </div>
      )}

      {/* --- Zone 1: Priorité & Watch --- */}
      <Section label={t("dash.section.priority")}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isVisible("watch-foryou") && (
            <Tile
              className="lg:col-span-1"
              title={t("dash.forYou")}
              icon={Sparkles}
              action={<Link to="/feeds" className="text-xs text-primary hover:underline">{t("dash.viewAll")} →</Link>}
              accent
            >
              {stackTags.length === 0 ? (
                <EmptyCTA text={t("dash.forYou.empty")} to="/profile" cta="Profile" />
              ) : forYou.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">{t("dash.forYou.noMatch")}</p>
              ) : (
                <ul className="divide-y divide-border/60 -mx-1">
                  {forYou.map(({ x, matches }) => (
                    <CveRow
                      key={x.id}
                      item={x}
                      matches={matches}
                      onToggleStar={() => toggleStar.mutate({ id: x.id, starred: !x.starred })}
                      compact
                    />
                  ))}
                </ul>
              )}
            </Tile>
          )}

          {isVisible("today-todos") && (
            <Tile
              title={t("dash.todayTodos")}
              icon={CheckSquare}
              action={<Link to="/todos" className="text-xs text-muted-foreground hover:text-foreground">{t("dash.viewAll")} →</Link>}
            >
              {today.length === 0 && upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">{t("dash.noTodayTodos")}</p>
              ) : (
                <ul className="divide-y divide-border/60 -mx-1">
                  {[...today, ...upcoming].slice(0, 6).map((x) => (
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
          )}

          {isVisible("overdue-todos") && (
            <Tile
              title={t("dash.overdueTodos")}
              icon={AlertTriangle}
              danger={overdue.length > 0}
              action={<Link to="/todos" className="text-xs text-muted-foreground hover:text-foreground">{t("dash.viewAll")} →</Link>}
            >
              {overdue.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">{t("dash.noOverdue")}</p>
              ) : (
                <ul className="divide-y divide-border/60 -mx-1">
                  {overdue.slice(0, 6).map((x) => (
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
          )}
        </div>
      </Section>

      {/* --- Zone 2: Ta journée --- */}
      <Section label={t("dash.section.today")}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isVisible("recent-snippets") && (
            <Tile
              title={t("dash.recentSnippets")}
              icon={Terminal}
              action={<Link to="/snippets" className="text-xs text-muted-foreground hover:text-foreground">{t("dash.viewAll")} →</Link>}
            >
              {snippets.length === 0 ? (
                <EmptyCTA text={t("dash.recentSnippets.empty")} to="/snippets" cta="+ Snippet" />
              ) : (
                <ul className="divide-y divide-border/60 -mx-1">
                  {snippets.map((s) => {
                    const varCount = (s.command.match(/\{\{[A-Z0-9_]+\}\}/g) ?? []).length;
                    return (
                      <li key={s.id}>
                        <Link to="/snippets" className="flex items-start gap-2 py-2 px-1 hover:bg-accent/40 rounded-sm">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{s.title}</div>
                            <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                              {s.command.slice(0, 60)}
                            </div>
                          </div>
                          {varCount > 0 && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] shrink-0 border-primary/40 text-primary">
                              {varCount} {t("dash.hasVars")}
                            </Badge>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Tile>
          )}

          {isVisible("recent-notes") && (
            <Tile
              title={t("dash.recentNotes")}
              icon={FileText}
              action={<Link to="/notes" className="text-xs text-muted-foreground hover:text-foreground">{t("dash.viewAll")} →</Link>}
            >
              {notes.length === 0 ? (
                <EmptyCTA text={t("dash.noNotes")} to="/notes" cta="+ Note" />
              ) : (
                <ul className="divide-y divide-border/60 -mx-1">
                  {notes.map((n) => (
                    <li key={n.id}>
                      <Link to="/notes" className="flex items-baseline justify-between gap-2 py-2 px-1 hover:bg-accent/40 rounded-sm">
                        <span className="text-sm truncate">{n.title}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {format(parseISO(n.updated_at), "dd MMM")}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Tile>
          )}

          {isVisible("recent-diagrams") && (
            <Tile
              title={t("dash.recentDiagrams")}
              icon={GitBranch}
              action={<Link to="/diagrams" className="text-xs text-muted-foreground hover:text-foreground">{t("dash.viewAll")} →</Link>}
            >
              {diagrams.length === 0 ? (
                <EmptyCTA text={t("dash.recentDiagrams.empty")} to="/diagrams" cta="+ Diagramme" />
              ) : (
                <ul className="divide-y divide-border/60 -mx-1">
                  {diagrams.map((d) => (
                    <li key={d.id}>
                      <Link to="/diagrams" className="flex items-center gap-2 py-2 px-1 hover:bg-accent/40 rounded-sm">
                        <GitBranch className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{d.title}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {d.diagram_type}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Tile>
          )}
        </div>
      </Section>

      {/* --- Zone 3: Contexte --- */}
      <Section label={t("dash.section.context")}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isVisible("streak") && (
            <StreakTile streak={streak} activity={activity7} t={t} />
          )}

          {isVisible("meetings-next") && (
            <Tile
              title={t("dash.hero.kpi.next")}
              icon={CalendarClock}
              action={<Link to="/meetings" className="text-xs text-muted-foreground hover:text-foreground">{t("dash.viewAll")} →</Link>}
            >
              {meetings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">—</p>
              ) : (
                <ul className="divide-y divide-border/60 -mx-1">
                  {meetings.map((m) => (
                    <li key={m.id} className="py-2 px-1">
                      <div className="text-sm truncate">{m.title}</div>
                      <div className="text-[10px] text-primary font-mono mt-0.5">
                        {format(parseISO(m.meeting_date), "EEE dd MMM · HH:mm")}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Tile>
          )}

          {isVisible("active-projects") && (
            <Tile
              title={t("dash.activeProjects")}
              icon={FolderKanban}
              action={<Link to="/projects" className="text-xs text-muted-foreground hover:text-foreground">{t("dash.viewAll")} →</Link>}
            >
              {projects.length === 0 ? (
                <EmptyCTA text={t("dash.activeProjects.empty")} to="/projects" cta="+ Projet" />
              ) : (
                <ul className="divide-y divide-border/60 -mx-1">
                  {projects.map((p) => (
                    <li key={p.id}>
                      <Link to="/projects" className="flex items-center justify-between gap-2 py-2 px-1 hover:bg-accent/40 rounded-sm">
                        <span className="text-sm truncate">{p.name}</span>
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px] shrink-0">
                          {p.status}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Tile>
          )}

          {isVisible("cve-starred") && (
            <Tile
              title={t("dash.cveStarred")}
              icon={Star}
              action={<Link to="/feeds" className="text-xs text-muted-foreground hover:text-foreground">{t("dash.viewAll")} →</Link>}
            >
              {cveStarred.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">{t("dash.cveStarredEmpty")}</p>
              ) : (
                <ul className="divide-y divide-border/60 -mx-1">
                  {cveStarred.slice(0, 4).map((c) => (
                    <CveRow
                      key={c.id}
                      item={c}
                      onToggleStar={() => toggleStar.mutate({ id: c.id, starred: !c.starred })}
                      compact
                    />
                  ))}
                </ul>
              )}
            </Tile>
          )}

          {isVisible("done-yesterday") && (
            <Tile
              title={t("dash.doneYesterday")}
              icon={CheckSquare}
              action={<span className="text-xs text-muted-foreground">{format(subDays(new Date(), 1), "dd MMM")}</span>}
            >
              {doneYesterday.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">{t("dash.noDoneYesterday")}</p>
              ) : (
                <ul className="divide-y divide-border/60 -mx-1">
                  {doneYesterday.slice(0, 5).map((x) => (
                    <li key={x.id} className="flex items-start gap-2 py-2 px-1">
                      <Checkbox checked className="mt-0.5" />
                      <div className="text-sm line-through text-muted-foreground truncate flex-1">{x.title}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Tile>
          )}

          {isVisible("suggested-templates") && (
            <Tile
              title={t("dash.suggestedTemplates")}
              icon={Sparkles}
              action={<Link to="/templates" className="text-xs text-muted-foreground hover:text-foreground">{t("dash.openTemplates")} →</Link>}
            >
              {suggestedTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">—</p>
              ) : (
                <ul className="divide-y divide-border/60 -mx-1">
                  {suggestedTemplates.map((tpl) => (
                    <li key={tpl.id}>
                      <Link to="/templates" className="flex items-start gap-2 py-2 px-1 hover:bg-accent/40 rounded-sm">
                        <Sparkles className="h-3 w-3 mt-1 text-primary shrink-0" />
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
          )}
        </div>
      </Section>

      {/* --- Quick access --- */}
      {isVisible("quick-access") && (
        <Section label={t("dash.section.quickAccess")}>
          <QuickAccessGrid t={t} />
        </Section>
      )}
    </div>
  );
}

// ---------- section wrapper ----------
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
          {label}
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-primary/30 via-border to-transparent" />
      </div>
      {children}
    </section>
  );
}

// ---------- tile ----------
function Tile({
  title, icon: Icon, action, children, className, danger, accent,
}: {
  title: string;
  icon?: typeof Sparkles;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  danger?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`group relative rounded-lg border bg-card/80 backdrop-blur-sm transition-all hover:border-primary/30 ${
        danger ? "border-destructive/40" : accent ? "border-primary/25 shadow-[0_0_24px_-16px_oklch(0.78_0.15_195/60%)]" : "border-border"
      } ${className ?? ""}`}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/40">
        <div className="flex items-center gap-1.5 min-w-0">
          {Icon && <Icon className={`h-3.5 w-3.5 shrink-0 ${accent ? "text-primary" : "text-muted-foreground"}`} />}
          <h3 className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">
            {title}
          </h3>
        </div>
        {action}
      </div>
      <div className="px-4 pb-3 pt-1">{children}</div>
    </div>
  );
}

function EmptyCTA({ text, to, cta }: { text: string; to: string; cta: string }) {
  return (
    <div className="py-4 flex flex-col items-start gap-2">
      <p className="text-xs text-muted-foreground">{text}</p>
      <Link to={to} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
        {cta} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ---------- hero ----------
function HeroBrief({
  firstName, overdueCount, todayCount, criticalCveCount, nextMeeting,
  firstOverdue, firstToday, firstCve,
}: {
  firstName: string;
  overdueCount: number;
  todayCount: number;
  criticalCveCount: number;
  nextMeeting: { title: string; at: string } | null;
  firstOverdue: string | null;
  firstToday: string | null;
  firstCve: string | null;
}) {
  const { t } = useI18n();
  const h = new Date().getHours();
  const greetKey: TKey = h < 12 ? "dash.hero.greeting.morning" : h < 18 ? "dash.hero.greeting.afternoon" : "dash.hero.greeting.evening";
  const allClear = overdueCount === 0 && criticalCveCount === 0;

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl border border-primary/20 bg-card/60 backdrop-blur-sm">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,oklch(0.78_0.15_195/_0.12),transparent_60%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_bottom_left,oklch(0.72_0.14_180/_0.08),transparent_50%)]" />
      <div className="relative p-6">
        <div className="mb-5 flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="font-mono text-lg font-semibold tracking-tight">
            {t(greetKey)}{firstName ? `, ${firstName}` : ""}<span className="text-primary">.</span>
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary/70">
            {allClear ? `● ${t("dash.hero.kpi.allClear")}` : "● Brief"}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HeroTile to="/todos" icon={AlertTriangle} tone={overdueCount > 0 ? "danger" : "neutral"}
            label={t("dash.hero.kpi.overdue")} value={overdueCount} sub={firstOverdue ?? t("dash.hero.kpi.empty")} />
          <HeroTile to="/todos" icon={CheckSquare} tone="neutral"
            label={t("dash.hero.kpi.today")} value={todayCount} sub={firstToday ?? t("dash.hero.kpi.empty")} />
          <HeroTile to="/feeds" icon={ShieldAlert} tone={criticalCveCount > 0 ? "danger" : "neutral"}
            label={t("dash.hero.kpi.cve")} value={criticalCveCount} sub={firstCve ?? t("dash.hero.kpi.empty")} />
          <HeroTile to="/meetings" icon={CalendarClock} tone="neutral"
            label={t("dash.hero.kpi.next")}
            value={nextMeeting ? format(parseISO(nextMeeting.at), "HH:mm") : "—"}
            sub={nextMeeting?.title ?? t("dash.hero.kpi.empty")} />
        </div>
      </div>
    </div>
  );
}

function HeroTile({
  to, icon: Icon, label, value, sub, tone,
}: {
  to: string; icon: typeof AlertTriangle;
  label: string; value: React.ReactNode; sub: string;
  tone: "danger" | "neutral";
}) {
  const danger = tone === "danger";
  return (
    <Link
      to={to}
      className={`group relative rounded-lg border p-4 transition-all hover:-translate-y-px hover:shadow-[0_6px_24px_-12px_oklch(0.78_0.15_195/40%)] ${
        danger
          ? "border-destructive/40 bg-destructive/[0.06]"
          : "border-border bg-background/40 hover:border-primary/40"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`font-mono text-[10px] font-medium uppercase tracking-widest ${danger ? "text-destructive" : "text-muted-foreground"}`}>
          {label}
        </span>
        <Icon className={`h-3.5 w-3.5 ${danger ? "text-destructive" : "text-primary/70"}`} />
      </div>
      <div className={`font-mono text-3xl font-semibold tabular-nums leading-none ${danger ? "text-destructive" : "text-foreground"}`}>
        {value}
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground line-clamp-1 min-h-[1em]">{sub}</div>
    </Link>
  );
}

// ---------- streak tile ----------
function StreakTile({
  streak, activity, t,
}: {
  streak: number;
  activity: { day: string; todos_done: number; notes_edited: number; feed_read: number }[];
  t: (k: TKey) => string;
}) {
  const days = useMemo(() => {
    const map = new Map(activity.map((a) => [a.day, a]));
    const out: { day: Date; intensity: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const key = format(d, "yyyy-MM-dd");
      const row = map.get(key);
      const total = (row?.todos_done ?? 0) + (row?.notes_edited ?? 0) + (row?.feed_read ?? 0);
      const intensity = total === 0 ? 0 : total < 3 ? 1 : total < 8 ? 2 : total < 15 ? 3 : 4;
      out.push({ day: d, intensity });
    }
    return out;
  }, [activity]);

  return (
    <Tile title={t("dash.streak")} icon={Flame} accent>
      <div className="pt-2 pb-1 flex items-baseline gap-2">
        <span className="font-mono text-4xl font-semibold tabular-nums text-primary">{streak}</span>
        <span className="text-xs text-muted-foreground">{t("dash.streak.days")}</span>
      </div>
      <div className="mt-3 flex items-end gap-1">
        {days.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-full h-8 rounded-sm transition-colors ${
                d.intensity === 0 ? "bg-muted/40" :
                d.intensity === 1 ? "bg-primary/20" :
                d.intensity === 2 ? "bg-primary/40" :
                d.intensity === 3 ? "bg-primary/70" : "bg-primary"
              }`}
              title={format(d.day, "EEE dd MMM")}
            />
            <span className="text-[9px] font-mono text-muted-foreground uppercase">
              {format(d.day, "EEEEE")}
            </span>
          </div>
        ))}
      </div>
    </Tile>
  );
}

// ---------- CVE row ----------
function CveRow({
  item, matches, onToggleStar, compact,
}: {
  item: {
    id: string; source: string; severity: keyof typeof SEV_VARIANT;
    title: string; summary: string | null; url: string | null;
    external_id: string | null; published_at: string; starred: boolean;
  };
  matches?: string[];
  onToggleStar: () => void;
  compact?: boolean;
}) {
  return (
    <li className="flex items-start gap-2 py-2 px-1">
      <ShieldAlert className="h-3.5 w-3.5 mt-1 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <Badge variant={SEV_VARIANT[item.severity]} className="h-4 px-1 text-[9px] uppercase font-mono">
            {item.severity}
          </Badge>
          {item.external_id && (
            <span className="text-[10px] font-mono text-muted-foreground truncate">{item.external_id}</span>
          )}
          {matches && matches.length > 0 && (
            <Badge variant="outline" className="h-4 px-1 text-[9px] uppercase font-mono border-primary/40 text-primary bg-primary/5">
              <Sparkles className="h-2 w-2 mr-0.5" />{matches.slice(0, 2).join(", ")}
            </Badge>
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
        <Star className={`h-3.5 w-3.5 ${item.starred ? "fill-primary text-primary" : ""}`} />
      </button>
    </li>
  );
}

// ---------- quick access ----------
function QuickAccessGrid({ t }: { t: (k: TKey) => string }) {
  const { data: counts } = useQuery({
    queryKey: ["dash", "quick-counts"],
    queryFn: async () => {
      const [p, m, d, s, f] = await Promise.all([
        supabase.from("projects").select("id", { count: "exact", head: true }).in("status", ["active", "draft"]),
        supabase.from("meetings").select("id", { count: "exact", head: true }).gte("meeting_date", new Date().toISOString()),
        supabase.from("diagrams").select("id", { count: "exact", head: true }),
        supabase.from("snippets").select("id", { count: "exact", head: true }),
        supabase.from("feed_items").select("id", { count: "exact", head: true }).eq("read", false),
      ]);
      return {
        projects: p.count ?? 0, meetings: m.count ?? 0, diagrams: d.count ?? 0,
        snippets: s.count ?? 0, feeds: f.count ?? 0,
      };
    },
  });

  const items: { to: string; icon: typeof FolderKanban; label: string; value: number | string }[] = [
    { to: "/projects", icon: FolderKanban, label: t("dash.quick.projects"), value: counts?.projects ?? "—" },
    { to: "/meetings", icon: CalendarClock, label: t("dash.quick.meetings"), value: counts?.meetings ?? "—" },
    { to: "/diagrams", icon: GitBranch, label: t("dash.quick.diagrams"), value: counts?.diagrams ?? "—" },
    { to: "/feeds", icon: Rss, label: t("dash.quick.feeds"), value: counts?.feeds ?? "—" },
    { to: "/snippets", icon: Code2, label: t("dash.quick.snippets"), value: counts?.snippets ?? "—" },
    { to: "/notes", icon: FileText, label: t("dash.recentNotes"), value: "→" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {items.map((it) => (
        <Link
          key={it.to}
          to={it.to}
          className="group rounded-lg border bg-card/60 p-3 hover:bg-accent/40 hover:border-primary/30 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <it.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="font-mono text-base font-semibold tabular-nums leading-none">{it.value}</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground truncate">{it.label}</div>
        </Link>
      ))}
    </div>
  );
}
