import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getStreakAndActivity } from "@/lib/activity.functions";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Activity, Clock, Flame, ShieldAlert } from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import { format, subDays } from "date-fns";

const SEV_COLOR: Record<string, string> = {
  critical: "hsl(0 85% 60%)",
  high: "hsl(25 90% 58%)",
  medium: "hsl(45 95% 55%)",
  low: "hsl(200 70% 55%)",
  info: "hsl(220 15% 60%)",
};

export function DynamicPulse() {
  const { lang } = useI18n();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchAct = useServerFn(getStreakAndActivity);
  const { data: act } = useQuery({
    queryKey: ["pulse", "activity"],
    queryFn: () => fetchAct(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: prio } = useQuery({
    queryKey: ["pulse", "priority"],
    queryFn: async () => {
      const { data } = await supabase
        .from("todos").select("priority,status")
        .neq("status", "done");
      const counts = { urgent: 0, high: 0, med: 0, low: 0 };
      (data ?? []).forEach((t: any) => {
        if (t.priority in counts) counts[t.priority as keyof typeof counts]++;
      });
      return counts;
    },
    staleTime: 60 * 1000,
  });

  const { data: sev } = useQuery({
    queryKey: ["pulse", "severity"],
    queryFn: async () => {
      const since = subDays(new Date(), 7).toISOString();
      const { data } = await supabase
        .from("feed_items").select("severity")
        .in("source", ["cve", "cti"]).gte("published_at", since);
      const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
      (data ?? []).forEach((x: any) => {
        if (x.severity in counts) counts[x.severity]++;
      });
      return counts;
    },
    staleTime: 60 * 1000,
  });

  // Build a complete 14-day series
  const series = useMemo(() => {
    const map = new Map<string, number>();
    (act?.days ?? []).forEach((d: any) => {
      map.set(d.day, (d.todos_done ?? 0) + (d.notes_edited ?? 0) + (d.feed_read ?? 0));
    });
    return Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i);
      const key = d.toISOString().slice(0, 10);
      return {
        day: format(d, "dd/MM"),
        value: map.get(key) ?? 0,
      };
    });
  }, [act]);

  const totalActivity = series.reduce((a, b) => a + b.value, 0);
  const peak = Math.max(1, ...series.map((s) => s.value));
  const streak = act?.streak ?? 0;

  const prioData = [
    { name: "Urgent", value: prio?.urgent ?? 0, color: "hsl(0 85% 60%)" },
    { name: "High", value: prio?.high ?? 0, color: "hsl(25 90% 58%)" },
    { name: "Med", value: prio?.med ?? 0, color: "hsl(45 95% 55%)" },
    { name: "Low", value: prio?.low ?? 0, color: "hsl(200 70% 55%)" },
  ];
  const prioMax = Math.max(1, ...prioData.map((p) => p.value));

  const sevData = [
    { name: "Critical", value: sev?.critical ?? 0, fill: SEV_COLOR.critical },
    { name: "High", value: sev?.high ?? 0, fill: SEV_COLOR.high },
    { name: "Medium", value: sev?.medium ?? 0, fill: SEV_COLOR.medium },
    { name: "Low", value: sev?.low ?? 0, fill: SEV_COLOR.low },
  ];
  const sevTotal = sevData.reduce((a, b) => a + b.value, 0);

  const locale = lang === "fr" ? "fr-FR" : "en-US";

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-12">
      {/* Live clock */}
      <div className="md:col-span-3 relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3 w-3" /> Live
          </div>
          <div className="mt-2 text-4xl font-semibold tabular-nums tracking-tight">
            {now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
            <span className="text-base text-muted-foreground ml-1 tabular-nums">
              :{now.getSeconds().toString().padStart(2, "0")}
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground capitalize">
            {now.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "short" })}
          </div>
          <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border/60">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium tabular-nums">{streak}</span>
            <span className="text-[11px] text-muted-foreground">
              {lang === "fr" ? "jours d'affilée" : "day streak"}
            </span>
          </div>
        </div>
      </div>

      {/* Activity area chart */}
      <div className="md:col-span-5 rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Activity className="h-3 w-3" /> {lang === "fr" ? "Activité — 14 jours" : "Activity — 14 days"}
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{totalActivity}</div>
            <div className="text-[11px] text-muted-foreground">
              {lang === "fr" ? `pic ${peak}/jour` : `peak ${peak}/day`}
            </div>
          </div>
        </div>
        <div className="h-[110px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 5, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="pulseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" hide />
              <YAxis hide domain={[0, peak * 1.2]} />
              <RTooltip
                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 6, fontSize: 11, padding: "4px 8px",
                }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              />
              <Area
                type="monotone" dataKey="value"
                stroke="hsl(var(--primary))" strokeWidth={2}
                fill="url(#pulseGrad)" isAnimationActive
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Priority distribution */}
      <div className="md:col-span-2 rounded-xl border bg-card p-5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {lang === "fr" ? "Priorités" : "Priorities"}
        </div>
        <div className="mt-3 space-y-2.5">
          {prioData.map((p) => (
            <div key={p.name}>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-muted-foreground">{p.name}</span>
                <span className="tabular-nums font-medium">{p.value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-accent/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(p.value / prioMax) * 100}%`, background: p.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CVE severity radial */}
      <div className="md:col-span-2 rounded-xl border bg-card p-5 relative overflow-hidden">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          <ShieldAlert className="h-3 w-3" /> CVE 7j
        </div>
        <div className="relative h-[100px] -mx-2 mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="40%" outerRadius="100%"
              data={sevData} startAngle={90} endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, Math.max(1, sevTotal)]} tick={false} />
              <RadialBar background={{ fill: "hsl(var(--accent))" }} dataKey="value" cornerRadius={4} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-semibold tabular-nums leading-none">{sevTotal}</span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">total</span>
          </div>
        </div>
        <div className="mt-1 flex items-center justify-center gap-2 text-[9px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: SEV_COLOR.critical }} />
            {sev?.critical ?? 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: SEV_COLOR.high }} />
            {sev?.high ?? 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: SEV_COLOR.medium }} />
            {sev?.medium ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
}
