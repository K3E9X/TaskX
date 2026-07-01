
# TaskX — Enrichir le Watch + Notes en outil indispensable

Objectif : passer d'un agrégateur RSS dédupliqué à un vrai workspace perso pour cyber pros (pentester, DFIR, SOC, CISO), sans dériver vers un outil d'équipe SOC/CTI.

## Phase 1 — Priorisation réelle du Watch (grosse valeur, faible coût)

### 1.1 Enrichissement CVE : EPSS + KEV + PoC
- Ajouter colonnes sur `feed_items` : `epss_score numeric`, `epss_percentile numeric`, `is_kev bool`, `has_poc bool`, `poc_urls text[]`, `cve_id text`.
- Extraire le `cve_id` (regex `CVE-\d{4}-\d+`) au moment de l'ingestion.
- À l'ingestion d'un item CVE, batch-fetch :
  - **EPSS** : `https://api.first.org/data/v1/epss?cve=CVE-...` (public, sans clé)
  - **KEV** : match contre la liste CISA KEV déjà ingérée
  - **PoC** : `https://api.github.com/search/repositories?q=CVE-...` (limite 60/h non-auth, suffisant en batch cron) + check si le CVE apparaît dans `projectdiscovery/nuclei-templates` (dump JSON téléchargé quotidiennement)
- UI Watch : 3 badges compacts à côté du CVSS → `EPSS 87%`, `KEV`, `PoC`.
- Tri par défaut : `KEV DESC, epss_percentile DESC, cvss DESC`.

### 1.2 Sources CERT-FR + CERT-EU
- Ajouter dans le seed `handle_new_user()` et via un one-shot migration pour les users existants :
  - CERT-FR avis : `https://www.cert.ssi.gouv.fr/avis/feed/` (CTI, high)
  - CERT-FR alertes : `https://www.cert.ssi.gouv.fr/alerte/feed/` (CTI, critical)
  - CERT-EU news : `https://cert.europa.eu/publications/threat-intelligence/rss` (CTI, medium)

### 1.3 « Mon Stack » — matching CPE
- Nouvelle table `user_stack_items` : `id`, `user_id`, `vendor`, `product`, `version_min`, `version_max`, `cpe_prefix` (ex: `cpe:2.3:a:microsoft:exchange_server`), `label`, `created_at`.
- UI : `/stack` (ou dans `/profile`) — CRUD simple + autocomplete depuis NVD CPE search (`https://services.nvd.nist.gov/rest/json/cpes/2.0?keywordSearch=...`).
- Au moment de l'ingestion CVE (NVD renvoie déjà les CPE `configurations.nodes.cpeMatch`) → stocker les CPE affectés dans `feed_items.affected_cpes text[]`.
- Nouveau flag calculé `matches_my_stack` côté requête (JOIN sur `user_stack_items.cpe_prefix`).
- Onglet « For You » sur `/feeds` : filtre `matches_my_stack = true`. Badge orange « Your stack » sur les cartes concernées.

## Phase 2 — Notes de niveau pro

### 2.1 Templates de notes livrés
- Nouvelle table `note_templates` (seedée, lecture pour tous authentifiés, écriture admin) : `id`, `slug`, `title`, `category`, `body_markdown`, `variables jsonb`.
- Templates à livrer :
  - **SITREP CSIRT** (situation report avec sections What/Impact/Actions/Timeline)
  - **Timeline DFIR** (tableau chronologique horodaté)
  - **Note d'archi sécu** (contexte, menaces, contrôles, résiduel)
  - **Rapport pentest** (scope, findings CVSS, PoC, remédiation)
  - **Playbook IR NIS2** (checklists 24h notification / 72h rapport)
- UI : bouton `+ Nouvelle note depuis template` dans `/notes` → picker → duplique le markdown dans une nouvelle note.

### 2.2 Liens bidirectionnels `[[Note title]]`
- Parser markdown côté client : détecter `[[...]]`, rendre en lien cliquable vers la note ciblée (match par titre, case-insensitive).
- Nouvelle table `note_links` (dérivée, rebuild sur save) : `source_note_id`, `target_note_id`.
- Panneau latéral sur une note : « Backlinks » (liste des notes qui pointent vers celle-ci).
- Autocomplete `[[` dans l'éditeur.

## Phase 3 — AI assistant plus utile

### 3.1 Defang + structuration IOC
- Nouveau bouton dans `GlobalAssistant` : « Structure IOCs » → colle un blob → l'assistant retourne un JSON `{ipv4:[], domains:[], hashes:{md5,sha1,sha256}, urls:[], emails:[]}` avec option "defang" (`1.2.3.4` → `1.2.3[.]4`, `http://` → `hxxp://`).
- Système de prompt dédié, output structuré (Zod schema via AI SDK `Output.object`).
- Bouton "Save as note" pour envoyer le résultat vers `/notes`.

### 3.2 « Suis-je concerné ? » sur une CVE
- Sur une carte CVE dans `/feeds` : bouton `Am I affected?` → passe la CVE + `user_stack_items` de l'user à l'assistant → réponse structurée : `{concerned: bool, matched_products: [], reasoning: string, recommended_actions: []}`.

## Hors scope (explicitement refusé)
- Pas de tagging MITRE ATT&CK structuré, pas de vue par technique. Les users tapent `T1566.001` en texte libre s'ils veulent.
- Pas de génération de règles Sigma/KQL/SPL dans l'assistant. Si vraiment demandé plus tard : ajout de snippets templates paramétrés dans le module `/snippets` existant, pas de feature IA dédiée.

## Ordre d'exécution
1. **Phase 1.1 + 1.2** (migration DB + ingestion enrichie + sources) — livrable visible immédiatement dans `/feeds`
2. **Phase 1.3 Mon Stack** — nécessite UI CRUD, plus long mais différenciateur #1
3. **Phase 2.1 templates** puis **2.2 backlinks**
4. **Phase 3.1 IOC** puis **3.2 « Suis-je concerné ? »**

## Détails techniques

- Cron enrichissement : job existant de refresh feeds ajoute les appels EPSS/GitHub après ingestion, avec cache 24h par CVE ID.
- Nuclei templates : petit endpoint interne `/api/public/cron/refresh-nuclei-index` qui télécharge l'index du repo une fois par jour et stocke la liste des CVE couvertes dans une table `nuclei_cve_index`.
- CPE matching : purement SQL (`LIKE cpe_prefix || '%'` sur `affected_cpes` unnest), pas de service externe.
- Core memory à mettre à jour à la fin : ajouter que TaskX gère désormais un « stack déclaré » (CPE) et des templates de notes livrés — reste centré perso, toujours pas MITRE/Sigma/SIEM.
