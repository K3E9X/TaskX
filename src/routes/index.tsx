import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  FileText,
  FolderKanban,
  Command,
  CalendarClock,
  GitBranch,
  Rss,
  Terminal,
  Bot,
  Mail,
  ShieldAlert,
  Sparkles,
  Lock,
  Crosshair,
  Eye,
  Building2,
  Briefcase,
  Search,
  Plus,
  Minus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TaskXLogo, TaskXMark } from "@/components/brand/TaskXLogo";
import { useI18n, LangToggle, type TKey } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaskX — Le second cerveau des pros cyber (CVE, snippets, runbooks, IA)" },
      {
        name: "description",
        content:
          "Le workspace personnel des pros cyber : veille CVE filtrée par ta stack, snippets à variables, runbooks, diagrammes Mermaid, palette ⌘K et assistant IA contextuel. Gratuit, sans CB.",
      },
      { property: "og:title", content: "TaskX — Le second cerveau des pros cyber" },
      {
        property: "og:description",
        content:
          "Veille CVE For You, snippets à variables {{VAR}}, runbooks, diagrammes, palette ⌘K et IA contextuelle. Gratuit, sans CB.",
      },
      { property: "og:url", content: "https://taskx.tech/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://taskx.tech/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "TaskX",
          url: "https://taskx.tech/",
          description:
            "Second cerveau quotidien pour les pros cyber : veille CVE personnalisée, snippets à variables, runbooks, diagrammes Mermaid et IA contextuelle.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "TaskX",
          url: "https://taskx.tech/",
        }),
      },
    ],
  }),

  component: LandingPage,
});

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
      <PersonasSection t={t} />
      <FeatureGrid t={t} />
      <CockpitShowcase t={t} />
      <PricingSection t={t} />
      <MetricsBand t={t} />
      <FaqSection t={t} />
      <CTA t={t} />
      <ContactSection t={t} />
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
            "radial-gradient(closest-side, oklch(0.78 0.15 195 / 0.55), transparent)",
        }}
      />
      <div
        className="absolute top-[40%] -left-32 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.72 0.14 180 / 0.5), transparent)",
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
          <a href="#personas" className="hover:text-foreground transition">{t("land.personas.eyebrow")}</a>
          <a href="#features" className="hover:text-foreground transition">{t("land.nav.features")}</a>
          <a href="#pricing" className="hover:text-foreground transition">{t("land.nav.pricing")}</a>
          <a href="#faq" className="hover:text-foreground transition">{t("land.faq.eyebrow")}</a>
        </nav>
        <div className="flex items-center gap-2">
          <LangToggle />
          <Link to="/login">
            <Button variant="ghost" size="sm">{t("land.nav.signin")}</Button>
          </Link>
          <Link to="/login">
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-primary to-[oklch(0.72_0.14_180)] text-primary-foreground hover:opacity-90 border-0 shadow-[0_0_24px_-8px_oklch(0.78_0.15_195/60%)]">
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
    <section className="relative mx-auto max-w-7xl px-6 pt-20 pb-24 md:pt-32 md:pb-32">
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
          <span className="bg-gradient-to-r from-primary via-[oklch(0.85_0.14_190)] to-[oklch(0.72_0.14_180)] bg-clip-text text-transparent">
            {t("land.hero.t2")}
          </span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
          {t("land.hero.sub")}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/login">
            <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-[oklch(0.72_0.14_180)] text-primary-foreground hover:opacity-90 border-0 shadow-[0_0_24px_-8px_oklch(0.78_0.15_195/60%)]">
              {t("land.cta.primary")} <ArrowRight className="size-4" />
            </Button>
          </Link>
          <a href="#preview">
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

const FAKE_FEED: Array<{
  id: string;
  sev: "critical" | "high" | "medium";
  source: "CVE" | "CTI" | "KEV";
  title: string;
  meta: string;
  age: string;
}> = [
  {
    id: "CVE-2025-31324",
    sev: "critical",
    source: "KEV",
    title: "SAP NetWeaver — Unrestricted file upload, RCE confirmé in-the-wild",
    meta: "CISA KEV · CVSS 10.0 · exploit public",
    age: "il y a 12 min",
  },
  {
    id: "CVE-2025-22457",
    sev: "high",
    source: "CVE",
    title: "Ivanti Connect Secure — Buffer overflow auth bypass",
    meta: "NVD · CVSS 9.0 · patch dispo",
    age: "il y a 47 min",
  },
  {
    id: "BHC-5821",
    sev: "high",
    source: "CTI",
    title: "BleepingComputer — Nouvelle campagne Lazarus visant développeurs npm",
    meta: "CTI · 23 IoCs · 4 paquets touchés",
    age: "il y a 1 h",
  },
  {
    id: "CVE-2025-26633",
    sev: "medium",
    source: "CVE",
    title: "Microsoft Management Console — Spoofing, exploitée par EncryptHub",
    meta: "Hacker News · CVSS 7.0",
    age: "il y a 3 h",
  },
];

const FAKE_TODOS = [
  { t: "Patch lab interne Ivanti CS", p: "high" as const, done: false },
  { t: "Write-up mission RT Banque-X", p: "med" as const, done: false },
  { t: "Cert AZ-500 — module 4", p: "low" as const, done: true },
  { t: "Revue trust zones — projet Atlas", p: "med" as const, done: false },
];

function HeroPreview({ t }: { t: T }) {
  return (
    <motion.div
      id="preview"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.25, ease: "easeOut" }}
      className="mt-16 relative"
    >
      <div className="absolute inset-x-10 -top-6 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="rounded-2xl border border-border/70 bg-card/70 backdrop-blur-xl shadow-2xl shadow-primary/10 overflow-hidden">
        {/* fake browser chrome */}
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
          <div className="flex gap-1.5">
            <div className="size-2.5 rounded-full bg-[oklch(0.65_0.18_25)]/70" />
            <div className="size-2.5 rounded-full bg-[oklch(0.75_0.15_85)]/70" />
            <div className="size-2.5 rounded-full bg-[oklch(0.72_0.16_145)]/70" />
          </div>
          <div className="ml-3 text-xs text-muted-foreground font-mono">taskx.tech / dashboard</div>
          <div className="ml-auto text-[10px] text-muted-foreground font-mono hidden md:block">
            <span className="inline-block size-1.5 rounded-full bg-[oklch(0.72_0.16_145)] mr-1.5 animate-pulse" />
            {t("land.preview.live")}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 p-4 md:p-5">
          {/* Feeds main panel */}
          <div className="col-span-12 lg:col-span-8 rounded-xl border border-border/60 bg-background/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Rss className="size-4 text-primary" />
                <div className="text-sm font-medium">{t("land.preview.kpi")}</div>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">4 sources · 24h</div>
            </div>
            <ul className="space-y-1.5">
              {FAKE_FEED.map((f) => (
                <li
                  key={f.id}
                  className="group flex items-start gap-3 rounded-lg border border-transparent hover:border-border/60 hover:bg-card/60 px-2.5 py-2 transition-colors"
                >
                  <ShieldAlert
                    className={`size-3.5 mt-0.5 shrink-0 ${
                      f.sev === "critical"
                        ? "text-[oklch(0.65_0.22_25)]"
                        : f.sev === "high"
                        ? "text-[oklch(0.75_0.18_60)]"
                        : "text-muted-foreground"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant={
                          f.sev === "critical"
                            ? "destructive"
                            : f.sev === "high"
                            ? "default"
                            : "secondary"
                        }
                        className="h-4 px-1.5 text-[9px] uppercase tracking-wider"
                      >
                        {f.sev}
                      </Badge>
                      <Badge variant="outline" className="h-4 px-1.5 text-[9px] uppercase">
                        {f.source}
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground">{f.id}</span>
                    </div>
                    <div className="mt-1 text-xs text-foreground/90 leading-snug truncate">{f.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">{f.meta}</div>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0 hidden sm:block">{f.age}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right column: todos + streak + brief */}
          <div className="col-span-12 lg:col-span-4 grid gap-4">
            <div className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckSquare className="size-4 text-primary" />
                <div className="text-sm font-medium">{t("land.preview.tasks")}</div>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">3 / 4</span>
              </div>
              <ul className="space-y-1.5">
                {FAKE_TODOS.map((td) => (
                  <li key={td.t} className="flex items-center gap-2 text-xs">
                    <div
                      className={`size-3.5 rounded border ${
                        td.done
                          ? "bg-primary border-primary"
                          : "border-border bg-background"
                      } flex items-center justify-center shrink-0`}
                    >
                      {td.done && <CheckCircle2 className="size-2.5 text-primary-foreground" />}
                    </div>
                    <span className={`flex-1 truncate ${td.done ? "line-through text-muted-foreground" : ""}`}>
                      {td.t}
                    </span>
                    <span
                      className={`size-1.5 rounded-full shrink-0 ${
                        td.p === "high"
                          ? "bg-[oklch(0.65_0.22_25)]"
                          : td.p === "med"
                          ? "bg-[oklch(0.75_0.18_60)]"
                          : "bg-muted-foreground/40"
                      }`}
                    />
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="size-4 text-primary" />
                <div className="text-sm font-medium">{t("land.preview.focus")}</div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tracking-tight">12</span>
                <span className="text-xs text-muted-foreground">jours d'affilée</span>
              </div>
              <div className="mt-2 flex gap-0.5">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-5 rounded-sm ${
                      i < 12
                        ? "bg-gradient-to-t from-primary to-[oklch(0.72_0.14_180)]"
                        : "bg-border/40"
                    }`}
                  />
                ))}

              </div>
            </div>
          </div>

          {/* Module pills */}
          <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { icon: CheckSquare, label: t("nav.todos") },
              { icon: FileText, label: t("nav.notes") },
              { icon: FolderKanban, label: t("nav.projects") },
              { icon: Rss, label: t("nav.feeds") },
            ].map((it) => (
              <div key={it.label} className="rounded-lg border border-border/60 bg-background/40 px-3 py-2 flex items-center gap-2 text-xs">
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

function PersonasSection({ t }: { t: T }) {
  const personas = [
    {
      icon: Crosshair,
      title: t("land.personas.pentest.t"),
      desc: t("land.personas.pentest.d"),
      uses: [t("land.personas.pentest.u1"), t("land.personas.pentest.u2")],
    },
    {
      icon: Eye,
      title: t("land.personas.soc.t"),
      desc: t("land.personas.soc.d"),
      uses: [t("land.personas.soc.u1"), t("land.personas.soc.u2")],
    },
    {
      icon: Building2,
      title: t("land.personas.archi.t"),
      desc: t("land.personas.archi.d"),
      uses: [t("land.personas.archi.u1"), t("land.personas.archi.u2")],
    },
    {
      icon: Briefcase,
      title: t("land.personas.ciso.t"),
      desc: t("land.personas.ciso.d"),
      uses: [t("land.personas.ciso.u1"), t("land.personas.ciso.u2")],
    },
    {
      icon: Search,
      title: "Forensic / DFIR",
      desc: "Chronologies d'incident, chaîne de garde, snippets de collecte — sans quitter ton second cerveau.",
      uses: [
        "Runbooks IR versionnés (triage, mémoire, disque)",
        "Snippets Volatility / KAPE / plaso avec variables",
      ],
    },
  ];


  return (
    <section id="personas" className="border-t border-border/60 bg-card/20">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-28">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-primary">{t("land.personas.eyebrow")}</div>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
            {t("land.personas.title")}
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">{t("land.personas.sub")}</p>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          {personas.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="rounded-xl border border-border/60 bg-card/60 p-6 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <p.icon className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold tracking-tight">{p.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                  <ul className="mt-4 space-y-1.5">
                    {p.uses.map((u) => (
                      <li key={u} className="flex items-start gap-2 text-xs text-foreground/80">
                        <CheckCircle2 className="size-3.5 text-primary mt-0.5 shrink-0" />
                        <span>{u}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureGrid({ t }: { t: T }) {
  const FEATURES: Array<{ icon: typeof Rss; title: string; desc: string }> = [
    { icon: Rss, title: t("land.fg.watch.t"), desc: t("land.fg.watch.d") },
    { icon: Terminal, title: t("land.fg.snip.t"), desc: t("land.fg.snip.d") },
    { icon: FileText, title: t("land.fg.notes.t"), desc: t("land.fg.notes.d") },
    { icon: GitBranch, title: t("land.fg.mermaid.t"), desc: t("land.fg.mermaid.d") },
    { icon: Command, title: t("land.fg.palette.t"), desc: t("land.fg.palette.d") },
    { icon: FolderKanban, title: t("land.fg.projects.t"), desc: t("land.fg.projects.d") },
    { icon: CheckSquare, title: t("land.fg.todos.t"), desc: t("land.fg.todos.d") },
    { icon: CalendarClock, title: t("land.fg.meetings.t"), desc: t("land.fg.meetings.d") },
    { icon: Bot, title: t("land.fg.ai.t"), desc: t("land.fg.ai.d") },
  ];
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24 md:py-32">
      <div className="max-w-2xl">
        <div className="text-xs uppercase tracking-widest text-primary">{t("land.features.eyebrow")}</div>
        <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
          {t("land.features.title")}
        </h2>
        <p className="mt-4 text-muted-foreground">
          {t("land.features.sub")}
        </p>
      </div>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60 rounded-2xl overflow-hidden border border-border/60">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            className="bg-card/60 p-7 hover:bg-card transition-colors group"
          >
            <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
              <f.icon className="size-4" />
            </div>
            <h3 className="mt-4 font-semibold tracking-tight">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
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
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-primary" />
              <div className="text-sm font-medium">Briefing du matin · 08:12</div>
            </div>
            <div className="space-y-2.5 text-sm">
              <p className="text-foreground/90 leading-relaxed">
                <span className="text-primary font-medium">3 CVE critiques</span> à regarder (1 KEV CISA),
                <span className="text-primary font-medium"> 2 meetings</span> aujourd'hui,
                streak <span className="text-primary font-medium">12 jours</span>.
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Top priorité : <span className="font-mono">CVE-2025-31324</span> (SAP NetWeaver — exploit in-the-wild). Lien CISA + note interne déjà créée.
              </p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { l: t("nav.todos"), v: "4", icon: CheckSquare },
                { l: t("nav.notes"), v: "128", icon: FileText },
                { l: t("nav.feeds"), v: "23", icon: Rss },
              ].map((k) => (
                <div key={k.l} className="rounded-lg border border-border/60 bg-background/50 p-3">
                  <div className="flex items-center gap-1.5">
                    <k.icon className="size-3 text-muted-foreground" />
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</div>
                  </div>
                  <div className="mt-1 text-lg font-semibold">{k.v}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1.5">
              {[
                `${t("nav.feeds")} · ingest auto · 14:02 · ok`,
                `snippets · exec kubectl-drain · 08:00 · copié`,
                `${t("nav.meetings")} · revue archi · 16:30 · planifié`,
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

function PricingSection({ t }: { t: T }) {
  const features = [
    t("land.pricing.f1"),
    t("land.pricing.f2"),
    t("land.pricing.f3"),
    t("land.pricing.f4"),
    t("land.pricing.f5"),
  ];
  return (
    <section id="pricing" className="border-t border-border/60">
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs uppercase tracking-widest text-primary">{t("land.pricing.eyebrow")}</div>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
            {t("land.pricing.title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("land.pricing.sub")}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative mt-12 mx-auto max-w-2xl"
        >
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-primary/20 via-transparent to-primary/10 blur-2xl" />
          <div className="relative rounded-2xl border border-border/70 bg-card/70 backdrop-blur-xl p-8 md:p-10">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">{t("land.pricing.plan")}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-5xl font-semibold tracking-tight">{t("land.pricing.price")}</span>
                  <span className="text-sm text-muted-foreground">{t("land.pricing.unit")}</span>
                </div>
              </div>
              <Badge variant="outline" className="gap-1 text-[11px]">
                <Lock className="size-3" />
                {t("land.bullet.free")}
              </Badge>
            </div>
            <ul className="mt-8 space-y-3">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="size-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
            <Link to="/login" className="block mt-8">
              <Button size="lg" className="w-full gap-2 bg-gradient-to-r from-primary to-[oklch(0.72_0.14_180)] text-primary-foreground hover:opacity-90 border-0 shadow-[0_0_24px_-8px_oklch(0.78_0.15_195/60%)]">
                {t("land.pricing.cta")} <ArrowRight className="size-4" />
              </Button>
            </Link>
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

function FaqSection({ t }: { t: T }) {
  const items: Array<{ q: TKey; a: TKey }> = [
    { q: "land.faq.q1", a: "land.faq.a1" },
    { q: "land.faq.q2", a: "land.faq.a2" },
    { q: "land.faq.q3", a: "land.faq.a3" },
    { q: "land.faq.q4", a: "land.faq.a4" },
    { q: "land.faq.q5", a: "land.faq.a5" },
    { q: "land.faq.q6", a: "land.faq.a6" },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="border-t border-border/60">
      <div className="mx-auto max-w-4xl px-6 py-24 md:py-32">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs uppercase tracking-widest text-primary">{t("land.faq.eyebrow")}</div>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">{t("land.faq.title")}</h2>
        </div>
        <div className="mt-12 space-y-2">
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div
                key={it.q}
                className="rounded-xl border border-border/60 bg-card/40 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-card/60 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm md:text-base font-medium">{t(it.q)}</span>
                  {isOpen ? (
                    <Minus className="size-4 text-muted-foreground shrink-0" />
                  ) : (
                    <Plus className="size-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                    {t(it.a)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Link to="/login">
            <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-[oklch(0.72_0.14_180)] text-primary-foreground hover:opacity-90 border-0 shadow-[0_0_24px_-8px_oklch(0.78_0.15_195/60%)]">
              {t("land.cta.create")} <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">{t("land.nav.signin")}</Button>
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-primary" /> {t("land.bullet.free")}</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-primary" /> {t("land.bullet.team")}</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-primary" /> {t("land.bullet.secure")}</span>
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
          <a href="#personas" className="hover:text-foreground">{t("land.personas.eyebrow")}</a>
          <a href="#features" className="hover:text-foreground">{t("land.footer.features")}</a>
          <a href="#pricing" className="hover:text-foreground">{t("land.nav.pricing")}</a>
          <a href="#faq" className="hover:text-foreground">{t("land.faq.eyebrow")}</a>
          <a href="#contact" className="hover:text-foreground">{t("land.footer.contact")}</a>
          <Link to="/login" className="hover:text-foreground">{t("land.footer.signin")}</Link>
        </div>
      </div>
    </footer>
  );
}

function ContactSection({ t }: { t: T }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send");
      }
      toast.success(t("land.contact.success"));
      setSent(true);
      setName(""); setEmail(""); setSubject(""); setMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("land.contact.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="border-t border-border/60">
      <div className="mx-auto max-w-3xl px-6 py-24 md:py-32">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
            <Mail className="size-3.5" /> {t("land.contact.eyebrow")}
          </div>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
            {t("land.contact.title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("land.contact.sub")}</p>
        </div>

        <form onSubmit={onSubmit} className="mt-10 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xl p-6 md:p-8 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">{t("land.contact.name")}</Label>
              <Input id="c-name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-email">{t("land.contact.email")}</Label>
              <Input id="c-email" type="email" required maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-subject">{t("land.contact.subject")}</Label>
            <Input id="c-subject" required maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-message">{t("land.contact.message")}</Label>
            <Textarea id="c-message" required maxLength={4000} rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <div className="flex items-center justify-between gap-3">
            {sent ? (
              <span className="text-xs text-primary">{t("land.contact.success")}</span>
            ) : <span />}
            <Button type="submit" disabled={loading} className="gap-2 bg-gradient-to-r from-primary to-[oklch(0.72_0.14_180)] text-primary-foreground hover:opacity-90 border-0 shadow-[0_0_24px_-8px_oklch(0.78_0.15_195/60%)]">
              {loading ? t("land.contact.sending") : t("land.contact.send")} <ArrowRight className="size-4" />
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
