import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Star, Copy, Terminal } from "lucide-react";

type Tip = {
  id: string;
  title: string;
  command: string | null;
  explanation: string | null;
  category: string;
  tags: string[];
  favorite: boolean;
};

export const Route = createFileRoute("/_authenticated/tips")({
  head: () => ({
    meta: [
      { title: "Tips — TaskX" },
      { name: "description", content: "Security tips and command snippets in TaskX: save, tag and quickly copy reusable one-liners for your daily work." },
      { property: "og:title", content: "Tips — TaskX" },
      { property: "og:description", content: "Security tips and command snippets in TaskX: save, tag and quickly copy reusable one-liners for your daily work." },
      { property: "og:url", content: "https://taskxx.lovable.app/tips" },
    ],
    links: [{ rel: "canonical", href: "https://taskxx.lovable.app/tips" }],
  }),
  component: TipsPage,
});

function TipsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [favOnly, setFavOnly] = useState(false);

  const { data: tips = [], isLoading } = useQuery({
    queryKey: ["tips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tips").select("*").order("favorite", { ascending: false }).order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Tip[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tips").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tips"] }),
  });

  const toggleFav = useMutation({
    mutationFn: async ({ id, favorite }: { id: string; favorite: boolean }) => {
      const { error } = await supabase.from("tips").update({ favorite }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tips"] }),
  });

  const filtered = tips.filter((x) => {
    if (favOnly && !x.favorite) return false;
    if (search) {
      const q = search.toLowerCase();
      return x.title.toLowerCase().includes(q)
        || (x.command ?? "").toLowerCase().includes(q)
        || (x.explanation ?? "").toLowerCase().includes(q)
        || x.tags.some((tg) => tg.toLowerCase().includes(q));
    }
    return true;
  });

  const copyCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    toast.success(t("tips.copied"));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-8">
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("tips.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tips.length} tips</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> {t("tips.new")}
        </Button>
      </div>

      {showForm && <TipForm onDone={() => setShowForm(false)} />}

      <div className="flex items-center gap-2 mb-4">
        <Input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t("common.search")} className="h-8 text-xs max-w-xs"
        />
        <Button
          size="sm" variant={favOnly ? "default" : "outline"}
          onClick={() => setFavOnly((v) => !v)} className="h-8 text-xs"
        >
          <Star className="h-3.5 w-3.5" /> {t("tips.favorites")}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">{t("tips.empty")}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {filtered.map((x) => (
            <li key={x.id} className="rounded-lg border bg-card p-4 flex flex-col">
              <div className="flex items-start gap-2 mb-2">
                <Terminal className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="text-sm font-medium flex-1">{x.title}</div>
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{x.category}</Badge>
                <Button
                  variant="ghost" size="icon" className="h-6 w-6"
                  aria-label={x.favorite ? `Unstar ${x.title}` : `Star ${x.title}`}
                  onClick={() => toggleFav.mutate({ id: x.id, favorite: !x.favorite })}
                >
                  <Star className={`h-3.5 w-3.5 ${x.favorite ? "fill-primary text-primary" : ""}`} />
                </Button>
              </div>
              {x.command && (
                <div className="relative bg-muted rounded-md p-3 mb-2 group">
                  <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">{x.command}</pre>
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100"
                    aria-label={`Copy command for ${x.title}`}
                    onClick={() => copyCmd(x.command!)}
                  ><Copy className="h-3 w-3" /></Button>
                </div>
              )}
              {x.explanation && (
                <p className="text-xs text-muted-foreground flex-1">{x.explanation}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {x.tags.map((tg) => (
                  <span key={tg} className="text-[10px] text-muted-foreground">#{tg}</span>
                ))}
                <Button
                  variant="ghost" size="icon" className="h-6 w-6 ml-auto"
                  aria-label={`Delete ${x.title}`}
                  onClick={() => { if (confirm(t("tips.deleteConfirm"))) remove.mutate(x.id); }}
                ><Trash2 className="h-3 w-3" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TipForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [command, setCommand] = useState("");
  const [explanation, setExplanation] = useState("");
  const [category, setCategory] = useState("general");
  const [tags, setTags] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("tips").insert({
        user_id: user.id, title,
        command: command || null,
        explanation: explanation || null,
        category: category || "general",
        tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tips"] });
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="rounded-lg border bg-card p-4 mb-4 space-y-3">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("tips.titlePh")} />
      <Textarea value={command} onChange={(e) => setCommand(e.target.value)} placeholder={t("tips.commandPh")} rows={2} className="font-mono text-xs" />
      <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder={t("tips.explanationPh")} rows={3} />
      <div className="grid grid-cols-2 gap-2">
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("tips.categoryPh")} />
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t("tips.tagsPh")} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone}>{t("common.cancel")}</Button>
        <Button size="sm" onClick={() => create.mutate()} disabled={!title || create.isPending}>{t("common.save")}</Button>
      </div>
    </div>
  );
}
