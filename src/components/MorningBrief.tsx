import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { generateMorningBrief } from "@/lib/morning-brief.functions";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RotateCw, Flame, AlertTriangle, CalendarClock, CheckSquare, ArrowRight } from "lucide-react";

export function MorningBrief() {
  const { t, lang } = useI18n();
  const fetchBrief = useServerFn(generateMorningBrief);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["morning-brief", lang],
    queryFn: () => fetchBrief({ data: { lang } }),
    staleTime: 1000 * 60 * 60 * 4, // 4h
    gcTime: 1000 * 60 * 60 * 6,
  });

  return (
    <section
      aria-label={t("brief.title")}
      className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-card to-card p-5 md:p-6"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">{t("brief.title")}</h2>
            <p className="text-[11px] text-muted-foreground">{t("brief.subtitle")}</p>
          </div>
        </div>
        <Button
          variant="ghost" size="sm" className="h-7 gap-1.5"
          onClick={() => refetch()} disabled={isFetching}
          aria-label={t("brief.regenerate")}
        >
          <RotateCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          <span className="text-xs">{t("brief.regenerate")}</span>
        </Button>
      </div>

      <div className="grid md:grid-cols-[1fr_220px] gap-4">
        <div className="text-sm whitespace-pre-line leading-relaxed text-foreground/90 min-h-[80px]">
          {isFetching && !data ? (
            <div className="space-y-2">
              <div className="h-3 w-3/4 bg-accent/60 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-accent/60 rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-accent/60 rounded animate-pulse" />
            </div>
          ) : data?.summary ? (
            data.summary
          ) : (
            <span className="text-muted-foreground">{t("brief.empty")}</span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
          <Stat icon={CheckSquare} label={t("brief.stats.todos")} value={data?.stats.todos ?? 0} />
          <Stat icon={CalendarClock} label={t("brief.stats.meetings")} value={data?.stats.meetings ?? 0} />
          <Stat icon={AlertTriangle} label={t("brief.stats.cves")} value={data?.stats.criticalCves ?? 0} accent="destructive" />
          <Stat icon={Flame} label={t("brief.stats.streak")} value={data?.stats.streak ?? 0} accent="primary" />
        </div>
      </div>

      {data?.lastEdited && (
        <div className="mt-4 pt-3 border-t flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{t("brief.continue")}</span>
          <Link
            to="/notes"
            className="text-xs font-medium inline-flex items-center gap-1 text-primary hover:underline"
          >
            {data.lastEdited.title} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </section>
  );
}

function Stat({ icon: Icon, label, value, accent }: {
  icon: typeof Flame; label: string; value: number | string; accent?: "primary" | "destructive";
}) {
  const tone = accent === "destructive" ? "text-destructive" : accent === "primary" ? "text-primary" : "text-foreground";
  return (
    <div className="flex items-center gap-2 rounded-md border bg-card/50 px-3 py-2">
      <Icon className={`h-3.5 w-3.5 ${tone}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{label}</div>
        <div className={`text-lg font-semibold tabular-nums leading-none mt-0.5 ${tone}`}>{value}</div>
      </div>
    </div>
  );
}
