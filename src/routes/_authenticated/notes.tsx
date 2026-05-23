import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({
    meta: [
      { title: "Notes — TaskX" },
      { name: "description", content: "Markdown notes in TaskX: capture research, runbooks and investigation findings with full-text search and tags." },
      { property: "og:title", content: "Notes — TaskX" },
      { property: "og:description", content: "Markdown notes in TaskX: capture research, runbooks and investigation findings with full-text search and tags." },
      { property: "og:url", content: "https://taskxx.lovable.app/notes" },
    ],
    links: [{ rel: "canonical", href: "https://taskxx.lovable.app/notes" }],
  }),
  component: NotesPage,
});

type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updated_at: string;
};

function NotesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [search, setSearch] = useState("");

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Note[];
    },
  });

  const selected = notes.find((n) => n.id === selectedId) ?? notes[0] ?? null;

  useEffect(() => {
    if (!selectedId && notes[0]) setSelectedId(notes[0].id);
  }, [notes, selectedId]);

  const create = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("notes")
        .insert({ user_id: user.id, title: "Untitled", content: "" })
        .select()
        .single();
      if (error) throw error;
      return data as Note;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      setSelectedId(n.id);
      setMode("edit");
    },
    onError: (e) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Note> }) => {
      const { error } = await supabase.from("notes").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });

  const filtered = notes.filter(
    (n) =>
      !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <h1 className="sr-only">{t("nav.notes")}</h1>
      {/* List */}
      <aside className="w-72 border-r flex flex-col">
        <div className="p-3 border-b space-y-2">
          <Button size="sm" className="w-full" onClick={() => create.mutate()} disabled={create.isPending}>
            <Plus className="h-4 w-4" /> {t("notes.new")}
          </Button>
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="flex-1 overflow-auto">
          {isLoading && <div className="p-3 text-xs text-muted-foreground">{t("common.loading")}</div>}
          {!isLoading && filtered.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">{t("common.empty")}</div>
          )}
          {filtered.map((n) => (
            <button
              key={n.id}
              onClick={() => setSelectedId(n.id)}
              className={`w-full text-left p-3 border-b transition-colors ${
                selected?.id === n.id ? "bg-accent" : "hover:bg-accent/50"
              }`}
            >
              <div className="text-sm font-medium truncate">{n.title || "Untitled"}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(n.updated_at), { addSuffix: true })}
              </div>
              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {n.content.slice(0, 100) || "—"}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Editor */}
      <section className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <Editor
            key={selected.id}
            note={selected}
            mode={mode}
            setMode={setMode}
            onChange={(patch) => update.mutate({ id: selected.id, patch })}
            onDelete={() => {
              if (confirm(t("notes.deleteConfirm"))) {
                remove.mutate(selected.id);
                setSelectedId(null);
              }
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            <FileText className="h-4 w-4 mr-2" /> {t("common.empty")}
          </div>
        )}
      </section>
    </div>
  );
}

function Editor({
  note,
  mode,
  setMode,
  onChange,
  onDelete,
}: {
  note: Note;
  mode: "edit" | "preview";
  setMode: (m: "edit" | "preview") => void;
  onChange: (patch: Partial<Note>) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
  }, [note.id, note.title, note.content]);

  useEffect(() => {
    const tid = setTimeout(() => {
      if (title !== note.title || content !== note.content) {
        onChange({ title, content });
      }
    }, 600);
    return () => clearTimeout(tid);
  }, [title, content]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b p-3 flex items-center gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("notes.titlePh")}
          className="flex-1 border-0 text-lg font-semibold shadow-none focus-visible:ring-0"
        />
        <div className="flex rounded-md border text-xs overflow-hidden">
          <button
            onClick={() => setMode("edit")}
            className={`px-3 py-1 ${mode === "edit" ? "bg-accent" : "text-muted-foreground"}`}
          >{t("notes.edit")}</button>
          <button
            onClick={() => setMode("preview")}
            className={`px-3 py-1 ${mode === "preview" ? "bg-accent" : "text-muted-foreground"}`}
          >{t("notes.preview")}</button>
        </div>
        <Button variant="ghost" size="icon" aria-label="Delete note" onClick={onDelete}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      {mode === "edit" ? (
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("notes.contentPh")}
          className="flex-1 resize-none border-0 rounded-none focus-visible:ring-0 font-mono text-sm leading-relaxed p-6"
        />
      ) : (
        <div className="flex-1 overflow-auto p-6">
          <article className="markdown text-sm leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "*Empty*"}</ReactMarkdown>
          </article>
        </div>
      )}
    </div>
  );
}
