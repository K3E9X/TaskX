import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Rocket,
  Cloud,
  Server,
  Boxes,
  Bot,
  Database,
  Settings2,
  Clock,
  LifeBuoy,
  Github,
  ArrowRight,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskXLogo } from "@/components/brand/TaskXLogo";
import { LangToggle, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "TaskX Docs — Guides, self-hosting, AI providers, API" },
      {
        name: "description",
        content:
          "Complete TaskX documentation: getting started, modules, self-hosting with Docker, AI providers (OpenRouter, Qwen, Z.ai), data model, cron jobs and troubleshooting.",
      },
      { property: "og:title", content: "TaskX Docs" },
      {
        property: "og:description",
        content:
          "Everything to run TaskX — cloud or self-hosted. Modules, AI providers, environment variables, cron jobs, troubleshooting.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocsPage,
});

type Section = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
  keywords: string;
};

function DocsPage() {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("getting-started");
  const tr = (fr: string, en: string) => (lang === "fr" ? fr : en);

  const sections: Section[] = useMemo(
    () => [
      {
        id: "getting-started",
        title: tr("Démarrage", "Getting started"),
        icon: Rocket,
        keywords: "start signup login account cloud demarrage compte",
        content: (
          <>
            <p className="lead">
              {tr(
                "TaskX est un workspace quotidien pour les pros cyber — veille CVE, snippets à variables, runbooks Markdown, diagrammes Mermaid, palette ⌘K et assistant IA contextuel, sur une seule page.",
                "TaskX is a personal daily workspace for cyber professionals — CVE watch, snippets with variables, Markdown runbooks, Mermaid diagrams, a ⌘K palette and a context-aware AI assistant, all on a single page."
              )}
            </p>
            <div className="grid md:grid-cols-2 gap-4 not-prose my-6">
              <a
                href="https://taskx.tech"
                className="group rounded-xl border border-border/70 bg-card/60 p-5 hover:border-primary/60 transition"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Cloud className="size-4 text-primary" /> {tr("Cloud managé", "Managed Cloud")}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {tr("Gratuit pour un usage personnel. Hébergé en Europe. Zéro infra.", "Free for personal use. EU-hosted. Zero infra to run.")}
                </p>
                <div className="mt-3 text-xs text-primary flex items-center gap-1">
                  taskx.tech <ArrowRight className="size-3 group-hover:translate-x-0.5 transition" />
                </div>
              </a>
              <a
                href="https://github.com/K3E9X/TaskX"
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-border/70 bg-card/60 p-5 hover:border-primary/60 transition"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Server className="size-4 text-primary" /> {tr("Auto-hébergé", "Self-hosted")}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {tr("Lance TaskX avec Docker Compose. Tes données restent chez toi.", "Run TaskX with Docker Compose. Own your data end-to-end.")}
                </p>
                <div className="mt-3 text-xs text-primary flex items-center gap-1">
                  github.com/K3E9X/TaskX <ArrowRight className="size-3 group-hover:translate-x-0.5 transition" />
                </div>
              </a>
            </div>
            <h3>{tr("Créer un compte (cloud)", "Create an account (cloud)")}</h3>
            <ol>
              <li>{tr("Ouvre", "Open")} <a href="https://taskx.tech">taskx.tech</a></li>
              <li>{tr("Inscris-toi avec email + mot de passe, Google ou Apple", "Sign up with email + password, Google or Apple")}</li>
              <li>{tr("Confirme ton email, connecte-toi — tu arrives sur le dashboard", "Confirm your email, sign in — you land on the dashboard")}</li>
            </ol>
          </>
        ),
      },
      {
        id: "modules",
        title: "Modules",
        icon: Boxes,
        keywords: "watch snippets notes runbooks diagrams todos meetings routines",
        content: (
          <>
            <p>{tr("Chaque fonctionnalité de TaskX est un module accessible depuis la sidebar ou la palette ⌘K.", "Everything in TaskX is a module you can access from the sidebar or the ⌘K palette.")}</p>
            <div className="not-prose grid md:grid-cols-2 gap-3 my-6">
              {[
                ["Dashboard", tr("Tuiles hybrides personnalisables : streaks, momentum, watch for you, todos.", "Hybrid customizable tiles: streaks, momentum, watch for you, todos.")],
                ["Watch", tr("Feed CVE + CTI, filtré par CVSS ≥ 7.5 avec enrichissement EPSS / KEV / PoC / CPE.", "CVE + CTI feed, filtered by CVSS ≥ 7.5 with EPSS / KEV / PoC / CPE enrichment.")],
                ["Stack", tr("Déclare tes produits (CPE). Les feeds sont scorés pour toi.", "Declare your products (CPE-based). Feeds get scored for you.")],
                ["Snippets", tr("Commandes réutilisables avec {{VARIABLES}}. L'IA peut en générer et les sauvegarder.", "Reusable commands with {{VARIABLES}}. AI can generate and save them.")],
                ["Notes", tr("Markdown, templates, [[wiki-links]] et backlinks bidirectionnels.", "Markdown, templates, [[wiki-links]] and bidirectional backlinks.")],
                ["Runbooks", tr("Procédures structurées pour IR, hardening, audits.", "Structured procedures for IR, hardening, audits.")],
                ["Diagrams", tr("Éditeur Mermaid live, preview zoomable, chat IA diagram-as-code.", "Mermaid live editor, zoomable preview, AI diagram-as-code chat.")],
                ["Todos", tr("Snooze, tags, priorité, récurrence, filtres intelligents.", "Snooze, tags, priority, recurrence, smart filters.")],
                ["Projects", tr("Regroupe notes / snippets / todos par engagement.", "Group notes / snippets / todos per engagement.")],
                ["Meetings", tr("Notes de meeting, décisions, actions à suivre.", "Meeting notes, decisions, action items.")],
                ["Routines", tr("Rituels récurrents (standup quotidien, brief matinal).", "Recurring rituals (daily standup, morning brief).")],
                [tr("Palette ⌘K", "⌘K palette"), tr("Palette de commandes globale — créer, chercher, naviguer.", "Global command palette — create, search, navigate.")],
                [tr("Assistant IA", "AI assistant"), tr("Chat flottant, contextuel (FR/EN).", "Floating chat, context-aware (FR/EN).")],
              ].map(([name, desc]) => (
                <div
                  key={name}
                  className="rounded-lg border border-border/70 bg-card/40 p-4"
                >
                  <div className="text-sm font-semibold">{name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{desc}</div>
                </div>
              ))}
            </div>
          </>
        ),
      },
      {
        id: "cloud-vs-self-hosted",
        title: tr("Cloud vs Auto-hébergé", "Cloud vs Self-hosted"),
        icon: Cloud,
        keywords: "cloud self hosted docker compose deploy hosting auto-heberge",
        content: (
          <>
            <p>
              {tr(
                "TaskX existe en deux versions. Même code, mêmes fonctionnalités — choisis où vivent tes données.",
                "TaskX ships in two flavors. Same codebase, same features — pick where your data lives."
              )}
            </p>
            <table>
              <thead>
                <tr>
                  <th>{tr("Critère", "Aspect")}</th>
                  <th>Cloud</th>
                  <th>{tr("Auto-hébergé", "Self-hosted")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{tr("Infra à gérer", "Infra to manage")}</td>
                  <td>{tr("Aucune", "None")}</td>
                  <td>Docker + Supabase</td>
                </tr>
                <tr>
                  <td>{tr("Mises à jour", "Updates")}</td>
                  <td>{tr("Automatiques", "Automatic")}</td>
                  <td>git pull + rebuild</td>
                </tr>
                <tr>
                  <td>{tr("Localisation des données", "Data location")}</td>
                  <td>{tr("Europe", "EU-hosted")}</td>
                  <td>{tr("Chez toi", "Yours")}</td>
                </tr>
                <tr>
                  <td>{tr("Fournisseur IA", "AI provider")}</td>
                  <td>{tr("Lovable AI (inclus)", "Lovable AI (included)")}</td>
                  <td>{tr("OpenRouter / Qwen / Z.ai (ta propre clé)", "OpenRouter / Qwen / Z.ai (bring your key)")}</td>
                </tr>
                <tr>
                  <td>{tr("Prix", "Price")}</td>
                  <td>{tr("Gratuit (usage perso)", "Free personal tier")}</td>
                  <td>{tr("Gratuit (MIT)", "Free (MIT)")}</td>
                </tr>
              </tbody>
            </table>
          </>
        ),
      },
      {
        id: "self-hosting",
        title: tr("Auto-hébergement", "Self-hosting"),
        icon: Server,
        keywords: "docker compose install linux server supabase bare metal bun auto-heberge",
        content: (
          <>
            <h3>{tr("Option A — Docker Compose (recommandé)", "Option A — Docker Compose (recommended)")}</h3>
            <pre><code>{`git clone https://github.com/K3E9X/TaskX.git
cd TaskX
cp .env.example .env    # ${tr("remplis Supabase + fournisseur IA", "fill in Supabase + AI provider")}
docker compose up -d`}</code></pre>
            <p>
              {tr("Ouvre", "Open")} <code>http://localhost:3000</code>. {tr(
                "Il te faut aussi un projet Supabase (Cloud tier gratuit ou Supabase self-hosted) pour l'auth + la DB.",
                "You still need a Supabase project (Cloud free tier or self-hosted Supabase) for auth + database."
              )}
            </p>
            <h3>{tr("Option B — Bare metal (Bun)", "Option B — Bare metal (Bun)")}</h3>
            <pre><code>{`git clone https://github.com/K3E9X/TaskX.git
cd TaskX
bun install
cp .env.example .env
bun run build
bun run start`}</code></pre>
            <p>
              {tr("Guide complet :", "Full guide:")} <a href="https://github.com/K3E9X/TaskX/blob/main/SELF_HOSTING.md">SELF_HOSTING.md</a>
            </p>
          </>
        ),
      },
      {
        id: "ai-providers",
        title: tr("Fournisseurs IA", "AI providers"),
        icon: Bot,
        keywords: "ai openrouter qwen zai z.ai lovable model chat fournisseur",
        content: (
          <>
            <p>
              {tr(
                "TaskX parle à n'importe quel endpoint compatible OpenAI ",
                "TaskX talks to any OpenAI-compatible "
              )}<code>/chat/completions</code>. {tr("Choisis-en un via", "Pick one via")} <code>AI_PROVIDER</code>.
            </p>
            <table>
              <thead>
                <tr>
                  <th>{tr("Fournisseur", "Provider")}</th>
                  <th><code>AI_PROVIDER</code></th>
                  <th>{tr("Offre gratuite", "Free tier")}</th>
                  <th>{tr("Modèle par défaut", "Default model")}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>OpenRouter</td><td><code>openrouter</code></td><td>{tr("Oui (modèles ", "Yes (")}<code>:free</code>{tr(")", " models)")}</td><td><code>qwen/qwen-2.5-72b-instruct:free</code></td></tr>
                <tr><td>Qwen (Alibaba)</td><td><code>qwen</code></td><td>{tr("Oui (DashScope)", "Yes (DashScope)")}</td><td><code>qwen-turbo</code></td></tr>
                <tr><td>Z.ai (GLM)</td><td><code>zai</code></td><td>{tr("Oui", "Yes")}</td><td><code>glm-4-flash</code></td></tr>
                <tr><td>Lovable</td><td><code>lovable</code></td><td>{tr("Cloud uniquement", "Cloud only")}</td><td><code>google/gemini-3-flash-preview</code></td></tr>
              </tbody>
            </table>
            <p>
              {tr("Seule", "Only")} <code>AI_API_KEY</code> {tr("est requise.", "is required.")} <code>AI_MODEL</code> {tr("et", "and")}{" "}
              <code>AI_BASE_URL</code> {tr("sont optionnelles.", "are optional overrides.")}
            </p>
          </>
        ),
      },
      {
        id: "data-security",
        title: tr("Données & sécurité", "Data model & security"),
        icon: Database,
        keywords: "rls row level security supabase roles donnees",
        content: (
          <>
            <ul>
              <li>{tr("Toutes les tables sont dans ", "All app tables live in ")}<code>public</code>{tr(" avec ", " with ")}<strong>{tr("RLS activée", "RLS enabled")}</strong>{tr(", scopée à ", ", scoped to ")}<code>auth.uid()</code>.</li>
              <li>{tr("Les rôles sont dans une table dédiée ", "Roles are stored in a dedicated ")}<code>user_roles</code>{tr(" + fonction ", " table + ")}<code>SECURITY DEFINER has_role()</code>{tr(" (jamais côté client).", " function (never client-side).")}</li>
              <li>{tr("La clé service-role est utilisée uniquement dans les fichiers ", "Service-role key is used only in ")}<code>*.server.ts</code>{tr(", jamais exposée au bundle client.", " files, never leaked to the client bundle.")}</li>
              <li>{tr("Les routes publiques sont sous ", "Public API routes live under ")}<code>/api/public/*</code>{tr(" et vérifient la signature de l'appelant dans le handler.", " and verify caller signatures inside the handler.")}</li>
            </ul>
          </>
        ),
      },
      {
        id: "env",
        title: tr("Variables d'environnement", "Environment variables"),
        icon: Settings2,
        keywords: "env variables config supabase environnement",
        content: (
          <>
            <p>{tr("Voir ", "See ")}<code>.env.example</code> {tr("dans le repo. Résumé :", "in the repo. Summary:")}</p>
            <pre><code>{`# Supabase (${tr("requis", "required")})
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ${tr("Fournisseur IA (requis — choisis-en un)", "AI provider (required — pick one)")}
AI_PROVIDER=openrouter
AI_API_KEY=

# ${tr("Optionnel", "Optional")}
AI_MODEL=
AI_BASE_URL=
PORT=3000`}</code></pre>
          </>
        ),
      },
      {
        id: "cron",
        title: tr("Cron & tâches de fond", "Cron & background jobs"),
        icon: Clock,
        keywords: "cron pg_cron scheduled feeds refresh purge taches",
        content: (
          <>
            <p>{tr("Les tâches planifiées tournent via ", "Scheduled tasks run via ")}<code>pg_cron</code> {tr("dans Postgres.", "inside Postgres.")}</p>
            <table>
              <thead>
                <tr><th>Job</th><th>{tr("Fréquence", "Schedule")}</th><th>{tr("Rôle", "Purpose")}</th></tr>
              </thead>
              <tbody>
                <tr><td><code>refresh-feeds-hourly</code></td><td>{tr("chaque heure", "every hour")}</td><td>{tr("Rafraîchit les feeds CVE / CTI", "Refresh CVE / CTI feeds")}</td></tr>
                <tr><td><code>purge-old-feeds-daily</code></td><td>{tr("quotidien", "daily")}</td><td>{tr("Applique la rétention 7 jours", "Enforce 7-day retention")}</td></tr>
                <tr><td><code>refresh-nuclei-index-daily</code></td><td>{tr("quotidien @ 04:00", "daily @ 04:00")}</td><td>{tr("Rafraîchit l'index Nuclei PoC", "Refresh Nuclei PoC index")}</td></tr>
                <tr><td><code>email-queue-dispatch</code></td><td>{tr("fréquent", "frequent")}</td><td>{tr("Envoie les emails transactionnels", "Dispatch transactional emails")}</td></tr>
              </tbody>
            </table>
            <p>{tr("Introspection depuis la console admin ou ", "Introspect from the admin console or query ")}<code>cron.job</code> / <code>cron.job_run_details</code>.</p>
          </>
        ),
      },
      {
        id: "troubleshooting",
        title: tr("Dépannage", "Troubleshooting"),
        icon: LifeBuoy,
        keywords: "error unauthorized ai 500 feeds depannage erreur",
        content: (
          <>
            <ul>
              <li><strong>{tr("« Unauthorized » sur les routes protégées", "\"Unauthorized\" on protected routes")}</strong>{tr(" : session manquante — déconnecte-toi puis reconnecte-toi, ou vérifie le middleware ", ": session missing — sign out/in, or check the ")}<code>Authorization</code> {tr("dans ", "middleware in ")}<code>src/start.ts</code>.</li>
              <li><strong>{tr("L'assistant IA renvoie 500", "AI assistant returns 500")}</strong>{tr(" : vérifie ", ": check ")}<code>AI_PROVIDER</code> + <code>AI_API_KEY</code> {tr("côté serveur, puis redémarre.", "server-side, restart.")}</li>
              <li><strong>{tr("Les feeds ne se rafraîchissent pas", "Feeds not refreshing")}</strong>{tr(" : vérifie ", ": check ")}<code>cron.job_run_details</code> {tr("pour ", "for ")}<code>refresh-feeds-hourly</code>.</li>
            </ul>
            <p>{tr("Toujours bloqué ? ", "Still stuck? ")}<a href="https://github.com/K3E9X/TaskX/issues" target="_blank" rel="noopener noreferrer">{tr("Ouvre une issue", "Open an issue")}</a>.</p>
          </>
        ),
      },
    ],
    [lang]
  );

  const filtered = query.trim()
    ? sections.filter((s) =>
        (s.title + " " + s.keywords).toLowerCase().includes(query.toLowerCase())
      )
    : sections;

  // scroll-spy
  useEffect(() => {
    const handler = () => {
      let current = sections[0].id;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top < 120) current = s.id;
      }
      setActive(current);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [sections]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <TaskXLogo className="h-6" />
            </Link>
            <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-semibold tracking-wider">
              <BookOpen className="size-3 mr-1" /> DOCS
            </Badge>
          </div>
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tr("Rechercher dans la doc…", "Search docs…")}
                className="pl-9 h-9 bg-card/60"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
            <a href="https://github.com/K3E9X/TaskX" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Github className="size-4" /> GitHub
              </Button>
            </a>
            <Link to="/login">
              <Button size="sm" className="bg-gradient-to-r from-primary to-[oklch(0.72_0.14_180)] text-primary-foreground border-0">
                {t("land.nav.start")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-10 pt-10 pb-24">
        {/* Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <div className="text-[11px] font-semibold tracking-wider text-muted-foreground mb-3">
              {tr("DOCUMENTATION", "DOCUMENTATION")}
            </div>
            <nav className="flex flex-col gap-1">
              {filtered.map((s) => {
                const Icon = s.icon;
                const isActive = active === s.id;
                return (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={`group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/60"
                    }`}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="truncate">{s.title}</span>
                    {isActive && <ChevronRight className="size-3 ml-auto" />}
                  </a>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-xs text-muted-foreground px-2 py-1">{tr("Aucun résultat.", "No matches.")}</div>
              )}
            </nav>
            <div className="mt-6 rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="text-xs font-semibold">{tr("Besoin d'aide ?", "Need help?")}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {tr("Ouvre une issue sur GitHub ou demande à l'assistant IA dans TaskX.", "Open an issue on GitHub or ping the AI assistant inside TaskX.")}
              </p>
              <a
                href="https://github.com/K3E9X/TaskX/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {tr("Signaler un problème", "Report an issue")} <ArrowRight className="size-3" />
              </a>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main>
          <div className="mb-10">
            <div className="text-xs font-semibold tracking-wider text-primary mb-2">{tr("DOC TASKX", "TASKX DOCS")}</div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              {tr("Tout pour faire tourner TaskX", "Everything to run TaskX")}
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl">
              {tr(
                "Cloud, auto-hébergement, fournisseurs IA, cron, variables d'environnement — la référence complète pour les pros cyber qui font tourner TaskX à leur façon.",
                "Cloud, self-hosted, AI providers, cron jobs, environment variables — the complete reference for individual cyber pros running TaskX their way."
              )}
            </p>
          </div>


          {/* Mobile search */}
          <div className="md:hidden mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search docs…"
                className="pl-9 h-9 bg-card/60"
              />
            </div>
          </div>

          <div className="space-y-16">
            {filtered.map((s) => {
              const Icon = s.icon;
              return (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="size-4" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">{s.title}</h2>
                  </div>
                  <div className="docs-prose">{s.content}</div>
                </section>
              );
            })}
            {filtered.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
                Nothing matches "{query}".
              </div>
            )}
          </div>

          <div className="mt-20 border-t border-border/60 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              MIT licensed. Made for cyber pros.
            </div>
            <div className="flex gap-2">
              <a href="https://github.com/K3E9X/TaskX" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Github className="size-4" /> Star on GitHub
                </Button>
              </a>
              <Link to="/login">
                <Button size="sm" className="gap-1.5 bg-gradient-to-r from-primary to-[oklch(0.72_0.14_180)] text-primary-foreground border-0">
                  Try TaskX <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
