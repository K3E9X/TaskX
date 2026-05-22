import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import {
  CheckSquare, AlertTriangle, Repeat, FileText, FolderKanban,
  CalendarClock, GitBranch, ShieldAlert, Terminal, Rss, Bookmark, Twitter, Users,
} from "lucide-react";
import { isPast, parseISO, isToday, startOfDay, endOfDay, format } from "date-fns";

export const Route = createFileRoute("/_authenticated/cockpit")({
  component: CockpitPage,
});

const TODAY = () => new Date().toISOString().slice(0, 10);

function Tile({
  to, icon: Icon, label, value, sub, tone = "default",
}: {
  to?: string;
  icon: typeof CheckSquare;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "default" | "warn" | "muted";
}) {
  const toneClass =
    tone === "warn" ? "text-destructive"
    : tone === "muted" ? "text-muted-foreground"
    : "text-foreground";

  const inner = (
    <div className="aspect-square rounded-lg border bg-card p-3 flex flex-col justify-between hover:bg-accent/40 transition-colors h-full">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground truncate ml-1">{label}</span>
      </div>
      <div className={`text-2xl font-semibold tabular-nums leading-none ${toneClass}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground line-clamp-2 min-h-[1.5em]">{sub}</div>
    </div>
  );
  return to ? <Link to={to} className="block">{inner}</Link> : inner;
}

function CockpitPage() {
  const { t } = useI18n();

  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  const { data: todos = [] } = useQuery({
    queryKey: ["cockpit", "todos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("todos").select("id,title,status,due_at")
        .neq("status", "done");
      return data ?? [];
    },
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["cockpit", "notes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notes").select("id,title,updated_at")
        .order("updated_at", { ascending: false }).limit(3);
      return data ?? [];
    },
  });

  const { data: routines = [] } = useQuery({
    queryKey: ["cockpit", "routines"],
    queryFn: async () => {
      const { data } = await supabase.from("routines").select("id,name,steps,frequency").eq("frequency", "daily");
      return (data ?? []).map((r) => ({
        ...r, steps: Array.isArray(r.steps) ? (r.steps as string[]) : [],
      }));
    },
  });

  const { data: runs = [] } = useQuery({
    queryKey: ["cockpit", "runs", TODAY()],
    queryFn: async () => {
      const { data } = await supabase
        .from("routine_runs").select("routine_id,completed_steps").eq("run_date", TODAY());
      return (data ?? []).map((r) => ({
        ...r, completed_steps: Array.isArray(r.completed_steps) ? (r.completed_steps as number[]) : [],
      }));
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["cockpit", "projects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects").select("id,name,status,risk_level,updated_at")
        .in("status", ["active", "draft"]);
      return data ?? [];
    },
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ["cockpit", "meetings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("meetings").select("id,title,meeting_date")
        .gte("meeting_date", todayStart)
        .order("meeting_date", { ascending: true }).limit(3);
      return data ?? [];
    },
  });

  const { data: diagrams = [] } = useQuery({
    queryKey: ["cockpit", "diagrams"],
    queryFn: async () => {
      const { data } = await supabase.from("diagrams").select("id,title").limit(50);
      return data ?? [];
    },
  });

  const todayTodos = todos.filter((x) => x.due_at && isToday(parseISO(x.due_at)));
  const overdue = todos.filter((x) => x.due_at && isPast(parseISO(x.due_at)) && !isToday(parseISO(x.due_at)));
  const meetingsToday = meetings.filter((m) => {
    const d = parseISO(m.meeting_date);
    return d.toISOString() >= todayStart && d.toISOString() <= todayEnd;
  });
  const nextMeeting = meetings[0];

  const routineDone = routines.reduce((acc, r) => {
    const run = runs.find((x) => x.routine_id === r.id);
    const done = run?.completed_steps.length ?? 0;
    return acc + (r.steps.length > 0 && done === r.steps.length ? 1 : 0);
  }, 0);

  const highRiskProject = projects.find((p) => p.risk_level === "critical" || p.risk_level === "high");

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("cockpit.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("cockpit.subtitle")} · {format(new Date(), "EEEE d MMMM")}</p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <Tile
          to="/todos" icon={CheckSquare} label={t("cockpit.todayTodos")}
          value={todayTodos.length}
          sub={todayTodos[0]?.title ?? t("cockpit.empty")}
        />
        <Tile
          to="/todos" icon={AlertTriangle} label={t("cockpit.overdue")}
          value={overdue.length}
          tone={overdue.length > 0 ? "warn" : "default"}
          sub={overdue[0]?.title ?? t("cockpit.empty")}
        />
        <Tile
          to="/routines" icon={Repeat} label={t("cockpit.routines")}
          value={`${routineDone}/${routines.length}`}
          sub={routines[0]?.name ?? t("cockpit.empty")}
        />
        <Tile
          to="/notes" icon={FileText} label={t("cockpit.notes")}
          value={notes.length}
          sub={notes[0]?.title ?? t("cockpit.empty")}
        />
        <Tile
          to="/projects" icon={FolderKanban} label={t("cockpit.projects")}
          value={projects.length}
          sub={highRiskProject ? `⚠ ${highRiskProject.name}` : (projects[0]?.name ?? t("cockpit.empty"))}
          tone={highRiskProject ? "warn" : "default"}
        />
        <Tile
          to="/meetings" icon={CalendarClock} label={t("cockpit.meetings")}
          value={meetingsToday.length}
          sub={nextMeeting ? `${nextMeeting.title} · ${format(parseISO(nextMeeting.meeting_date), "dd/MM HH:mm")}` : t("cockpit.empty")}
        />
        <Tile
          to="/diagrams" icon={GitBranch} label={t("cockpit.diagrams")}
          value={diagrams.length}
          sub={diagrams[0]?.title ?? t("cockpit.empty")}
        />
        <Tile
          to="/feeds" icon={ShieldAlert} label={t("cockpit.cve")}
          value="—" sub={t("cockpit.soon")} tone="muted"
        />
        <Tile
          to="/feeds" icon={Rss} label={t("cockpit.feeds")}
          value="—" sub={t("cockpit.soon")} tone="muted"
        />
        <Tile
          to="/tips" icon={Terminal} label={t("cockpit.tip")}
          value="—" sub={t("cockpit.soon")} tone="muted"
        />
        <Tile
          to="/bookmarks" icon={Bookmark} label={t("cockpit.bookmarks")}
          value="—" sub={t("cockpit.soon")} tone="muted"
        />
        <Tile
          icon={Twitter} label={t("cockpit.x")}
          value="—" sub={t("cockpit.soon")} tone="muted"
        />
        <Tile
          to="/team" icon={Users} label={t("cockpit.team")}
          value="" sub={t("cockpit.open")} tone="muted"
        />
      </div>
    </div>
  );
}
