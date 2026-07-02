import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { refreshMyFeeds } from "@/lib/feeds.functions";
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
import { Plus, Trash2, ExternalLink, Eye, EyeOff, ShieldAlert, RefreshCw, Rss, Star, Sparkles, Package } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { matchStackTags } from "@/lib/stack-match";

type Source = "cve" | "cti";
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
  starred: boolean;
  cve_id: string | null;
  epss_score: number | null;
  epss_percentile: number | null;
  is_kev: boolean;
  has_poc: boolean;
  affected_cpes: string[];
};

type StackItem = { cpe_prefix: string; label: string | null; vendor: string; product: string };

export const Route = createFileRoute("/_authenticated/feeds")({
  head: () => ({
    meta: [
      { title: "Feeds — TaskX" },
      { name: "description", content: "CTI watch and CVE tracking in TaskX: aggregated security feeds with severity filters and unread tracking." },
      { property: "og:title", content: "Feeds — TaskX" },
      { property: "og:description", content: "CTI watch and CVE tracking in TaskX: aggregated security feeds with severity filters and unread tracking." },
      { property: "og:url", content: "https://taskxx.lovable.app/feeds" },
    ],
    links: [{ rel: "canonical", href: "https://taskxx.lovable.app/feeds" }],
  }),
  component: FeedsPage,
});

type RssSource = {
  id: string;
  name: string;
  url: string;
  source_type: Source;
  default_severity: Severity;
  enabled: boolean;
  last_fetched_at: string | null;
};

const SEV_VARIANT: Record<Severity, "default" | "secondary" | "destructive" | "outline"> = {
  info: "outline",
  low: "secondary",
  medium: "secondary",
  high: "default",
  critical: "destructive",
};

const SOURCES: Source[] = ["cve", "cti"];
const SEVERITIES: Severity[] = ["info", "low", "medium", "high", "critical"];

function FeedsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [filterSource, setFilterSource] = useState<Source | "all">("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [forYouOnly, setForYouOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: stackTags = [] } = useQuery({
    queryKey: ["profile_stack_tags"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("stack_tags").maybeSingle();
      return ((data?.stack_tags as string[] | null) ?? []).map((t) => t.toLowerCase());
    },
    staleTime: 60_000,
  });

  const { data: stackItems = [] } = useQuery({
    queryKey: ["user_stack_items_min"],
    queryFn: async () => {
      const { data } = await supabase.from("user_stack_items").select("cpe_prefix,label,vendor,product");
      return (data ?? []) as StackItem[];
    },
    staleTime: 60_000,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["feed_items"],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("feed_items").select("*")
        .gte("published_at", cutoff)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as FeedItem[];
    },
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60_000,
    staleTime: 0,
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

  const toggleStar = useMutation({
    mutationFn: async ({ id, starred }: { id: string; starred: boolean }) => {
      const { error } = await supabase.from("feed_items").update({ starred }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed_items"] }),
  });

  const matchTagsFor = (x: FeedItem): string[] => matchStackTags(x, stackTags);
  const matchStackFor = (x: FeedItem): StackItem[] => {
    if (!x.affected_cpes || x.affected_cpes.length === 0 || stackItems.length === 0) return [];
    const found: StackItem[] = [];
    for (const s of stackItems) {
      if (x.affected_cpes.some((cpe) => cpe.toLowerCase().startsWith(s.cpe_prefix.toLowerCase()))) {
        found.push(s);
      }
    }
    return found;
  };

  // Priority score: KEV > EPSS percentile > severity weight
  const sevWeight: Record<Severity, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
  const priorityOf = (x: FeedItem, stackMatch: StackItem[]): number => {
    let s = 0;
    if (x.is_kev) s += 1000;
    if (stackMatch.length > 0) s += 500;
    if (x.has_poc) s += 100;
    s += (x.epss_percentile ?? 0) * 100;
    s += sevWeight[x.severity] * 10;
    return s;
  };

  const filtered = items
    .map((x) => {
      const stackMatch = matchStackFor(x);
      const tagMatch = matchTagsFor(x);
      return { x, matches: tagMatch, stackMatch, priority: priorityOf(x, stackMatch) };
    })
    .filter(({ x, matches, stackMatch }) => {
      if (filterSource !== "all" && x.source !== filterSource) return false;
      if (unreadOnly && x.read) return false;
      if (starredOnly && !x.starred) return false;
      if (forYouOnly && matches.length === 0 && stackMatch.length === 0) return false;
      return true;
    })
    .sort((a, b) => b.priority - a.priority);


  const refreshFn = useServerFn(refreshMyFeeds);
  const refresh = async () => {
    setRefreshing(true);
    try {
      const json = await refreshFn();
      toast.success(`${t("feeds.refreshDone")} (+${json.inserted ?? 0})`);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["feed_items"] }),
        qc.invalidateQueries({ queryKey: ["rss_sources"] }),
      ]);
      await Promise.all([
        qc.refetchQueries({ queryKey: ["feed_items"] }),
        qc.refetchQueries({ queryKey: ["rss_sources"] }),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-8">
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("feeds.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{items.filter((i) => !i.read).length} unread / {items.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? t("feeds.refreshing") : t("feeds.refreshNow")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowSources((v) => !v)}>
            <Rss className="h-4 w-4" /> {t("feeds.sources")}
          </Button>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> {t("feeds.new")}
          </Button>
        </div>
      </div>

      {showSources && <SourcesPanel />}
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
          size="sm" variant={forYouOnly ? "default" : "outline"}
          onClick={() => setForYouOnly((v) => !v)}
          className="h-7 text-xs ml-auto"
          disabled={stackTags.length === 0 && stackItems.length === 0}
          title={stackTags.length === 0 && stackItems.length === 0 ? "Configure your stack" : undefined}
        >
          <Sparkles className="h-3 w-3" /> For You{stackItems.length > 0 ? ` (${stackItems.length})` : stackTags.length > 0 ? ` (${stackTags.length})` : ""}
        </Button>
        <Button
          size="sm" variant={starredOnly ? "default" : "outline"}
          onClick={() => setStarredOnly((v) => !v)} className="h-7 text-xs"
        ><Star className={`h-3 w-3 ${starredOnly ? "fill-current" : ""}`} /> {t("feeds.starredOnly")}</Button>
        <Button
          size="sm" variant={unreadOnly ? "default" : "outline"}
          onClick={() => setUnreadOnly((v) => !v)} className="h-7 text-xs"
        >{t("feeds.unreadOnly")}</Button>
      </div>

      {forYouOnly && stackTags.length === 0 && stackItems.length === 0 && (
        <p className="text-xs text-muted-foreground mb-3">
          Declare products in <Link to="/stack" className="text-primary hover:underline">My Stack</Link> or add tags in your <Link to="/profile" className="text-primary hover:underline">profile</Link> to enable For You filtering.
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">{t("feeds.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map(({ x, matches, stackMatch }) => (
            <li
              key={x.id}
              className={`rounded-lg border bg-card p-4 ${x.read ? "opacity-60" : ""} ${(matches.length > 0 || stackMatch.length > 0) ? "border-primary/40" : ""} ${x.is_kev ? "ring-1 ring-destructive/30" : ""}`}
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
                    {x.is_kev && (
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-semibold" title="CISA Known Exploited Vulnerability">
                        KEV
                      </Badge>
                    )}
                    {x.epss_percentile != null && x.epss_percentile >= 0.5 && (
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-orange-500/50 text-orange-500" title={`EPSS ${x.epss_score?.toFixed(3)} — exploitation probability`}>
                        EPSS {Math.round(x.epss_percentile * 100)}%
                      </Badge>
                    )}
                    {x.has_poc && (
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-yellow-500/50 text-yellow-500" title="Nuclei template exists — PoC available">
                        PoC
                      </Badge>
                    )}
                    {stackMatch.length > 0 && (
                      <Badge className="h-5 px-1.5 text-[10px] gap-1 bg-orange-500/15 text-orange-500 border-orange-500/30" variant="outline" title="Matches your declared stack">
                        <Package className="h-2.5 w-2.5" /> Your stack: {stackMatch.slice(0, 2).map((s) => s.label ?? `${s.vendor} ${s.product}`).join(", ")}
                      </Badge>
                    )}
                    {matches.length > 0 && stackMatch.length === 0 && (
                      <Badge className="h-5 px-1.5 text-[10px] gap-1 bg-primary/15 text-primary border-primary/30" variant="outline">
                        <Sparkles className="h-2.5 w-2.5" /> {matches.slice(0, 3).join(", ")}
                      </Badge>
                    )}
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
                    onClick={() => toggleStar.mutate({ id: x.id, starred: !x.starred })}
                    title={x.starred ? t("feeds.starOff") : t("feeds.starOn")}
                  >
                    <Star className={`h-3.5 w-3.5 ${x.starred ? "fill-yellow-500 text-yellow-500" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => toggleRead.mutate({ id: x.id, read: !x.read })}
                    title={x.read ? t("feeds.markUnread") : t("feeds.markRead")}
                  >
                    {x.read ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => remove.mutate(x.id)}
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

function SourcesPanel() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<Source>("cti");

  const { data: sources = [] } = useQuery({
    queryKey: ["rss_sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rss_sources").select("*").order("name");
      if (error) throw error;
      return data as RssSource[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("rss_sources").insert({
        user_id: user.id, name, url, source_type: type, default_severity: "medium",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rss_sources"] });
      setName(""); setUrl("");
    },
    onError: (e) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("rss_sources").update({ enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rss_sources"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rss_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rss_sources"] }),
  });

  const REDDIT_PRESETS: Array<{ name: string; url: string; severity: Severity }> = [
    { name: "r/netsec",          url: "https://www.reddit.com/r/netsec/.rss",          severity: "medium" },
    { name: "r/cybersecurity",   url: "https://www.reddit.com/r/cybersecurity/.rss",   severity: "medium" },
    { name: "r/blueteamsec",     url: "https://www.reddit.com/r/blueteamsec/.rss",     severity: "medium" },
    { name: "r/AskNetsec",       url: "https://www.reddit.com/r/AskNetsec/.rss",       severity: "low"    },
    { name: "r/Malware",         url: "https://www.reddit.com/r/Malware/.rss",         severity: "high"   },
    { name: "r/purpleteamsec",   url: "https://www.reddit.com/r/purpleteamsec/.rss",   severity: "medium" },
    { name: "r/ReverseEngineering", url: "https://www.reddit.com/r/ReverseEngineering/.rss", severity: "medium" },
    { name: "r/hacking",         url: "https://www.reddit.com/r/hacking/.rss",         severity: "medium" },
  ];

  const addRedditPresets = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const existingUrls = new Set(sources.map((s) => s.url));
      const rows = REDDIT_PRESETS
        .filter((p) => !existingUrls.has(p.url))
        .map((p) => ({
          user_id: user.id,
          name: p.name,
          url: p.url,
          source_type: "cti" as Source,
          default_severity: p.severity,
        }));
      if (rows.length === 0) return { inserted: 0 };
      const { error } = await supabase.from("rss_sources").insert(rows);
      if (error) throw error;
      return { inserted: rows.length };
    },
    onSuccess: ({ inserted }) => {
      qc.invalidateQueries({ queryKey: ["rss_sources"] });
      toast.success(inserted === 0 ? "Reddit presets already added" : `Added ${inserted} Reddit source${inserted > 1 ? "s" : ""}`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="rounded-lg border bg-card p-4 mb-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <p className="text-xs text-muted-foreground">{t("feeds.sourcesDesc")}</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => addRedditPresets.mutate()} disabled={addRedditPresets.isPending}>
            <Plus className="h-3.5 w-3.5" /> Reddit cyber presets
          </Button>
        </div>
      </div>

      <ul className="space-y-2 mb-4">
        {sources.map((s) => (
          <li key={s.id} className="flex items-center gap-2 text-sm">
            <Switch checked={s.enabled} onCheckedChange={(v) => toggle.mutate({ id: s.id, enabled: v })} />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{s.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{s.url}</div>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {t("feeds.lastFetch")}: {s.last_fetched_at ? formatDistanceToNow(new Date(s.last_fetched_at), { addSuffix: true }) : t("feeds.never")}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => remove.mutate(s.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto_auto] gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("feeds.sourceNamePh")} className="h-8" />
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t("feeds.sourceUrlPh")} className="h-8" />
        <Select value={type} onValueChange={(v) => setType(v as Source)}>
          <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SOURCES.map((s) => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => add.mutate()} disabled={!name || !url || add.isPending}>
          <Plus className="h-4 w-4" /> {t("feeds.addSource")}
        </Button>
      </div>
    </div>
  );
}

