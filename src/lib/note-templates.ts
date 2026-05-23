// Note templates catalogue, scoped by role. No DB — pure TS.
// Each template has FR + EN versions.

export type TemplateRole =
  | "pentester" | "forensic" | "architect" | "soc" | "ciso" | "universal";

export type NoteTemplate = {
  id: string;
  role: TemplateRole;
  fr: { title: string; body: string };
  en: { title: string; body: string };
  tags?: string[];
};

export const NOTE_TEMPLATES: NoteTemplate[] = [
  // ── Pentester ──────────────────────────────────────────────
  {
    id: "pt-engagement-scope",
    role: "pentester",
    tags: ["pentest", "scope"],
    fr: {
      title: "Engagement — Scope",
      body: `# Engagement — Scope

## Client
- Nom :
- Contact :
- Période :

## Périmètre
- IPs / domaines :
- Hors scope :
- Tests autorisés : ☐ Web ☐ API ☐ Réseau ☐ Wi-Fi ☐ Phishing ☐ Physique

## Règles d'engagement
- Fenêtre horaire :
- Niveau d'intrusion :
- Contact urgence :

## Livrables attendus
- Rapport :
- Restitution :
`,
    },
    en: {
      title: "Engagement — Scope",
      body: `# Engagement — Scope

## Client
- Name:
- Contact:
- Period:

## Scope
- IPs / domains:
- Out of scope:
- Allowed tests: ☐ Web ☐ API ☐ Network ☐ Wi-Fi ☐ Phishing ☐ Physical

## Rules of engagement
- Time window:
- Intrusion level:
- Emergency contact:

## Deliverables
- Report:
- Debrief:
`,
    },
  },
  {
    id: "pt-recon",
    role: "pentester",
    tags: ["pentest", "recon"],
    fr: {
      title: "Recon — Notes",
      body: `# Recon

## Cible
- Domaine :
- IPs identifiées :

## Ports / services
| Host | Port | Service | Version |
|---|---|---|---|
|  |  |  |  |

## Sous-domaines
- 

## Tech stack
- 

## À creuser
- [ ] 
- [ ] 
`,
    },
    en: {
      title: "Recon — Notes",
      body: `# Recon

## Target
- Domain:
- Discovered IPs:

## Ports / services
| Host | Port | Service | Version |
|---|---|---|---|
|  |  |  |  |

## Subdomains
- 

## Tech stack
- 

## Follow-ups
- [ ] 
- [ ] 
`,
    },
  },
  {
    id: "pt-finding",
    role: "pentester",
    tags: ["pentest", "finding"],
    fr: {
      title: "Finding — Vulnérabilité",
      body: `# [TITRE] — Sévérité : ⚠️

## Résumé
Une phrase pour le management.

## CVSS
- Score : 0.0
- Vecteur : \`AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H\`

## Affecté
- URL / endpoint :
- Composant :

## Reproduction
1. 
2. 
3. 

## Preuve (PoC)
\`\`\`
[capture / payload]
\`\`\`

## Impact
- 

## Remédiation
- [ ] Court terme :
- [ ] Long terme :

## Références
- CWE :
- OWASP :
`,
    },
    en: {
      title: "Finding — Vulnerability",
      body: `# [TITLE] — Severity: ⚠️

## Summary
One-liner for management.

## CVSS
- Score: 0.0
- Vector: \`AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H\`

## Affected
- URL / endpoint:
- Component:

## Reproduction
1. 
2. 
3. 

## Proof (PoC)
\`\`\`
[screenshot / payload]
\`\`\`

## Impact
- 

## Remediation
- [ ] Short term:
- [ ] Long term:

## References
- CWE:
- OWASP:
`,
    },
  },
  // ── Forensic ───────────────────────────────────────────────
  {
    id: "fo-timeline",
    role: "forensic",
    tags: ["forensic", "timeline"],
    fr: {
      title: "Investigation — Timeline",
      body: `# Investigation — Timeline

**Incident :** 
**Analyste :** 
**Date début :** 

## Chronologie
| Horodatage (UTC) | Source | Événement | Notes |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |

## Artefacts collectés
- 

## Hypothèses
- 

## Prochaines actions
- [ ] 
`,
    },
    en: {
      title: "Investigation — Timeline",
      body: `# Investigation — Timeline

**Incident:** 
**Analyst:** 
**Start date:** 

## Chronology
| Timestamp (UTC) | Source | Event | Notes |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |

## Collected artifacts
- 

## Hypotheses
- 

## Next actions
- [ ] 
`,
    },
  },
  {
    id: "fo-ioc-scratchpad",
    role: "forensic",
    tags: ["forensic", "ioc"],
    fr: {
      title: "Hash / IOC scratchpad",
      body: `# IOC scratchpad

## Hashes
| Type | Valeur | Source | Verdict |
|---|---|---|---|
| SHA256 |  |  |  |
| MD5 |  |  |  |

## IPs / Domaines
| Indicateur | Type | Première vue | Notes |
|---|---|---|---|
|  |  |  |  |

## URLs
- 

## À vérifier
- [ ] VirusTotal
- [ ] AbuseIPDB
- [ ] OTX
`,
    },
    en: {
      title: "Hash / IOC scratchpad",
      body: `# IOC scratchpad

## Hashes
| Type | Value | Source | Verdict |
|---|---|---|---|
| SHA256 |  |  |  |
| MD5 |  |  |  |

## IPs / Domains
| Indicator | Type | First seen | Notes |
|---|---|---|---|
|  |  |  |  |

## URLs
- 

## To check
- [ ] VirusTotal
- [ ] AbuseIPDB
- [ ] OTX
`,
    },
  },
  {
    id: "fo-chain-of-custody",
    role: "forensic",
    tags: ["forensic", "coc"],
    fr: {
      title: "Chain of custody",
      body: `# Chain of custody

**Affaire :** 
**Pièce :** 
**Hash (SHA256) :** 

| Date | Action | Personne | Lieu | Signature |
|---|---|---|---|---|
|  | Saisie |  |  |  |
|  | Imagerie |  |  |  |
|  | Stockage |  |  |  |
`,
    },
    en: {
      title: "Chain of custody",
      body: `# Chain of custody

**Case:** 
**Item:** 
**Hash (SHA256):** 

| Date | Action | Person | Location | Signature |
|---|---|---|---|---|
|  | Seizure |  |  |  |
|  | Imaging |  |  |  |
|  | Storage |  |  |  |
`,
    },
  },
  // ── Architect ──────────────────────────────────────────────
  {
    id: "ar-adr",
    role: "architect",
    tags: ["architecture", "adr"],
    fr: {
      title: "ADR — Décision d'architecture",
      body: `# ADR-XXX : [Titre court]

**Date :** 
**Statut :** Proposé | Accepté | Déprécié

## Contexte
Pourquoi cette décision est nécessaire.

## Décision
Ce qu'on décide.

## Alternatives considérées
- A : 
- B : 

## Conséquences
- ✅ Positives :
- ⚠️ Négatives :
- 🔁 À revoir si :
`,
    },
    en: {
      title: "ADR — Architecture Decision Record",
      body: `# ADR-XXX: [Short title]

**Date:** 
**Status:** Proposed | Accepted | Deprecated

## Context
Why this decision is needed.

## Decision
What we decide.

## Alternatives considered
- A: 
- B: 

## Consequences
- ✅ Positive:
- ⚠️ Negative:
- 🔁 Revisit if:
`,
    },
  },
  {
    id: "ar-stride",
    role: "architect",
    tags: ["architecture", "threat-model"],
    fr: {
      title: "Threat model — STRIDE",
      body: `# Threat model — STRIDE

**Système :** 
**Diagramme :** [lien]

| Catégorie | Menace | Composant | Atténuation | Priorité |
|---|---|---|---|---|
| Spoofing |  |  |  |  |
| Tampering |  |  |  |  |
| Repudiation |  |  |  |  |
| Information disclosure |  |  |  |  |
| Denial of service |  |  |  |  |
| Elevation of privilege |  |  |  |  |
`,
    },
    en: {
      title: "Threat model — STRIDE",
      body: `# Threat model — STRIDE

**System:** 
**Diagram:** [link]

| Category | Threat | Component | Mitigation | Priority |
|---|---|---|---|---|
| Spoofing |  |  |  |  |
| Tampering |  |  |  |  |
| Repudiation |  |  |  |  |
| Information disclosure |  |  |  |  |
| Denial of service |  |  |  |  |
| Elevation of privilege |  |  |  |  |
`,
    },
  },
  // ── SOC ────────────────────────────────────────────────────
  {
    id: "soc-handover",
    role: "soc",
    tags: ["soc", "handover"],
    fr: {
      title: "Shift handover",
      body: `# Handover — ${"${date}"}

## Alertes en cours
- 

## Tickets ouverts
- 

## Points d'attention
- 

## Actions pour le shift suivant
- [ ] 
`,
    },
    en: {
      title: "Shift handover",
      body: `# Handover — ${"${date}"}

## Open alerts
- 

## Open tickets
- 

## Watch list
- 

## Actions for next shift
- [ ] 
`,
    },
  },
  {
    id: "soc-triage",
    role: "soc",
    tags: ["soc", "triage"],
    fr: {
      title: "Triage d'alerte",
      body: `# Triage — [ID alerte]

**Source :** 
**Sévérité :** 
**Asset :** 

## Contexte
- 

## Indicateurs
- 

## Verdict
☐ Vrai positif  ☐ Faux positif  ☐ À escalader

## Actions
- [ ] 
`,
    },
    en: {
      title: "Alert triage",
      body: `# Triage — [Alert ID]

**Source:** 
**Severity:** 
**Asset:** 

## Context
- 

## Indicators
- 

## Verdict
☐ True positive  ☐ False positive  ☐ Escalate

## Actions
- [ ] 
`,
    },
  },
  // ── CISO ───────────────────────────────────────────────────
  {
    id: "ciso-comite",
    role: "ciso",
    tags: ["ciso", "comite"],
    fr: {
      title: "Comité sécurité — Agenda & décisions",
      body: `# Comité sécurité — ${"${date}"}

**Participants :** 

## Agenda
1. 
2. 
3. 

## Décisions
- 

## Risques discutés
| Risque | Niveau | Décision |
|---|---|---|
|  |  |  |

## Actions
- [ ] Responsable | échéance | action
`,
    },
    en: {
      title: "Security committee — Agenda & decisions",
      body: `# Security committee — ${"${date}"}

**Attendees:** 

## Agenda
1. 
2. 
3. 

## Decisions
- 

## Risks discussed
| Risk | Level | Decision |
|---|---|---|
|  |  |  |

## Actions
- [ ] Owner | due | action
`,
    },
  },
  {
    id: "ciso-risk-entry",
    role: "ciso",
    tags: ["ciso", "risk"],
    fr: {
      title: "Risk register — Entrée",
      body: `# Risque : [Titre]

**ID :** R-
**Propriétaire :** 
**Date d'identification :** 

## Description
- 

## Évaluation
- Probabilité : Faible | Moyenne | Élevée
- Impact : Faible | Moyen | Élevé
- Niveau résiduel : 

## Traitement
☐ Accepter  ☐ Réduire  ☐ Transférer  ☐ Éviter

## Plan d'action
- [ ] 

## Revue
- Prochaine : 
`,
    },
    en: {
      title: "Risk register — Entry",
      body: `# Risk: [Title]

**ID:** R-
**Owner:** 
**Identified on:** 

## Description
- 

## Assessment
- Likelihood: Low | Medium | High
- Impact: Low | Medium | High
- Residual level: 

## Treatment
☐ Accept  ☐ Mitigate  ☐ Transfer  ☐ Avoid

## Action plan
- [ ] 

## Review
- Next: 
`,
    },
  },
  {
    id: "ciso-board",
    role: "ciso",
    tags: ["ciso", "board"],
    fr: {
      title: "Board update — Mensuel",
      body: `# Board update — ${"${date}"}

## Faits marquants
- 

## KPI sécurité
| Indicateur | Valeur | Tendance |
|---|---|---|
| MTTD |  |  |
| MTTR |  |  |
| Vulns critiques ouvertes |  |  |
| Phishing click rate |  |  |

## Risques top 3
1. 
2. 
3. 

## Demandes
- 
`,
    },
    en: {
      title: "Board update — Monthly",
      body: `# Board update — ${"${date}"}

## Highlights
- 

## Security KPIs
| Metric | Value | Trend |
|---|---|---|
| MTTD |  |  |
| MTTR |  |  |
| Open critical vulns |  |  |
| Phishing click rate |  |  |

## Top 3 risks
1. 
2. 
3. 

## Asks
- 
`,
    },
  },
  // ── Universal ─────────────────────────────────────────────
  {
    id: "u-meeting",
    role: "universal",
    fr: {
      title: "Réunion — Notes",
      body: `# Réunion — [Titre]

**Date :** 
**Participants :** 

## Agenda
- 

## Notes
- 

## Décisions
- 

## Actions
- [ ] @qui — quoi — échéance
`,
    },
    en: {
      title: "Meeting — Notes",
      body: `# Meeting — [Title]

**Date:** 
**Attendees:** 

## Agenda
- 

## Notes
- 

## Decisions
- 

## Actions
- [ ] @who — what — due
`,
    },
  },
  {
    id: "u-journal",
    role: "universal",
    fr: {
      title: "Journal du jour",
      body: `# Journal — ${"${date}"}

## Ce que j'ai fait
- 

## Ce qui m'a bloqué
- 

## À faire demain
- [ ] 
`,
    },
    en: {
      title: "Daily journal",
      body: `# Journal — ${"${date}"}

## What I did
- 

## What blocked me
- 

## Tomorrow
- [ ] 
`,
    },
  },
];

export function renderTemplate(tpl: NoteTemplate, lang: "fr" | "en"): { title: string; body: string } {
  const today = new Date().toISOString().slice(0, 10);
  const raw = tpl[lang];
  return {
    title: raw.title,
    body: raw.body.replace(/\$\{date\}/g, today),
  };
}

// Default dashboard widgets per role (used by OnboardingDialog).
// Widget IDs must match those in src/routes/_authenticated/dashboard.tsx.
export const PRESET_BY_ROLE: Record<string, string[]> = {
  pentester: ["kpi-overdue", "kpi-today", "today-todos", "overdue-todos", "recent-notes", "tip"],
  forensic: ["kpi-today", "kpi-done", "today-todos", "recent-notes", "done-yesterday", "tip"],
  architect: ["kpi-today", "kpi-done", "today-todos", "recent-notes", "routines-today", "tip"],
  soc: ["kpi-overdue", "kpi-today", "today-todos", "overdue-todos", "routines-today", "recent-notes"],
  ciso: ["kpi-today", "kpi-routines", "today-todos", "routines-today", "recent-notes", "tip"],
  other: ["kpi-overdue", "kpi-today", "kpi-routines", "kpi-done", "today-todos", "recent-notes"],
};
