import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Search, Zap, Code2, FileText, GitBranch, Coffee, Repeat, Rss,
  Lightbulb, Check, ArrowRight,
} from "lucide-react";

type UsageTip = {
  id: string;
  title: string;
  body: string;
  module: string;
  icon: string | null;
  link: string | null;
  shortcut: string | null;
  published_at: string;
};

const ICONS: Record<string, typeof Sparkles> = {
  Sparkles, Search, Zap, Code2, FileText, GitBranch, Coffee, Repeat, Rss, Lightbulb,
};

const MODULES = [
  { key: "all", label: "Tous" },
  { key: "shortcuts", label: "Raccourcis" },
  { key: "notes", label: "Notes" },
  { key: "snippets", label: "Snippets" },
  { key: "diagrams", label: "Diagrammes" },
  { key: "workflows", label: "Workflows" },
  { key: "whats-new", label: "Nouveautés" },
  { key: "general", label: "Général" },
];

export const Route = createFileRoute("/_authenticated/tips")({
  head: () => ({
    meta: [
      { title: "Astuces TaskX — Tips" },
      { name: "description", content: "Découvre les raccourcis, fonctionnalités cachées et workflows pour tirer le meilleur de ton workspace TaskX." },
    ],
    links: [{ rel: "canonical", href: "https://taskxx.lovable.app/tips" }],
  }),
  component: TipsPage,
});

function TipsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data: tips = [], isLoading } = useQuery({
    queryKey: ["usage_tips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usage_tips")
        .select("*")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as UsageTip[];
    },
  });

  const { data: seenIds = new Set<string>() } = useQuery({
    queryKey: ["user_tip_views"],
    queryFn: async () => {
      const { data } = await supabase.from("user_tip_views").select("tip_id");
      return new Set((data ?? []).map((x) => x.tip_id));
    },
  });

  const markSeen = useMutation({
    mutationFn: async (tipId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("user_tip_views").upsert(
        { user_id: user.id, tip_id: tipId },
        { onConflict: "user_id,tip_id" },
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_tip_views"] }),
  });

  const markAllSeen = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const rows = tips
        .filter((tip) => !seenIds.has(tip.id))
        .map((tip) => ({ user_id: user.id, tip_id: tip.id }));
      if (rows.length === 0) return;
      await supabase.from("user_tip_views").upsert(rows, { onConflict: "user_id,tip_id" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_tip_views"] }),
  });

  const filtered = useMemo(
    () => (filter === "all" ? tips : tips.filter((x) => x.module === filter)),
    [tips, filter],
  );

  const unseenCount = tips.filter((x) => !seenIds.has(x.id)).length;

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-8">
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            Astuces TaskX
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tips.length} astuces · {unseenCount} nouvelle{unseenCount > 1 ? "s" : ""}
          </p>
        </div>
        {unseenCount > 0 && (
          <Button size="sm" variant="outline" onClick={() => markAllSeen.mutate()}>
            <Check className="h-4 w-4" /> Tout marquer comme lu
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1.5 mb-6 flex-wrap">
        {MODULES.map((m) => (
          <Button
            key={m.key} size="sm"
            variant={filter === m.key ? "default" : "outline"}
            onClick={() => setFilter(m.key)}
            className="h-7 text-xs"
          >
            {m.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">
          Aucune astuce dans cette catégorie pour l'instant.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {filtered.map((tip) => {
            const Icon = (tip.icon && ICONS[tip.icon]) || Lightbulb;
            const isNew = !seenIds.has(tip.id);
            return (
              <li
                key={tip.id}
                className={`rounded-lg border bg-card p-4 flex flex-col gap-2 transition ${isNew ? "border-primary/40 ring-1 ring-primary/10" : ""}`}
                onMouseEnter={() => isNew && markSeen.mutate(tip.id)}
              >
                <div className="flex items-start gap-2">
                  <div className="rounded-md bg-primary/10 p-1.5 text-primary shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold">{tip.title}</h3>
                      {isNew && (
                        <Badge className="h-4 px-1.5 text-[9px] uppercase tracking-wider">Nouveau</Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {tip.module}
                    </span>
                  </div>
                  {tip.shortcut && (
                    <kbd className="text-[10px] font-mono bg-muted px-2 py-1 rounded border shrink-0">
                      {tip.shortcut}
                    </kbd>
                  )}
                </div>
                {tip.body && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{tip.body}</p>
                )}
                {tip.link && (
                  <Link
                    to={tip.link}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                  >
                    Ouvrir <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
