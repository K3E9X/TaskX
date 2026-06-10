import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { format, parseISO, startOfWeek, subDays, isSameDay, differenceInMinutes } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { CalendarClock, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";

const WEEKS = 8;
const DAYS = WEEKS * 7;

type Activity = {
  day: string;
  todos_done: number;
  notes_edited: number;
  feed_read: number;
};

export function ExtraPulse() {
  const { lang } = useI18n();
  const locale = lang === "fr" ? fr : enUS;

  const since = subDays(new Date(), DAYS - 1).toISOString().slice(0, 10);

  const { data: days = [] } = useQuery({
    queryKey: ["xpulse", "activity", since],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_activity")
        .select("day,todos_done,notes_edited,feed_read")
        .gte("day", since)
        .order("day", { ascending: true });
      return (data ?? []) as Activity[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ["xpulse", "meetings"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const inSevenDays = new Date(Date.now() + 7 * 86400000).toISOString();
      const { data } = await supabase
        .from("meetings")
        .select("id,title,meeting_date,duration_minutes")
        .gte("meeting_date", nowIso)
        .lte("meeting_date", inSevenDays)
        .order("meeting_date", { ascending: true })
        .limit(5);
      return data ?? [];
    },
    staleTime: 60 * 1000,
  });

  // Build 8x7 grid (col = week, row = weekday) and momentum metrics
  const { grid, peak, thisWeek, lastWeek, deltaPct } = useMemo(() => {
    const map = new Map<string, number>();
    days.forEach((d) => {
      map.set(d.day, (d.todos_done ?? 0) + (d.notes_edited ?? 0) + (d.feed_read ?? 0));
    });

    const today = new Date();
    const endWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const grid: { date: Date; key: string; value: number }[][] = [];
    let peak = 0;

    for (let w = WEEKS - 1; w >= 0; w--) {
      const weekStart = subDays(endWeekStart, w * 7);
      const week: { date: Date; key: string; value: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + d);
        const key = date.toISOString().slice(0, 10);
        const value = map.get(key) ?? 0;
        if (value > peak) peak = value;
        week.push({ date, key, value });
      }
      grid.push(week);
    }

    const sevenDaysAgo = subDays(today, 7);
    const fourteenDaysAgo = subDays(today, 14);
    let thisWeek = 0;
    let lastWeek = 0;
    days.forEach((d) => {
      const date = parseISO(d.day);
      const v = (d.todos_done ?? 0) + (d.notes_edited ?? 0) + (d.feed_read ?? 0);
      if (date >= sevenDaysAgo) thisWeek += v;
      else if (date >= fourteenDaysAgo) lastWeek += v;
    });

    const deltaPct = lastWeek === 0
      ? (thisWeek > 0 ? 100 : 0)
      : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);

    return { grid, peak: Math.max(1, peak), thisWeek, lastWeek, deltaPct };
  }, [days]);

  const intensity = (v: number) => {
    if (v === 0) return "bg-accent/40";
    const r = v / peak;
    if (r < 0.25) return "bg-primary/25";
    if (r < 0.5) return "bg-primary/45";
    if (r < 0.75) return "bg-primary/70";
    return "bg-primary";
  };

  const TrendIcon = deltaPct > 0 ? TrendingUp : deltaPct < 0 ? TrendingDown : Minus;
  const trendTone =
    deltaPct > 0 ? "text-emerald-500" : deltaPct < 0 ? "text-destructive" : "text-muted-foreground";

  const weekdayLabels = lang === "fr"
    ? ["L", "M", "M", "J", "V", "S", "D"]
    : ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-12">
      {/* Heatmap */}
      <div className="md:col-span-7 rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {lang === "fr" ? "Heatmap — 8 semaines" : "Heatmap — 8 weeks"}
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {days.reduce((a, d) => a + (d.todos_done ?? 0) + (d.notes_edited ?? 0) + (d.feed_read ?? 0), 0)}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {lang === "fr" ? "actions totales" : "total actions"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>{lang === "fr" ? "moins" : "less"}</span>
            <span className="h-2.5 w-2.5 rounded-sm bg-accent/40" />
            <span className="h-2.5 w-2.5 rounded-sm bg-primary/25" />
            <span className="h-2.5 w-2.5 rounded-sm bg-primary/45" />
            <span className="h-2.5 w-2.5 rounded-sm bg-primary/70" />
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
            <span>{lang === "fr" ? "plus" : "more"}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col justify-between py-0.5 text-[9px] text-muted-foreground">
            {weekdayLabels.map((d, i) => (
              <span key={i} className={i % 2 === 1 ? "opacity-100" : "opacity-0"}>{d}</span>
            ))}
          </div>
          <div className="flex-1 grid grid-flow-col auto-cols-fr gap-1">
            {grid.map((week, wi) => (
              <div key={wi} className="grid grid-rows-7 gap-1">
                {week.map((cell) => {
                  const isFuture = cell.date > new Date();
                  const isTodayCell = isSameDay(cell.date, new Date());
                  return (
                    <div
                      key={cell.key}
                      className={`aspect-square rounded-sm transition-all hover:ring-2 hover:ring-primary/40 ${
                        isFuture ? "bg-accent/10" : intensity(cell.value)
                      } ${isTodayCell ? "ring-1 ring-foreground/40" : ""}`}
                      title={`${format(cell.date, "dd MMM", { locale })} — ${cell.value} ${lang === "fr" ? "actions" : "actions"}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Momentum */}
      <div className="md:col-span-2 rounded-xl border bg-gradient-to-br from-card to-accent/20 p-5 flex flex-col">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {lang === "fr" ? "Momentum" : "Momentum"}
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className={`text-3xl font-semibold tabular-nums leading-none ${trendTone}`}>
            {deltaPct > 0 ? "+" : ""}{deltaPct}%
          </span>
          <TrendIcon className={`h-4 w-4 ${trendTone}`} />
        </div>
        <div className="mt-3 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{lang === "fr" ? "Cette sem." : "This week"}</span>
            <span className="font-medium tabular-nums">{thisWeek}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{lang === "fr" ? "Sem. -1" : "Last week"}</span>
            <span className="font-medium tabular-nums text-muted-foreground">{lastWeek}</span>
          </div>
        </div>
        <div className="mt-auto pt-3">
          <div className="h-1 rounded-full bg-accent overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(5, (thisWeek / Math.max(1, lastWeek || thisWeek)) * 50))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Upcoming meetings timeline */}
      <div className="md:col-span-3 rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <CalendarClock className="h-3 w-3" /> {lang === "fr" ? "Prochains — 7j" : "Upcoming — 7d"}
          </div>
          <Link to="/meetings" className="text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {meetings.length === 0 ? (
          <div className="py-6 text-center">
            <CalendarClock className="h-6 w-6 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground">
              {lang === "fr" ? "Aucun meeting prévu" : "No upcoming meetings"}
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {meetings.slice(0, 3).map((m: any) => {
              const date = parseISO(m.meeting_date);
              const mins = differenceInMinutes(date, new Date());
              const inHours = mins < 60
                ? `${mins}m`
                : mins < 1440
                  ? `${Math.round(mins / 60)}h`
                  : `${Math.round(mins / 1440)}j`;
              const urgent = mins < 120;
              return (
                <li key={m.id} className="flex items-center gap-2">
                  <div className={`h-8 w-1 rounded-full ${urgent ? "bg-destructive" : "bg-primary/60"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{m.title}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {format(date, "EEE HH:mm", { locale })}
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium tabular-nums shrink-0 ${urgent ? "text-destructive" : "text-muted-foreground"}`}>
                    {inHours}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
