# Plan — Top 5 features daily UX

Objectif : créer l'habitude d'ouvrir TaskX chaque matin, avec friction zéro et sentiment de progression. Tout reste **workspace personnel**, aucune feature SOC/équipe.

---

## 1. Morning Brief (briefing quotidien IA)

**But** : à l'ouverture, un encart en haut du `/dashboard` qui résume la journée.

- Nouveau composant `MorningBrief.tsx` affiché en tête du dashboard
- Server function `generateMorningBrief` (`src/lib/morning-brief.functions.ts`) :
  - Récupère via `requireSupabaseAuth` : todos du jour + en retard, meetings du jour, top 5 feed_items non lus `severity >= high` des dernières 24h, streak en cours
  - Appelle Lovable AI (`google/gemini-2.5-flash`) avec un prompt FR/EN qui produit 3-5 bullets actionnables ("Voici ta journée")
  - Retourne `{ summary, stats: { todos, meetings, criticalCves, streak } }`
- Cache local 4h (TanStack Query `staleTime`) pour éviter les regenerations
- Bouton "Régénérer" + "Continue where you left off" (dernière note/diagramme édité via `updated_at desc limit 1`)

## 2. Quick Capture (friction zéro)

**But** : capturer une todo, note ou bookmark depuis n'importe où en <1s.

- Hook global `useQuickCapture` qui écoute `T`, `N`, `B` (hors input/textarea) → ouvre un mini-dialog
- Composant `QuickCaptureDialog.tsx` : input unique, parse intelligemment :
  - `#tag` → tag automatique
  - `!high` / `!low` → priorité (todos)
  - `@tomorrow`, `@friday` → due_at (todos)
  - URL détectée → bascule auto en bookmark
- Insert direct dans Supabase puis `toast.success` + lien "Ouvrir"
- Monté dans `_authenticated.tsx` à côté de `CommandPalette`

## 3. Onboarding métier + personnalisation

**But** : `team_role` existe déjà, l'exploiter pour adapter l'expérience.

- À la première connexion (profile `created_at` < 1 min OU `display_name` vide), modal d'onboarding 3 étapes :
  1. Choix métier (pentester / architect / soc / forensic / ciso / other)
  2. Choix 3-5 widgets prioritaires dashboard
  3. Préférences feeds (cocher sources par défaut déjà créées)
- Nouvelle colonne `profiles.dashboard_widgets text[]` (migration)
- Le dashboard lit `dashboard_widgets` et affiche dans cet ordre ; fallback = preset par métier (mapping en dur côté front)

## 4. Streak & progression

**But** : montrer que l'utilisateur avance.

- Nouvelle table `daily_activity` : `user_id`, `day date`, `todos_done int`, `notes_edited int`, `feed_read int`, `unique (user_id, day)`
- Trigger ou logique côté serverFn incrémente quand : todo passée à `done`, note updated, feed_item passé à `read`
- Composant `StreakBadge.tsx` dans le header : flamme + nombre de jours consécutifs (calcul SQL `lag()` sur `day`)
- Mini-graph 14 derniers jours dans le Morning Brief (sparkline)

## 5. Universal Search dans Cmd+K

**But** : Cmd+K trouve aussi les contenus (notes, todos, bookmarks, diagrams, runbooks, feed_items).

- Étendre `CommandPalette.tsx` : quand input.length >= 2, débounce 200ms puis appel serverFn `universalSearch(query)`
- ServerFn fait 6 requêtes parallèles (`.ilike('title', '%q%')`/`.textSearch`) limit 5 chacune
- Affichage groupé : Navigation / Notes / Todos / Bookmarks / Diagrams / Feeds
- Sélection → navigate vers la page concernée avec query param `?focus=<id>` que chaque page consomme pour highlight/scroll

---

## Ordre d'implémentation (un seul gros patch)

1. Migration SQL : `profiles.dashboard_widgets`, table `daily_activity`, fonction `get_streak(uuid)`
2. ServerFns : `morning-brief.functions.ts`, `universal-search.functions.ts`, `activity.functions.ts`
3. Composants : `MorningBrief`, `QuickCaptureDialog`, `StreakBadge`, `OnboardingDialog`
4. Wiring : `_authenticated.tsx` (QuickCapture + StreakBadge dans header + Onboarding au mount), `dashboard.tsx` (MorningBrief en tête), `CommandPalette.tsx` (universal search)
5. i18n FR/EN pour tous les nouveaux labels

## Détails techniques

- Lovable AI : appel direct via `fetch` vers `https://ai.gateway.lovable.dev/v1/chat/completions` avec `process.env.LOVABLE_API_KEY` côté serverFn
- `daily_activity` incrémenté côté front après chaque mutation pertinente (simple, pas de trigger)
- Streak : `select count(*) from generate_series(...) where exists ...` ou parcours JS sur 60 jours
- Universal search : pas de FTS Postgres pour rester simple, `ilike` suffit à ce volume

## Après ces 5 points

On enchaîne sur les options par métier : templates notes pentester, timeline forensic, agenda semaine CISO, bibliothèque diagrammes architecte.