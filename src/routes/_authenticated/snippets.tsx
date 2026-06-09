import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus, Trash2, Copy, Star, Terminal, Sparkles, Send, Save, Loader2 } from "lucide-react";
import { generateSnippet } from "@/lib/snippets-ai.functions";

type ChatMsg = { role: "user" | "assistant"; content: string; code?: string | null };

export const Route = createFileRoute("/_authenticated/snippets")({
  head: () => ({
    meta: [
      { title: "Snippets — TaskX" },
      { name: "description", content: "Personal snippet manager for cyber daily commands: nmap, ffuf, kubectl, sqlmap and any reusable payload, one click to copy." },
      { property: "og:title", content: "Snippets — TaskX" },
      { property: "og:description", content: "Personal snippet manager for cyber daily commands and payloads." },
      { property: "og:url", content: "https://taskxx.lovable.app/snippets" },
    ],
    links: [{ rel: "canonical", href: "https://taskxx.lovable.app/snippets" }],
  }),
  component: SnippetsPage,
});

type Snippet = {
  id: string;
  title: string;
  command: string;
  description: string | null;
  language: string;
  tags: string[];
  favorite: boolean;
  updated_at: string;
};

const LANGUAGES = ["bash", "powershell", "python", "sql", "yaml", "json", "other"];

function SnippetsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: snippets = [] } = useQuery({
    queryKey: ["snippets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("snippets")
        .select("*")
        .order("favorite", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Snippet[];
    },
  });

  const selected = snippets.find((s) => s.id === selectedId) ?? snippets[0] ?? null;

  const filtered = search.trim()
    ? snippets.filter((s) =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.command.toLowerCase().includes(search.toLowerCase()) ||
        s.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase())),
      )
    : snippets;

  const create = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("snippets")
        .insert({ user_id: user.id, title: "Untitled", command: "", language: "bash" })
        .select()
        .single();
      if (error) throw error;
      return data as Snippet;
    },
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ["snippets"] });
      setSelectedId(s.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<Snippet> & { id: string }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from("snippets").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["snippets"] }),
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("snippets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["snippets"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("snip.copied"));
    } catch {
      toast.error("Clipboard error");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Terminal className="h-5 w-5" /> {t("snip.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("snip.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <AIAssistant defaultLanguage={selected?.language ?? "bash"} />
          <Button size="sm" onClick={() => create.mutate()} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> {t("snip.new")}
          </Button>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-[280px,1fr] gap-6 h-[calc(100vh-220px)]">
        {/* List */}
        <div className="border rounded-lg flex flex-col min-h-0">
          <div className="p-2 border-b">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("snip.search")}
              className="h-8 text-xs"
            />
          </div>
          <ul className="flex-1 overflow-auto divide-y divide-border">
            {filtered.length === 0 ? (
              <li className="p-4 text-xs text-muted-foreground text-center">{t("snip.empty")}</li>
            ) : (
              filtered.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setSelectedId(s.id)}
                    className={`w-full text-left px-3 py-2 transition-colors ${
                      selected?.id === s.id ? "bg-accent" : "hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {s.favorite && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                      <span className="text-sm truncate flex-1">{s.title}</span>
                      <Badge variant="outline" className="h-4 text-[9px] px-1">{s.language}</Badge>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Detail */}
        <div className="border rounded-lg p-5 overflow-auto">
          {!selected ? (
            <p className="text-sm text-muted-foreground text-center py-12">{t("snip.pick")}</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  value={selected.title}
                  onChange={(e) => update.mutate({ id: selected.id, title: e.target.value })}
                  className="text-base font-medium border-0 px-0 focus-visible:ring-0 shadow-none h-auto"
                />
                <button
                  onClick={() => update.mutate({ id: selected.id, favorite: !selected.favorite })}
                  className="text-muted-foreground hover:text-amber-500"
                  title="Favorite"
                >
                  <Star className={`h-4 w-4 ${selected.favorite ? "text-amber-500 fill-amber-500" : ""}`} />
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm(t("snip.confirmDelete"))) remove.mutate(selected.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">{t("snip.language")}</label>
                <select
                  value={selected.language}
                  onChange={(e) => update.mutate({ id: selected.id, language: e.target.value })}
                  className="text-xs bg-background border rounded px-2 py-1"
                >
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <Input
                  value={selected.tags.join(", ")}
                  onChange={(e) => update.mutate({
                    id: selected.id,
                    tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                  })}
                  placeholder={t("snip.tagsPh")}
                  className="h-7 text-xs flex-1"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-muted-foreground">{t("snip.command")}</label>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1" onClick={() => copy(selected.command)}>
                    <Copy className="h-3 w-3" /> {t("snip.copy")}
                  </Button>
                </div>
                <Textarea
                  value={selected.command}
                  onChange={(e) => update.mutate({ id: selected.id, command: e.target.value })}
                  className="font-mono text-xs min-h-[160px]"
                  placeholder="nmap -sV -p- target.com"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">{t("snip.description")}</label>
                <Textarea
                  value={selected.description ?? ""}
                  onChange={(e) => update.mutate({ id: selected.id, description: e.target.value })}
                  className="text-sm min-h-[80px]"
                  placeholder={t("snip.descriptionPh")}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
