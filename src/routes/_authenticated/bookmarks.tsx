import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, Bookmark as BookmarkIcon } from "lucide-react";
import { OutlookConnectCard } from "@/components/OutlookConnectCard";

type Bookmark = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string;
  tags: string[];
};

export const Route = createFileRoute("/_authenticated/bookmarks")({
  head: () => ({ meta: [{ title: "Bookmarks — TaskX" }] }),
  component: BookmarksPage,
});

function BookmarksPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");

  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookmarks").select("*").order("category", { ascending: true }).order("title", { ascending: true });
      if (error) throw error;
      return data as Bookmark[];
    },
  });

  const categories = useMemo(() => {
    return Array.from(new Set(bookmarks.map((b) => b.category))).sort();
  }, [bookmarks]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookmarks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookmarks"] }),
  });

  const filtered = bookmarks.filter((x) => {
    if (filterCat !== "all" && x.category !== filterCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return x.title.toLowerCase().includes(q)
        || (x.description ?? "").toLowerCase().includes(q)
        || x.url.toLowerCase().includes(q)
        || x.tags.some((tg) => tg.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-8">
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("bookmarks.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{bookmarks.length} links</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> {t("bookmarks.new")}
        </Button>
      </div>

      <div className="mb-6">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Intégrations</h2>
        <OutlookConnectCard />
      </div>

      {showForm && <BookmarkForm onDone={() => setShowForm(false)} />}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t("common.search")} className="h-8 text-xs max-w-xs"
        />
        <Button
          size="sm" variant={filterCat === "all" ? "default" : "outline"}
          onClick={() => setFilterCat("all")} className="h-7 text-xs"
        >{t("common.all")}</Button>
        {categories.map((c) => (
          <Button
            key={c} size="sm"
            variant={filterCat === c ? "default" : "outline"}
            onClick={() => setFilterCat(c)} className="h-7 text-xs"
          >{c}</Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">{t("bookmarks.empty")}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((x) => (
            <li key={x.id} className="rounded-lg border bg-card p-4 flex flex-col">
              <div className="flex items-start gap-2 mb-2">
                <BookmarkIcon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <a
                  href={x.url} target="_blank" rel="noreferrer"
                  className="text-sm font-medium flex-1 hover:underline"
                >{x.title}</a>
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{x.category}</Badge>
              </div>
              <a
                href={x.url} target="_blank" rel="noreferrer"
                className="text-[11px] text-muted-foreground hover:text-primary truncate inline-flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3 shrink-0" /> {(() => { try { return new URL(x.url).hostname; } catch { return x.url; } })()}
              </a>
              {x.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2 flex-1">{x.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {x.tags.map((tg) => (
                  <span key={tg} className="text-[10px] text-muted-foreground">#{tg}</span>
                ))}
                <Button
                  variant="ghost" size="icon" className="h-6 w-6 ml-auto"
                  onClick={() => { if (confirm(t("bookmarks.deleteConfirm"))) remove.mutate(x.id); }}
                ><Trash2 className="h-3 w-3" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BookmarkForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [tags, setTags] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("bookmarks").insert({
        user_id: user.id, title, url,
        description: description || null,
        category: category || "general",
        tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="rounded-lg border bg-card p-4 mb-4 space-y-3">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("bookmarks.titlePh")} />
      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t("bookmarks.urlPh")} />
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("bookmarks.descPh")} rows={2} />
      <div className="grid grid-cols-2 gap-2">
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("bookmarks.categoryPh")} />
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t("bookmarks.tagsPh")} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone}>{t("common.cancel")}</Button>
        <Button size="sm" onClick={() => create.mutate()} disabled={!title || !url || create.isPending}>{t("common.save")}</Button>
      </div>
    </div>
  );
}
