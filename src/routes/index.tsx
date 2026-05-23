import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
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
  Rss,
  Sparkles,
  Shield,
  Zap,
  GitBranch,
  Bot,
  LayoutDashboard,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "TaskX — Cockpit sécurité pour architectes" },
      {
        name: "description",
        content:
          "TaskX réunit productivité, veille CVE/CTI et collaboration équipe sécurité dans un cockpit unique, rapide et minimaliste.",
      },
      { property: "og:title", content: "TaskX — Cockpit sécurité" },
      {
        property: "og:description",
        content:
          "Productivité, veille et RBAC pour architectes sécurité. Minimaliste, rapide, collaboratif.",
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
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <BackgroundFX />
      <Nav />
      <Hero />
      <LogoStrip />
      <FeatureGrid />
      <CockpitShowcase />
      <MetricsBand />
      <CTA />
      <Footer />
    </div>
  );
}

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

function Nav() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-background/60 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="size-6 rounded-md bg-gradient-to-br from-primary to-primary/40 shadow-[0_0_24px_-4px_oklch(0.68_0.16_270_/_0.7)]" />
          TaskX
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition">Produit</a>
          <a href="#cockpit" className="hover:text-foreground transition">Cockpit</a>
          <a href="#metrics" className="hover:text-foreground transition">Performance</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm">Se connecter</Button>
          </Link>
          <Link to="/login">
            <Button size="sm" className="gap-1.5">
              Commencer <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 pt-20 pb-28 md:pt-32 md:pb-40">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="max-w-3xl"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="size-3 text-primary" />
          Nouveau · RBAC équipe + admin dashboard
        </div>
        <h1 className="mt-6 text-5xl md:text-7xl font-semibold tracking-tight leading-[1.02]">
          Le cockpit des
          <span className="bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent"> architectes sécurité</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Productivité, veille CVE/CTI et collaboration d'équipe — réunies dans une interface
          rapide, minimaliste, conçue pour la vitesse de pensée.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/login">
            <Button size="lg" className="gap-2">
              Démarrer gratuitement <ArrowRight className="size-4" />
            </Button>
          </Link>
          <a href="#cockpit">
            <Button size="lg" variant="outline">Voir le cockpit</Button>
          </a>
        </div>
        <div className="mt-6 flex items-center gap-5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-primary" /> Sans carte bancaire</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-primary" /> RBAC natif</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-primary" /> Données chiffrées</span>
        </div>
      </motion.div>

      <HeroPreview />
    </section>
  );
}

function HeroPreview() {
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
          <div className="ml-3 text-xs text-muted-foreground font-mono">taskx.io / cockpit</div>
        </div>
        <div className="grid grid-cols-12 gap-4 p-5">
          <div className="col-span-12 md:col-span-8 rounded-xl border border-border/60 bg-background/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Vélocité d'équipe</div>
                <div className="mt-1 text-2xl font-semibold">+38.4%</div>
              </div>
              <div className="text-xs text-primary">en temps réel</div>
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
            <MiniCard label="CVE critiques" value="12" trend={chartB} type="line" />
            <MiniCard label="Tâches résolues" value="284" trend={chartC} type="bar" />
          </div>
          <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Shield, label: "Veille CTI" },
              { icon: GitBranch, label: "Diagrammes" },
              { icon: Bot, label: "Assistant IA" },
              { icon: Terminal, label: "Tips Sec" },
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

function LogoStrip() {
  const items = ["OWASP", "MITRE ATT&CK", "CVE", "NIST", "ISO 27001", "SOC 2"];
  return (
    <section className="border-y border-border/60 bg-card/30">
      <div className="mx-auto max-w-7xl px-6 py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs uppercase tracking-widest text-muted-foreground">
        <span className="opacity-60">Aligné avec</span>
        {items.map((i) => (
          <span key={i} className="font-mono">{i}</span>
        ))}
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: LayoutDashboard, title: "Cockpit unifié", desc: "Todos, notes, projets, routines et meetings sur un seul écran. Zéro contexte perdu." },
  { icon: Rss, title: "Veille temps réel", desc: "Flux CVE, CTI et RSS agrégés, dédupliqués et priorisés automatiquement." },
  { icon: Shield, title: "RBAC natif", desc: "Rôles admin/équipe, audit et permissions fines depuis le premier utilisateur." },
  { icon: GitBranch, title: "Diagrammes vivants", desc: "Threat models et architectures avec versionning intégré." },
  { icon: Bot, title: "Assistant IA", desc: "Résumés CVE, génération de notes et recherche contextuelle alimentée par Lovable AI." },
  { icon: Zap, title: "Vitesse Linear", desc: "Raccourcis clavier partout. Sub-100ms partout. Pensé pour les power users." },
];

function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24 md:py-32">
      <div className="max-w-2xl">
        <div className="text-xs uppercase tracking-widest text-primary">Produit</div>
        <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
          Tout ce dont une équipe sécurité a besoin.
        </h2>
        <p className="mt-4 text-muted-foreground">
          Une suite cohérente — pas une collection d'outils. Chaque module renforce les autres.
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

function CockpitShowcase() {
  return (
    <section id="cockpit" className="relative border-t border-border/60 bg-gradient-to-b from-card/40 to-background">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary">Cockpit</div>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
            Vos signaux faibles, en clair.
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Le dashboard admin agrège chaque source — CVE, jobs cron, activité utilisateurs,
            sévérité CTI — et révèle les tendances avant qu'elles ne deviennent des incidents.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Graphes d'inscriptions et d'activité par module",
              "Logs cron temps réel avec statut et trace",
              "Pie chart de sévérité CVE et volume par table",
              "Auto-refresh 60s, sans rechargement",
            ].map((i) => (
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
                { l: "Comptes", v: "1 248" },
                { l: "Todos", v: "8 392" },
                { l: "Veille 24h", v: "+412" },
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
              {["ingest-feeds · 14:02 · ok", "daily-digest · 08:00 · ok", "monthly-tip · J-2 · scheduled"].map((l) => (
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

function MetricsBand() {
  const stats = [
    { v: "<100ms", l: "Temps de réponse" },
    { v: "99.9%", l: "Disponibilité" },
    { v: "12 +", l: "Modules intégrés" },
    { v: "0", l: "Friction" },
  ];
  return (
    <section id="metrics" className="border-y border-border/60">
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

function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-28 md:py-36 text-center">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-4xl md:text-6xl font-semibold tracking-tight max-w-3xl mx-auto">
          Reprenez le contrôle de votre charge mentale sécurité.
        </h2>
        <p className="mt-5 text-muted-foreground max-w-xl mx-auto">
          Rejoignez les équipes qui pilotent leur veille et leurs opérations depuis TaskX.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/login">
            <Button size="lg" className="gap-2">
              Créer mon compte <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">Se connecter</Button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="size-4 rounded bg-gradient-to-br from-primary to-primary/40" />
          <span>© {new Date().getFullYear()} TaskX</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="hover:text-foreground">Produit</a>
          <a href="#cockpit" className="hover:text-foreground">Cockpit</a>
          <Link to="/login" className="hover:text-foreground">Connexion</Link>
        </div>
      </div>
    </footer>
  );
}
