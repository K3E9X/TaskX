import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { Trash2, Plus } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";

export const Route = createFileRoute("/_authenticated/todos")({
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

const PRIO_ORDER: Record<Priority, number> = { urgent: 0, high: 1, med: 2, low: 3 };

const PRIO_VARIANT: Record<Priority, "default" | "secondary" | "destructive" | "outline"> = {
  urgent: "destructive",
  high: "default",
  med: "secondary",
  low: "outline",
};

function TodosPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Status | "all">("all");

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

  const sortFn = (a: Todo, b: Todo) => PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority];
  const byStatus: Record<Status, Todo[]> = {
    todo: todos.filter((x) => x.status === "todo").sort(sortFn),
    doing: todos.filter((x) => x.status === "doing").sort(sortFn),
    done: todos.filter((x) => x.status === "done").sort(sortFn),
  };
  const filtered = todos.filter((x) => filter !== "all" && x.status === filter).sort(sortFn);

  const rowHandlers = (todo: Todo) => ({
    onToggle: () =>
      update.mutate({
        id: todo.id,
        patch: { status: todo.status === "done" ? "todo" : "done" },
      }),
    onStatus: (status: Status) => update.mutate({ id: todo.id, patch: { status } }),
    onPriority: (priority: Priority) => update.mutate({ id: todo.id, patch: { priority } }),
    onDelete: () => remove.mutate(todo.id),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("todos.title")}</h1>
        <div className="text-xs text-muted-foreground">{todos.length}</div>
      </div>

      <NewTodoForm onCreate={(p) => create.mutate(p)} pending={create.isPending} />

      <div className="mt-6 flex gap-1 text-xs">
        {(["all", "todo", "doing", "done"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              filter === s ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? t("common.all") : t(`todos.status.${s}` as TKey)}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="mt-3 rounded-lg border bg-card p-4 text-sm text-muted-foreground">{t("common.loading")}</div>
      )}

      {!isLoading && filter === "all" && (
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

      {!isLoading && filter !== "all" && (
        <div className="mt-3 divide-y divide-border border rounded-lg bg-card">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">{t("common.empty")}</div>
          )}
          {filtered.map((todo) => (
            <TodoRow key={todo.id} todo={todo} {...rowHandlers(todo)} />
          ))}
        </div>
      )}
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
          <div className="flex gap-2 flex-wrap">
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
  onDelete,
}: {
  todo: Todo;
  onToggle: () => void;
  onStatus: (s: Status) => void;
  onPriority: (p: Priority) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const overdue = todo.due_at && todo.status !== "done" && isPast(parseISO(todo.due_at));
  return (
    <div className="group flex items-start gap-3 p-3 hover:bg-accent/40 transition-colors">
      <Checkbox checked={todo.status === "done"} onCheckedChange={onToggle} className="mt-1" />
      <div className="flex-1 min-w-0">
        <div className={`text-sm ${todo.status === "done" ? "line-through text-muted-foreground" : ""}`}>
          {todo.title}
        </div>
        {todo.description && (
          <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{todo.description}</div>
        )}
        <div className="mt-1.5 flex items-center gap-2 text-[10px]">
          <Badge variant={PRIO_VARIANT[todo.priority]} className="h-5 px-1.5 text-[10px]">
            {t(`todos.prio.${todo.priority}` as TKey)}
          </Badge>
          {todo.due_at && (
            <span className={`text-[10px] ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
              {overdue ? t("todos.overdue") + " · " : ""}{format(parseISO(todo.due_at), "dd MMM HH:mm")}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
