# Plateforme SecOps — Plan V1

Une plateforme web privée, style Notion (clair, dense, sobre, sans emoji ni logo "vibe"), hébergée sur Lovable Cloud, multi-utilisateurs (équipe : architecte sécurité, pentester, forensic, analyste), prête à brancher sur un nom de domaine perso.

## Sections incluses dans la V1

1. **Dashboard KPI** — vue d'accueil par profil : tâches en retard, risques ouverts, revues à venir, projets actifs, dernières CVE critiques, dernier "tip Linux du jour".
2. **To-do** — tâches avec priorité, échéance, projet lié, assignation à un membre de l'équipe.
3. **Notes** — éditeur markdown, tags, recherche plein-texte, partage équipe ou privé.
4. **Routines** — checklists récurrentes (daily/weekly) avec suivi de complétion.
5. **Projets Security by Design** — chaque projet a : description, statut, threat model lié, décisions (ADR), risques, revues, notes de réunion.
6. **Meeting notes** — modèle structuré (participants, décisions, actions), rattachables à un projet.
7. **Diagrammes** — éditeur Mermaid intégré (flow, séquence, architecture), versionnés, rattachables à un projet.
8. **Veille**
   - **CVE** : flux NVD filtré par mots-clés/produits.
   - **CTI** : flux RSS configurables (MISP communities publiques, blogs CERT, vendor threat intel).
   - **Veille X (Twitter)** : add-on où l'utilisateur connecte son compte X et suit une liste de comptes/keywords. *(nécessite des clés API X côté utilisateur ; voir section Technique)*
8. **Tip Linux du jour** — une commande/technique poussée chaque jour (banque interne au départ, enrichie par l'équipe ; possibilité de générer via Lovable AI).
9. **Add-ons / Quick links** — bookmarks catégorisés (Burp, MISP, OWASP, NIST, consoles cloud, Jira, etc.).
10. **Équipe & rôles** — chaque membre a un profil typé : `architect`, `pentester`, `forensic`, `analyst`. Le dashboard et certains filtres s'adaptent au rôle.

## Style visuel

- Inspiration Notion : fond clair off-white, typographie sans-serif neutre (Inter ou équivalent), beaucoup d'espace, séparateurs fins, accent unique discret (bleu encre ou vert sombre), pas d'ombres dramatiques, pas d'emoji, pas de gradients.
- Layout : sidebar gauche persistante (sections + projets), zone de contenu dense en colonne, top bar minimaliste (recherche globale + profil).
- Mode sombre disponible.

## Technique (section dev)

- **Stack** : TanStack Start + Tailwind + shadcn/ui (déjà en place), Lovable Cloud (Postgres + Auth + Storage).
- **Auth** : email/mot de passe + Google. Table `profiles` (display_name, role enum). Table `user_roles` séparée pour RBAC (pattern recommandé).
- **Schéma DB principal** :
  - `profiles`, `user_roles`
  - `todos`, `notes`, `routines`, `routine_runs`
  - `projects`, `project_members`, `threat_models`, `risks`, `decisions`, `reviews`, `meeting_notes`, `diagrams`
  - `bookmarks`, `daily_tips`, `tip_deliveries`
  - `feeds` (type: cve|cti|x|rss, config jsonb), `feed_items`
- **RLS** : activée partout. Notes/todos perso visibles par le owner ; ressources projet visibles par les `project_members` ; veille partagée à l'équipe.
- **Veille CVE** : server route cron (`/api/public/cron/refresh-feeds`) qui poll NVD 2.0 + RSS configurés et insère dans `feed_items`. Pas de clé requise pour NVD.
- **Veille X** : connecteur géré via add_secret par utilisateur (X API Bearer Token), server fn dédiée. Démarrer en V1 par un simple "follow keywords" ; les comptes suivis nécessitent X API v2 payante — sera précisé au moment de l'activer.
- **Diagrammes** : `mermaid` rendu côté client, source stockée en text.
- **Tip du jour** : table `daily_tips` (titre, commande, description, tags), sélection rotative par date ; bouton "générer un nouveau tip" via Lovable AI.

## Plan d'exécution (par lots, pour livrer vite et itérer)

1. **Lot 1 — Fondations** : activer Lovable Cloud, auth (email + Google), tables `profiles` / `user_roles`, layout app (sidebar + topbar), page login, route `_authenticated`, page Dashboard vide.
2. **Lot 2 — Productivité** : To-do, Notes, Routines, Bookmarks.
3. **Lot 3 — Projets & métier** : Projets Security by Design, Meeting notes, Diagrammes Mermaid, Risques/Décisions.
4. **Lot 4 — Veille** : CVE (NVD), RSS CTI, Tip Linux du jour, Dashboard KPI réel.
5. **Lot 5 — X add-on & équipe** : connecteur X, gestion équipe (invitations, rôles), polish responsive.

Chaque lot est livré et testable avant de passer au suivant.

## Hors V1 (à noter pour plus tard)

- Compliance mapping (NIST/ISO), vendor assessments, incident playbooks, secrets inventory, formations/certifs, glossaire — listés dans le brainstorm précédent, à ajouter en V2 une fois la base solide.

## Questions ouvertes (je peux démarrer sans, à confirmer en cours de route)

- Nom du produit (sinon : "SecDesk" en placeholder).
- Domaine perso à connecter (à faire après le premier déploiement).
- Acceptes-tu Google sign-in en plus de l'email/mot de passe ? (recommandé)

Si OK, je démarre par le **Lot 1**.
