import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, FileText, LayoutTemplate, Link2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TemplateGalleryDialog } from "@/components/TemplateGalleryDialog";
import type { TemplateRole } from "@/lib/note-templates";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({
    meta: [
      { title: "Notes — TaskX" },
      { name: "description", content: "Markdown notes in TaskX: capture research, runbooks and investigation findings with full-text search, tags and bidirectional [[wiki]] links." },
      { property: "og:title", content: "Notes — TaskX" },
      { property: "og:description", content: "Markdown notes in TaskX: capture research, runbooks and investigation findings with full-text search, tags and bidirectional [[wiki]] links." },
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

// Extract all [[wiki-style]] link targets (case-insensitive titles) from a note.
const WIKI_RE = /\[\[([^\]]+)\]\]/g;
function extractWikiLinks(content: string): string[] {
  const out = new Set<string>();
  for (const m of content.matchAll(WIKI_RE)) out.add(m[1].trim().toLowerCase());
  return [...out];
}

// Replace [[Title]] with markdown links pointing to a custom scheme we intercept.
function rewriteWikiLinks(content: string, titleToId: Map<string, string>): string {
  return content.replace(WIKI_RE, (_, raw: string) => {
    const key = raw.trim().toLowerCase();
    const id = titleToId.get(key);
    if (id) return `[${raw.trim()}](taskx-note://${id})`;
    return `[${raw.trim()}](taskx-note://__missing__)`;
  });
}

function NotesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [search, setSearch] = useState("");
  const [tplOpen, setTplOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile-role"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("profile_type").maybeSingle();
      return data;
    },
  });
  const profileRole = (profile?.profile_type as TemplateRole | null) ?? null;

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

  // Title lookup for wiki-link resolution
  const titleToId = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of notes) m.set((n.title || "").trim().toLowerCase(), n.id);
    return m;
  }, [notes]);

  // Backlinks for selected note
  const backlinks = useMemo(() => {
    if (!selected) return [] as Note[];
    const target = (selected.title || "").trim().toLowerCase();
    if (!target) return [];
    return notes.filter((n) => n.id !== selected.id && extractWikiLinks(n.content).includes(target));
  }, [selected, notes]);

  const create = useMutation({
    mutationFn: async (init?: { title?: string; content?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("notes")
        .insert({ user_id: user.id, title: init?.title ?? "Untitled", content: init?.content ?? "" })
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
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={() => create.mutate(undefined)} disabled={create.isPending}>
              <Plus className="h-4 w-4" /> {t("notes.new")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setTplOpen(true)} title="New from template">
              <LayoutTemplate className="h-4 w-4" />
            </Button>
          </div>
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
            titleToId={titleToId}
            backlinks={backlinks}
            onNavigateToNote={(id) => { setSelectedId(id); setMode("preview"); }}
            onChange={(patch) => update.mutate({ id: selected.id, patch })}
            onDelete={() => {
              remove.mutate(selected.id);
              setSelectedId(null);
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            <FileText className="h-4 w-4 mr-2" /> {t("common.empty")}
          </div>
        )}
      </section>

      <TemplateGalleryDialog
        open={tplOpen}
        onOpenChange={setTplOpen}
        defaultRole={profileRole}
        onPick={({ title, body }) => {
          setTplOpen(false);
          create.mutate({ title, content: body });
        }}
      />
    </div>
  );
}

function Editor({
  note,
  mode,
  setMode,
  titleToId,
  backlinks,
  onNavigateToNote,
  onChange,
  onDelete,
}: {
  note: Note;
  mode: "edit" | "preview";
  setMode: (m: "edit" | "preview") => void;
  titleToId: Map<string, string>;
  backlinks: Note[];
  onNavigateToNote: (id: string) => void;
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

  const rendered = useMemo(() => rewriteWikiLinks(content || "*Empty*", titleToId), [content, titleToId]);

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
          placeholder={`${t("notes.contentPh")}\n\nTip: link other notes with [[Note title]]`}
          className="flex-1 resize-none border-0 rounded-none focus-visible:ring-0 font-mono text-sm leading-relaxed p-6"
        />
      ) : (
        <div className="flex-1 overflow-auto p-6">
          <article className="markdown text-sm leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => {
                  if (href?.startsWith("taskx-note://")) {
                    const id = href.slice("taskx-note://".length);
                    if (id === "__missing__") {
                      return (
                        <span className="px-1 rounded bg-destructive/10 text-destructive text-[0.9em]" title="No matching note">
                          {children}
                        </span>
                      );
                    }
                    return (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); onNavigateToNote(id); }}
                        className="px-1 rounded bg-primary/10 text-primary hover:bg-primary/20 text-[0.9em]"
                      >
                        {children}
                      </button>
                    );
                  }
                  return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
                },
              }}
            >
              {rendered}
            </ReactMarkdown>
          </article>
          {backlinks.length > 0 && (
            <div className="mt-8 border-t pt-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <Link2 className="h-3 w-3" /> Backlinks ({backlinks.length})
              </div>
              <ul className="space-y-1">
                {backlinks.map((b) => (
                  <li key={b.id}>
                    <button
                      onClick={() => onNavigateToNote(b.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      {b.title || "Untitled"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
