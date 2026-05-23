import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Bar,
  BarChart,
  Line,
  LineChart,
} from "recharts";
import {
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  FileText,
  FolderKanban,
  Repeat,
  CalendarClock,
  GitBranch,
  Rss,
  Users,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { TaskXLogo, TaskXMark } from "@/components/brand/TaskXLogo";
import { useI18n, LangToggle, type TKey } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaskX — The cockpit for cybersecurity teams" },
      {
        name: "description",
        content:
          "TaskX unifies CTI watch, CVE tracking, architecture diagrams, security projects, runbooks and RBAC in one fast workspace for CISOs, SOC and GRC teams.",
      },
      { property: "og:title", content: "TaskX — The cockpit for cybersecurity teams" },
      {
        property: "og:description",
        content:
          "CTI watch, CVE tracking, architecture diagrams, runbooks and RBAC in one fast workspace.",
      },
    ],
  }),
  component: LandingPage,
});

const chartA = Array.from({ length: 24 }, (_, i) => ({
  v: 40 + Math.sin(i / 2.4) * 18 + Math.random() * 8 + i * 1.2,
}));
const chartB = Array.from({ length: 14 }, (_, i) => ({
  v: 20 + Math.cos(i / 1.8) * 12 + Math.random() * 6,
}));
const chartC = Array.from({ length: 18 }, (_, i) => ({
  v: 10 + (i % 5) * 8 + Math.random() * 14,
}));

function LandingPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <BackgroundFX />
      <Nav t={t} />
      <Hero t={t} />
      <LogoStrip t={t} />
      <FeatureGrid t={t} />
      <CockpitShowcase t={t} />
      <MetricsBand t={t} />
      <CTA t={t} />
      <Footer t={t} />
    </div>
  );
}

type T = (k: TKey) => string;

function BackgroundFX() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -top-40 left-1/2 h-[600px] w-[1100px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.68 0.16 270 / 0.55), transparent)",
        }}
      />
      <div
        className="absolute top-[40%] -left-32 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.7 0.18 200 / 0.5), transparent)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 35%, transparent 75%)",
        }}
      />
    </div>
  );
}

function Nav({ t }: { t: T }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-background/60 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <TaskXLogo />
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition">{t("land.nav.features")}</a>
          <a href="#workspace" className="hover:text-foreground transition">{t("land.nav.product")}</a>
        </nav>
        <div className="flex items-center gap-2">
          <LangToggle />
          <Link to="/login">
            <Button variant="ghost" size="sm">{t("land.nav.signin")}</Button>
          </Link>
          <Link to="/login">
            <Button size="sm" className="gap-1.5">
              {t("land.nav.start")} <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero({ t }: { t: T }) {
  return (
    <section className="relative mx-auto max-w-7xl px-6 pt-20 pb-28 md:pt-32 md:pb-40">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="max-w-3xl"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          {t("land.badge")}
        </div>
        <h1 className="mt-6 text-5xl md:text-7xl font-semibold tracking-tight leading-[1.02]">
          {t("land.hero.t1")}
          <br />
          <span className="bg-gradient-to-r from-[oklch(0.74_0.18_295)] via-[oklch(0.82_0.14_240)] to-[oklch(0.78_0.15_200)] bg-clip-text text-transparent">
            {t("land.hero.t2")}
          </span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
          {t("land.hero.sub")}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/login">
            <Button size="lg" className="gap-2">
              {t("land.cta.primary")} <ArrowRight className="size-4" />
            </Button>
          </Link>
          <a href="#features">
            <Button size="lg" variant="outline">{t("land.cta.secondary")}</Button>
          </a>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-primary" /> {t("land.bullet.free")}</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-primary" /> {t("land.bullet.team")}</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-primary" /> {t("land.bullet.secure")}</span>
        </div>
      </motion.div>

      <HeroPreview t={t} />
    </section>
  );
}

function HeroPreview({ t }: { t: T }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.25, ease: "easeOut" }}
      className="mt-20 relative"
    >
      <div className="absolute inset-x-10 -top-6 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="rounded-2xl border border-border/70 bg-card/70 backdrop-blur-xl shadow-2xl shadow-primary/10 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
          <div className="flex gap-1.5">
            <div className="size-2.5 rounded-full bg-muted-foreground/30" />
            <div className="size-2.5 rounded-full bg-muted-foreground/30" />
            <div className="size-2.5 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="ml-3 text-xs text-muted-foreground font-mono">taskx.app / dashboard</div>
        </div>
        <div className="grid grid-cols-12 gap-4 p-5">
          <div className="col-span-12 md:col-span-8 rounded-xl border border-border/60 bg-background/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">{t("land.preview.kpi")}</div>
                <div className="mt-1 text-2xl font-semibold">+38.4%</div>
              </div>
              <div className="text-xs text-primary">{t("land.preview.live")}</div>
            </div>
            <div className="h-40 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartA}>
                  <defs>
                    <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.68 0.16 270)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="oklch(0.68 0.16 270)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="oklch(0.78 0.14 270)"
                    strokeWidth={2}
                    fill="url(#ga)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="col-span-12 md:col-span-4 grid gap-4">
            <MiniCard label={t("land.preview.tasks")} value="128" trend={chartB} type="line" />
            <MiniCard label={t("land.preview.focus")} value="32" trend={chartC} type="bar" />
          </div>
          <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: CheckSquare, label: t("nav.todos") },
              { icon: FileText, label: t("nav.notes") },
              { icon: FolderKanban, label: t("nav.projects") },
              { icon: Rss, label: t("nav.feeds") },
            ].map((it) => (
              <div key={it.label} className="rounded-lg border border-border/60 bg-background/40 px-3 py-2.5 flex items-center gap-2 text-xs">
                <it.icon className="size-3.5 text-primary" />
                <span className="text-muted-foreground">{it.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MiniCard({
  label, value, trend, type,
}: { label: string; value: string; trend: { v: number }[]; type: "line" | "bar" }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      <div className="h-12 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          {type === "line" ? (
            <LineChart data={trend}>
              <Line type="monotone" dataKey="v" stroke="oklch(0.78 0.14 270)" strokeWidth={1.8} dot={false} />
            </LineChart>
          ) : (
            <BarChart data={trend}>
              <Bar dataKey="v" fill="oklch(0.68 0.16 270 / 0.7)" radius={2} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LogoStrip({ t }: { t: T }) {
  const items = t("land.strip.items").split(", ");
  return (
    <section className="border-y border-border/60 bg-card/30">
      <div className="mx-auto max-w-7xl px-6 py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs uppercase tracking-widest text-muted-foreground">
        <span className="opacity-60">{t("land.strip")}</span>
        {items.map((i) => (
          <span key={i} className="font-mono">{i}</span>
        ))}
      </div>
    </section>
  );
}

function FeatureGrid({ t }: { t: T }) {
  const FEATURES = [
    { icon: Rss, t: t("land.f.feeds.t"), d: t("land.f.feeds.d") },
    { icon: GitBranch, t: t("land.f.diagrams.t"), d: t("land.f.diagrams.d") },
    { icon: Users, t: t("land.f.team.t"), d: t("land.f.team.d") },
    { icon: FolderKanban, t: t("land.f.projects.t"), d: t("land.f.projects.d") },
    { icon: CheckSquare, t: t("land.f.todos.t"), d: t("land.f.todos.d") },
    { icon: FileText, t: t("land.f.notes.t"), d: t("land.f.notes.d") },
    { icon: CalendarClock, t: t("land.f.meetings.t"), d: t("land.f.meetings.d") },
    { icon: Repeat, t: t("land.f.routines.t"), d: t("land.f.routines.d") },
    { icon: Bot, t: t("land.f.ai.t"), d: t("land.f.ai.d") },
  ];
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24 md:py-32">
      <div className="max-w-2xl">
        <div className="text-xs uppercase tracking-widest text-primary">{t("land.features.eyebrow")}</div>
        <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
          {t("land.features.title")}
        </h2>
        <p className="mt-4 text-muted-foreground">{t("land.features.sub")}</p>
      </div>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60 rounded-2xl overflow-hidden border border-border/60">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.t}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            className="bg-card/60 p-7 hover:bg-card transition-colors group"
          >
            <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
              <f.icon className="size-4" />
            </div>
            <h3 className="mt-4 font-semibold tracking-tight">{f.t}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.d}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function CockpitShowcase({ t }: { t: T }) {
  const bullets = [t("land.show.b1"), t("land.show.b2"), t("land.show.b3"), t("land.show.b4")];
  return (
    <section id="workspace" className="relative border-t border-border/60 bg-gradient-to-b from-card/40 to-background">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary">{t("land.show.eyebrow")}</div>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
            {t("land.show.title")}
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">{t("land.show.sub")}</p>
          <ul className="mt-6 space-y-3 text-sm">
            {bullets.map((i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-primary mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{i}</span>
              </li>
            ))}
          </ul>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative"
        >
          <div className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-primary/20 to-transparent blur-2xl" />
          <div className="relative rounded-2xl border border-border/70 bg-card/70 backdrop-blur-xl p-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                { l: t("nav.todos"), v: "42" },
                { l: t("nav.notes"), v: "128" },
                { l: t("nav.projects"), v: "9" },
              ].map((k) => (
                <div key={k.l} className="rounded-lg border border-border/60 bg-background/50 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</div>
                  <div className="mt-1 text-lg font-semibold">{k.v}</div>
                </div>
              ))}
            </div>
            <div className="h-48 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartA}>
                  <defs>
                    <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.7 0.18 200)" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="oklch(0.7 0.18 200)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="oklch(0.8 0.14 200)" strokeWidth={2} fill="url(#gb)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-1.5">
              {[
                `${t("nav.feeds")} · 14:02 · ok`,
                `${t("nav.routines")} · 08:00 · ok`,
                `${t("nav.meetings")} · 16:30 · scheduled`,
              ].map((l) => (
                <div key={l} className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <div className="size-1.5 rounded-full bg-primary" /> {l}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function MetricsBand({ t }: { t: T }) {
  const stats = [
    { v: "<100ms", l: t("land.metrics.speed") },
    { v: "99.9%", l: t("land.metrics.uptime") },
    { v: "12+", l: t("land.metrics.modules") },
    { v: "0", l: t("land.metrics.friction") },
  ];
  return (
    <section className="border-y border-border/60">
      <div className="mx-auto max-w-7xl px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s) => (
          <div key={s.l} className="text-center">
            <div className="text-3xl md:text-4xl font-semibold tracking-tight bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">{s.v}</div>
            <div className="mt-1.5 text-xs uppercase tracking-widest text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA({ t }: { t: T }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-28 md:py-36 text-center">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex justify-center mb-6">
          <TaskXMark size={48} />
        </div>
        <h2 className="text-4xl md:text-6xl font-semibold tracking-tight max-w-3xl mx-auto">
          {t("land.cta.title")}
        </h2>
        <p className="mt-5 text-muted-foreground max-w-xl mx-auto">{t("land.cta.sub")}</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/login">
            <Button size="lg" className="gap-2">
              {t("land.cta.create")} <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">{t("land.nav.signin")}</Button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

function Footer({ t }: { t: T }) {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <TaskXLogo size={20} />
          <span className="ml-2">© {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="hover:text-foreground">{t("land.footer.features")}</a>
          <a href="#workspace" className="hover:text-foreground">{t("land.footer.product")}</a>
          <Link to="/login" className="hover:text-foreground">{t("land.footer.signin")}</Link>
        </div>
      </div>
    </footer>
  );
}
