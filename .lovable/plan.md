
# Plan — Options par métier (batch 1)

Les 5 features daily sont en place. On attaque maintenant le **per-rôle**, mais en **un seul angle transverse** qui sert immédiatement les 5 profils (pentester / architect / soc / forensic / ciso), plutôt que d'éparpiller 15 mini-features. On itérera ensuite.

## Ce qu'on livre dans ce batch

### 1. Bibliothèque de templates de notes (scoped par métier)

Une note "vierge" est inutile à 8h du matin. On ajoute une **galerie de templates** déclenchée depuis `/notes` (bouton "Nouveau depuis template") et depuis Quick Capture (`N` → option "template").

Templates livrés (markdown pré-rempli, FR/EN) :

- **Pentester** : Engagement scope, Recon notes, Finding (CVSS + repro + remediation), Daily standup pentest
- **Forensic** : Timeline d'investigation (table chrono), Hash/IOC scratchpad, Chain of custody, Write-up incident
- **Architect** : ADR (Architecture Decision Record), Threat model STRIDE, Design review checklist
- **SOC analyst** : Shift handover, Alert triage notes, Runbook quick-ref
- **CISO** : Comité sécurité (agenda + décisions), Risk register entry, Board update mensuel
- **Universal** : Meeting notes, Daily journal, Reading notes

Les templates sont **filtrés par défaut** sur le métier de l'utilisateur (`profiles.team_role`) avec un toggle "All roles".

### 2. Snippet manager (pentester first, utile à tous)

Nouvelle page `/snippets` + raccourci global `S` :
- Stockage de commandes/payloads souvent réutilisées (nmap, ffuf, sqlmap, kubectl, etc.)
- Champs : title, command, description, tags, language (bash/powershell/sql/python)
- Copy-to-clipboard 1 clic, recherche dans Cmd+K
- Pré-rempli avec ~15 snippets utiles par défaut au signup (selon métier)

### 3. Presets dashboard par métier

Au lieu d'un seul `DEFAULT_LAYOUT`, on définit 5 presets (`PRESET_BY_ROLE`) :
- **Pentester** : KPI overdue · today-todos · snippets récents · CVE critiques · notes récentes
- **Forensic** : timeline du jour · notes récentes · todos · hash scratchpad
- **CISO** : meetings semaine · digest CTI · todos haute prio · routines
- **Architect** : diagrammes récents · ADR notes · todos · feeds
- **SOC** : alert triage notes · runbooks · CVE feed · shift handover

Appliqué automatiquement à l'`OnboardingDialog` (étape "choix métier" écrit aussi `dashboard_widgets`). L'utilisateur peut toujours customiser.

## Détails techniques

- **Templates** : pas de table SQL, fichier `src/lib/note-templates.ts` (tableau de `{ id, role, title, body, lang }`). Renderer FR/EN par i18n.
- **Snippets** : nouvelle table `snippets` avec RLS user-scoped (`user_id`, `title`, `command text`, `description`, `language`, `tags text[]`).
- **Migration SQL** : seulement `snippets` + seed côté front au premier accès si table vide.
- **Universal search** : étendre `universal-search.functions.ts` pour inclure `snippets`.
- **Onboarding** : ajouter `setRolePresetWidgets()` qui écrit `profiles.dashboard_widgets` selon le rôle choisi.

## Ordre d'implémentation

1. Migration `snippets` (table + RLS)
2. `src/lib/note-templates.ts` (catalogue FR/EN)
3. `src/components/TemplateGalleryDialog.tsx` (modal de sélection)
4. Wiring : bouton dans `/notes` + option "from template" dans `QuickCaptureDialog`
5. `src/routes/_authenticated/snippets.tsx` (CRUD simple, liste + détail)
6. Ajout `/snippets` à la sidebar + raccourci `S` dans le quick-capture hook
7. `PRESET_BY_ROLE` dans `OnboardingDialog` + dashboard fallback
8. Étendre universal search aux snippets
9. i18n FR/EN

## Après ce batch

Batch 2 (à confirmer) : Pomodoro/engagement timer pour pentester, lien note↔diagramme pour architect, agenda visuel semaine pour CISO, hash/IOC validator scratchpad pour forensic.

