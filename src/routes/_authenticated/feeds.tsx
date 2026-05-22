import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, Eye, EyeOff, ShieldAlert, RefreshCw, Rss, Power } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Switch } from "@/components/ui/switch";

type Source = "cve" | "cti" | "x" | "rss" | "other";
type Severity = "info" | "low" | "medium" | "high" | "critical";

type FeedItem = {
  id: string;
  source: Source;
  severity: Severity;
  title: string;
  summary: string | null;
  url: string | null;
  external_id: string | null;
  tags: string[];
  published_at: string;
  read: boolean;
};

export const Route = createFileRoute("/_authenticated/feeds")({
  component: FeedsPage,
});

const SEV_VARIANT: Record<Severity, "default" | "secondary" | "destructive" | "outline"> = {
  info: "outline",
  low: "secondary",
  medium: "secondary",
  high: "default",
  critical: "destructive",
};

const SOURCES: Source[] = ["cve", "cti", "x", "rss", "other"];
const SEVERITIES: Severity[] = ["info", "low", "medium", "high", "critical"];

function FeedsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterSource, setFilterSource] = useState<Source | "all">("all");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["feed_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feed_items").select("*").order("published_at", { ascending: false });
      if (error) throw error;
      return data as FeedItem[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feed_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed_items"] }),
  });

  const toggleRead = useMutation({
    mutationFn: async ({ id, read }: { id: string; read: boolean }) => {
      const { error } = await supabase.from("feed_items").update({ read }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed_items"] }),
  });

  const filtered = items.filter((x) => {
    if (filterSource !== "all" && x.source !== filterSource) return false;
    if (unreadOnly && x.read) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("feeds.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{items.filter((i) => !i.read).length} unread / {items.length}</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> {t("feeds.new")}
        </Button>
      </div>

      {showForm && <FeedForm onDone={() => setShowForm(false)} />}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button
          size="sm" variant={filterSource === "all" ? "default" : "outline"}
          onClick={() => setFilterSource("all")} className="h-7 text-xs"
        >{t("common.all")}</Button>
        {SOURCES.map((s) => (
          <Button
            key={s} size="sm"
            variant={filterSource === s ? "default" : "outline"}
            onClick={() => setFilterSource(s)} className="h-7 text-xs"
          >{t(`feeds.source.${s}` as TKey)}</Button>
        ))}
        <Button
          size="sm" variant={unreadOnly ? "default" : "outline"}
          onClick={() => setUnreadOnly((v) => !v)} className="h-7 text-xs ml-auto"
        >{t("feeds.unreadOnly")}</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">{t("feeds.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((x) => (
            <li
              key={x.id}
              className={`rounded-lg border bg-card p-4 ${x.read ? "opacity-60" : ""}`}
            >
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase">
                      {t(`feeds.source.${x.source}` as TKey)}
                    </Badge>
                    <Badge variant={SEV_VARIANT[x.severity]} className="h-5 px-1.5 text-[10px]">
                      {t(`feeds.sev.${x.severity}` as TKey)}
                    </Badge>
                    {x.external_id && <span className="text-[10px] font-mono text-muted-foreground">{x.external_id}</span>}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {formatDistanceToNow(new Date(x.published_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="text-sm font-medium">{x.title}</div>
                  {x.summary && <div className="text-xs text-muted-foreground mt-1 line-clamp-3">{x.summary}</div>}
                  <div className="flex items-center gap-2 mt-2">
                    {x.url && (
                      <a href={x.url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      ><ExternalLink className="h-3 w-3" /> {new URL(x.url).hostname}</a>
                    )}
                    {x.tags.map((tg) => (
                      <span key={tg} className="text-[10px] text-muted-foreground">#{tg}</span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => toggleRead.mutate({ id: x.id, read: !x.read })}
                    title={x.read ? t("feeds.markUnread") : t("feeds.markRead")}
                  >
                    {x.read ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => { if (confirm(t("feeds.deleteConfirm"))) remove.mutate(x.id); }}
                  ><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FeedForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [url, setUrl] = useState("");
  const [externalId, setExternalId] = useState("");
  const [source, setSource] = useState<Source>("cve");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [tags, setTags] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("feed_items").insert({
        user_id: user.id,
        title, summary: summary || null, url: url || null,
        external_id: externalId || null,
        source, severity,
        tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed_items"] });
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="rounded-lg border bg-card p-4 mb-4 space-y-3">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("feeds.titlePh")} />
      <div className="grid grid-cols-2 gap-2">
        <Select value={source} onValueChange={(v) => setSource(v as Source)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {SOURCES.map((s) => <SelectItem key={s} value={s}>{t(`feeds.source.${s}` as TKey)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{t(`feeds.sev.${s}` as TKey)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Input value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder={t("feeds.extIdPh")} />
      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t("feeds.urlPh")} />
      <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={t("feeds.summaryPh")} rows={3} />
      <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t("feeds.tagsPh")} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone}>{t("common.cancel")}</Button>
        <Button size="sm" onClick={() => create.mutate()} disabled={!title || create.isPending}>{t("common.save")}</Button>
      </div>
    </div>
  );
}
