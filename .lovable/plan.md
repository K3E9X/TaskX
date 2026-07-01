# Refonte Dashboard — plan en 4 étapes

## Étape 1 — Audit & nettoyage (bugs identifiés)

À la lecture du code (`src/routes/_authenticated/dashboard.tsx`, 881 lignes), plusieurs tuiles sont **mortes ou trompeuses** depuis la fusion Phase 1 :

- **`routines-today`** : la table `routines` a été supprimée, `routines = []` est codé en dur → la tuile affiche toujours « Aucune routine ». À supprimer (les récurrences vivent dans Todos maintenant).
- **`kpi-routines`** : affiche systématiquement `0/0`. À supprimer.
- **`tip`** : la table `usage_tips` a été supprimée, la tuile affiche uniquement le texte fallback `dash.tipSoon`. À supprimer.
- **`kpi-today`** duplique le titre de la tuile `today-todos` (même libellé « Todos aujourd'hui ») → confusion. Renommer le KPI en « Dus aujourd'hui ».
- Requête `recent-notes` ne filtre pas `kind` → mélange notes, runbooks et bookmarks liens. Filtrer sur `kind IN ('note','runbook')`.
- Le rôle par défaut pour `suggested-templates` est `architect` en dur. Le baser sur `profile_type` réel (fallback intelligent).

Vérification live à faire ensemble une fois signé sur le preview : chaque tuile renvoie-t-elle bien les bonnes données, les liens « Voir tout » atterrissent-ils sur la bonne page, le toggle star fonctionne-t-il ?

## Étape 2 — Nouvelles tuiles à valeur

Ajouter 5 tuiles qui exploitent les phases 3-4 déjà livrées :

- **Watch For You** : CVE/CTI filtrées par `stack_tags` du profil (highlight des tags qui matchent, comme sur `/feeds`). C'est LA tuile signature du produit.
- **Snippets récents** : 5 derniers snippets par `updated_at`, badge si contient `{{VAR}}`, clic → copie ou ouvre le dialog variables.
- **Diagrammes récents** : 4 derniers `diagrams`, mini-thumbnail Mermaid + titre.
- **Projets actifs** : projets non-archivés, avec compteurs (todos ouverts, notes liées).
- **Streak & activité 7 jours** : mini-heatmap 7 jours (basée sur `daily_activity`), + streak courant via `get_current_streak()` (déjà en DB).

Chaque tuile a un état vide utile (CTA « Créer ton premier X »).

## Étape 3 — Layout hybride

- **Layout figé par défaut** : 3 zones fixes bien composées → Hero + Watch/Priorité (Watch For You + Todos du jour + Overdue) / Ta journée (Snippets, Notes, Diagrammes récents) / Contexte (Meetings, Projets, Streak, KPIs compacts).
- **Bouton « Personnaliser »** (icône engrenage discrète en haut à droite) : active le mode drag/resize/hide existant (`taskx.dashboard.layout.v2`, on bump la version pour effacer les anciens layouts pollués par les widgets morts).
- Retire les widgets morts du `DEFAULT_LAYOUT`.

## Étape 4 — Refonte visuelle Cyber Cyan

- Titres de tuile en `font-mono` (JetBrains Mono, déjà chargé), uppercase, tracking étendu.
- Bordures teintées cyan (`border-primary/15`) + glow subtil au hover.
- KPIs : gros chiffres mono, delta vs J-1 en vert/rouge cyan-teinté.
- Hero : scanlines discrètes, gradient radial cyan derrière le briefing.
- Sévérités CVE gardent leur code couleur mais critical passe en cyan-red hybrid pour cohérence.

## Ordre d'exécution

1. Nettoyage (retirer routines-today, kpi-routines, tip ; fixer requêtes notes & KPI ; bump layout key).
2. Nouvelles tuiles (dans l'ordre : Watch For You → Snippets récents → Diagrammes → Projets → Streak).
3. Layout hybride + bouton Personnaliser.
4. Passe Cyber Cyan.
5. Vérif live ensemble sur le preview (tu te reconnectes, je pilote Playwright pour valider chaque tuile).

## Détails techniques

- Nouvelles queries via `useQuery` + client Supabase (RLS déjà en place sur snippets, diagrams, projects, feed_items, daily_activity).
- Streak : appel `supabase.rpc('get_current_streak')` (fonction déjà déployée).
- Watch For You : réutilise la logique de matching `stack_tags` déjà écrite dans `src/routes/_authenticated/feeds.tsx` — extraire dans `src/lib/stack-match.ts` pour partage.
- Layout : `DEFAULT_LAYOUT_V2` + `LAYOUT_KEY = "taskx.dashboard.layout.v2"` (les anciens layouts localStorage sont ignorés, remplacés par le nouveau défaut propre).
- i18n : nouvelles clés `dash.fg.*` en FR + EN, pas de string hardcodée.
- Aucune migration DB nécessaire — tout existe déjà.
