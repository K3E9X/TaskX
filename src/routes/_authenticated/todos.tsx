import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Search, Clock, CalendarDays, AlertTriangle, CheckCircle2, LayoutGrid, X } from "lucide-react";
import {
  format, isPast, parseISO, isToday, isThisWeek, addDays, startOfDay, endOfDay, differenceInCalendarDays,
} from "date-fns";

export const Route = createFileRoute("/_authenticated/todos")({
  head: () => ({
    meta: [
      { title: "Todos — TaskX" },
      { name: "description", content: "To-dos and tasks in TaskX: priorities, due dates, projects and statuses for every item in your security backlog." },
      { property: "og:title", content: "Todos — TaskX" },
      { property: "og:description", content: "To-dos and tasks in TaskX: priorities, due dates, projects and statuses for every item in your security backlog." },
      { property: "og:url", content: "https://taskxx.lovable.app/todos" },
    ],
    links: [{ rel: "canonical", href: "https://taskxx.lovable.app/todos" }],
  }),
  component: TodosPage,
});

type Status = "todo" | "doing" | "done";
type Priority = "low" | "med" | "high" | "urgent";

type Todo = {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  due_at: string | null;
  tags: string[];
  created_at: string;
};

type View = "board" | "today" | "overdue" | "upcoming" | "done";

const PRIO_ORDER: Record<Priority, number> = { urgent: 0, high: 1, med: 2, low: 3 };

const PRIO_VARIANT: Record<Priority, "default" | "secondary" | "destructive" | "outline"> = {
  urgent: "destructive",
  high: "default",
  med: "secondary",
  low: "outline",
};

const PRIO_DOT: Record<Priority, string> = {
  urgent: "bg-destructive",
  high: "bg-amber-500",
  med: "bg-primary/70",
  low: "bg-muted-foreground/40",
};

function TodosPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [view, setView] = useState<View>("board");
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Todo[];
    },
  });

  const create = useMutation({
    mutationFn: async (payload: { title: string; description?: string; priority: Priority; due_at: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("todos").insert({
        user_id: user.id,
        title: payload.title,
        description: payload.description || null,
        priority: payload.priority,
        due_at: payload.due_at,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todos"] }),
    onError: (e) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Todo> }) => {
      const { error } = await supabase.from("todos").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todos"] }),
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todos"] }),
    onError: (e) => toast.error(e.message),
  });

  // Derived data
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const t of todos) for (const tag of t.tags ?? []) set.add(tag);
    return Array.from(set).sort();
  }, [todos]);

  const stats = useMemo(() => {
    const total = todos.length;
    const today = todos.filter((x) => x.status !== "done" && x.due_at && isToday(parseISO(x.due_at))).length;
    const overdue = todos.filter((x) => x.status !== "done" && x.due_at && isPast(parseISO(x.due_at)) && !isToday(parseISO(x.due_at))).length;
    const doneWeek = todos.filter((x) => x.status === "done" && isThisWeek(parseISO(x.created_at), { weekStartsOn: 1 })).length;
    const open = todos.filter((x) => x.status !== "done").length;
    const pct = total ? Math.round(((total - open) / total) * 100) : 0;
    return { total, today, overdue, doneWeek, pct, open };
  }, [todos]);

  const matchesFilters = (x: Todo) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!x.title.toLowerCase().includes(q) && !(x.description ?? "").toLowerCase().includes(q)) return false;
    }
    if (activeTag && !(x.tags ?? []).includes(activeTag)) return false;
    return true;
  };

  const sortFn = (a: Todo, b: Todo) => {
    if (a.due_at && b.due_at) return parseISO(a.due_at).getTime() - parseISO(b.due_at).getTime();
    if (a.due_at) return -1;
    if (b.due_at) return 1;
    return PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority];
  };

  const visible = todos.filter(matchesFilters);
  const byStatus: Record<Status, Todo[]> = {
    todo: visible.filter((x) => x.status === "todo").sort((a, b) => PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority]),
    doing: visible.filter((x) => x.status === "doing").sort((a, b) => PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority]),
    done: visible.filter((x) => x.status === "done").sort(sortFn),
  };

  const todayList = visible.filter((x) => x.status !== "done" && x.due_at && isToday(parseISO(x.due_at))).sort(sortFn);
  const overdueList = visible.filter((x) => x.status !== "done" && x.due_at && isPast(parseISO(x.due_at)) && !isToday(parseISO(x.due_at))).sort(sortFn);
  const upcomingList = visible.filter((x) => {
    if (x.status === "done" || !x.due_at) return false;
    const d = parseISO(x.due_at);
    return d > endOfDay(new Date()) && d <= addDays(startOfDay(new Date()), 7);
  }).sort(sortFn);
  const doneList = visible.filter((x) => x.status === "done").sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime());

  const rowHandlers = (todo: Todo) => ({
    onToggle: () =>
      update.mutate({
        id: todo.id,
        patch: { status: todo.status === "done" ? "todo" : "done" },
      }),
    onStatus: (status: Status) => update.mutate({ id: todo.id, patch: { status } }),
    onPriority: (priority: Priority) => update.mutate({ id: todo.id, patch: { priority } }),
    onRename: (title: string) => update.mutate({ id: todo.id, patch: { title } }),
    onSnooze: (days: number) => {
      const base = todo.due_at ? parseISO(todo.due_at) : new Date();
      const next = addDays(base, days);
      update.mutate({ id: todo.id, patch: { due_at: next.toISOString() } });
    },
    onDelete: () => remove.mutate(todo.id),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("todos.title")}</h1>
        <div className="text-xs text-muted-foreground tabular-nums">{stats.open} / {stats.total}</div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
        <StatCard icon={LayoutGrid} label="Open" value={stats.open} tone="default" />
        <StatCard icon={CalendarDays} label="Today" value={stats.today} tone="primary" onClick={() => setView("today")} active={view === "today"} />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} tone="destructive" onClick={() => setView("overdue")} active={view === "overdue"} />
        <StatCard icon={CheckCircle2} label="Done / week" value={stats.doneWeek} tone="emerald" />
        <StatCard icon={Clock} label="Completion" value={`${stats.pct}%`} tone="default" progress={stats.pct} />
      </div>

      <NewTodoForm onCreate={(p) => create.mutate(p)} pending={create.isPending} />

      {/* Search + views */}
      <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="Search…  (press /)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1 text-xs">
          {(
            [
              ["board", "Board"],
              ["today", `Today${stats.today ? ` · ${stats.today}` : ""}`],
              ["overdue", `Overdue${stats.overdue ? ` · ${stats.overdue}` : ""}`],
              ["upcoming", "Upcoming"],
              ["done", t("todos.status.done")],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v as View)}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                view === v ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tag chips */}
      {allTags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Tags</span>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                activeTag === tag ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              #{tag}
            </button>
          ))}
          {activeTag && (
            <button onClick={() => setActiveTag(null)} className="text-[10px] text-muted-foreground hover:text-foreground">
              clear
            </button>
          )}
        </div>
      )}

      {isLoading && (
        <div className="mt-3 rounded-lg border bg-card p-4 text-sm text-muted-foreground">{t("common.loading")}</div>
      )}

      {!isLoading && view === "board" && (
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {(["todo", "doing", "done"] as Status[]).map((col) => (
            <div key={col} className="rounded-lg border bg-card flex flex-col min-h-[200px]">
              <div className="flex items-center justify-between px-4 py-2.5 border-b">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${
                    col === "todo" ? "bg-muted-foreground/60" :
                    col === "doing" ? "bg-primary" : "bg-emerald-500"
                  }`} />
                  <h3 className="text-xs font-medium uppercase tracking-wider">{t(`todos.status.${col}` as TKey)}</h3>
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums">{byStatus[col].length}</span>
              </div>
              <div className="flex-1 divide-y divide-border">
                {byStatus[col].length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">{t("common.empty")}</div>
                ) : (
                  byStatus[col].map((todo) => (
                    <TodoRow key={todo.id} todo={todo} {...rowHandlers(todo)} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && view !== "board" && (
        <SmartList
          items={
            view === "today" ? todayList :
            view === "overdue" ? overdueList :
            view === "upcoming" ? upcomingList : doneList
          }
          rowHandlers={rowHandlers}
          emptyHint={
            view === "today" ? "Nothing scheduled for today." :
            view === "overdue" ? "No overdue tasks. Nice." :
            view === "upcoming" ? "Nothing in the next 7 days." :
            "No completed tasks yet."
          }
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, tone, onClick, active, progress,
}: {
  icon: typeof Clock;
  label: string;
  value: number | string;
  tone: "default" | "primary" | "destructive" | "emerald";
  onClick?: () => void;
  active?: boolean;
  progress?: number;
}) {
  const toneCls =
    tone === "destructive" ? "text-destructive" :
    tone === "primary" ? "text-primary" :
    tone === "emerald" ? "text-emerald-500" : "text-foreground";
  const Wrapper: React.ElementType = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`relative overflow-hidden rounded-lg border bg-card p-3 text-left transition-colors ${
        onClick ? "hover:bg-accent/40 cursor-pointer" : ""
      } ${active ? "border-primary" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-3.5 w-3.5 ${toneCls}`} />
      </div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${toneCls}`}>{value}</div>
      {typeof progress === "number" && (
        <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
    </Wrapper>
  );
}

function SmartList({
  items, rowHandlers, emptyHint,
}: {
  items: Todo[];
  rowHandlers: (t: Todo) => Omit<React.ComponentProps<typeof TodoRow>, "todo">;
  emptyHint: string;
}) {
  if (items.length === 0) {
    return (
      <div className="mt-3 rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        {emptyHint}
      </div>
    );
  }
  return (
    <div className="mt-3 divide-y divide-border border rounded-lg bg-card">
      {items.map((todo) => (
        <TodoRow key={todo.id} todo={todo} {...rowHandlers(todo)} />
      ))}
    </div>
  );
}

function NewTodoForm({
  onCreate,
  pending,
}: {
  onCreate: (p: { title: string; description?: string; priority: Priority; due_at: string | null }) => void;
  pending: boolean;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("med");
  const [due, setDue] = useState("");
  const [expanded, setExpanded] = useState(false);

  const setQuickDue = (days: number) => {
    const d = addDays(new Date(), days);
    d.setHours(18, 0, 0, 0);
    // datetime-local needs local string
    const pad = (n: number) => String(n).padStart(2, "0");
    setDue(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onCreate({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          due_at: due ? new Date(due).toISOString() : null,
        });
        setTitle("");
        setDescription("");
        setDue("");
        setPriority("med");
        setExpanded(false);
      }}
      className="rounded-lg border bg-card p-3"
    >
      <div className="flex gap-2">
        <Input
          placeholder={t("todos.titlePh")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          className="flex-1"
        />
        <Button type="submit" disabled={pending || !title.trim()} size="sm">
          <Plus className="h-4 w-4" /> {t("common.add")}
        </Button>
      </div>
      {expanded && (
        <div className="mt-3 space-y-2">
          <Textarea
            placeholder={t("todos.descPh")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2 flex-wrap items-center">
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["urgent", "high", "med", "low"] as Priority[]).map((p) => (
                  <SelectItem key={p} value={p}>{t(`todos.prio.${p}` as TKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="datetime-local"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="h-8 w-56 text-xs"
            />
            <div className="flex gap-1">
              {[
                ["Today", 0],
                ["+1d", 1],
                ["+3d", 3],
                ["+1w", 7],
              ].map(([label, d]) => (
                <button
                  key={label as string}
                  type="button"
                  onClick={() => setQuickDue(d as number)}
                  className="rounded-md border px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent/40"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function TodoRow({
  todo,
  onToggle,
  onStatus,
  onPriority,
  onRename,
  onSnooze,
  onDelete,
}: {
  todo: Todo;
  onToggle: () => void;
  onStatus: (s: Status) => void;
  onPriority: (p: Priority) => void;
  onRename: (title: string) => void;
  onSnooze: (days: number) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  useEffect(() => setDraft(todo.title), [todo.title]);

  const overdue = todo.due_at && todo.status !== "done" && isPast(parseISO(todo.due_at)) && !isToday(parseISO(todo.due_at));
  const dueToday = todo.due_at && todo.status !== "done" && isToday(parseISO(todo.due_at));
  const dueLabel = todo.due_at ? (() => {
    const d = parseISO(todo.due_at);
    const diff = differenceInCalendarDays(d, new Date());
    if (diff === 0) return `Today · ${format(d, "HH:mm")}`;
    if (diff === 1) return `Tomorrow · ${format(d, "HH:mm")}`;
    if (diff > 1 && diff < 7) return `${format(d, "EEE")} · ${format(d, "HH:mm")}`;
    if (diff < 0) return `${Math.abs(diff)}d late · ${format(d, "dd MMM")}`;
    return format(d, "dd MMM HH:mm");
  })() : null;

  const commit = () => {
    const v = draft.trim();
    if (v && v !== todo.title) onRename(v);
    setEditing(false);
  };

  return (
    <div className="group flex items-start gap-3 p-3 hover:bg-accent/40 transition-colors">
      <Checkbox checked={todo.status === "done"} onCheckedChange={onToggle} className="mt-1" />
      <span className={`mt-1.5 size-2 rounded-full shrink-0 ${PRIO_DOT[todo.priority]}`} aria-hidden />
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commit(); }
              if (e.key === "Escape") { setDraft(todo.title); setEditing(false); }
            }}
            className="w-full bg-transparent text-sm outline-none border-b border-primary/40"
          />
        ) : (
          <div
            onDoubleClick={() => setEditing(true)}
            className={`text-sm cursor-text ${todo.status === "done" ? "line-through text-muted-foreground" : ""}`}
            title="Double-click to rename"
          >
            {todo.title}
          </div>
        )}
        {todo.description && (
          <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{todo.description}</div>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px]">
          <Badge variant={PRIO_VARIANT[todo.priority]} className="h-5 px-1.5 text-[10px]">
            {t(`todos.prio.${todo.priority}` as TKey)}
          </Badge>
          {dueLabel && (
            <span className={`text-[10px] ${overdue ? "text-destructive" : dueToday ? "text-primary" : "text-muted-foreground"}`}>
              {dueLabel}
            </span>
          )}
          {(todo.tags ?? []).slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] text-muted-foreground">#{tag}</span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {todo.status !== "done" && todo.due_at && (
          <>
            <button
              onClick={() => onSnooze(1)}
              title="Snooze +1 day"
              className="rounded-md border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent/40"
            >
              +1d
            </button>
            <button
              onClick={() => onSnooze(7)}
              title="Snooze +1 week"
              className="rounded-md border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent/40"
            >
              +1w
            </button>
          </>
        )}
        <Select value={todo.status} onValueChange={(v) => onStatus(v as Status)}>
          <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["todo", "doing", "done"] as Status[]).map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{t(`todos.status.${s}` as TKey)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={todo.priority} onValueChange={(v) => onPriority(v as Priority)}>
          <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["urgent", "high", "med", "low"] as Priority[]).map((p) => (
              <SelectItem key={p} value={p} className="text-xs">{t(`todos.prio.${p}` as TKey)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button onClick={onDelete} className="p-1 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
