<div align="center">

# TaskX

### Your cyber craft, in a single tab.

**The personal daily workspace for cybersecurity pros** — automated CVE/CTI watch, notes, runbooks, todos, snippets, diagrams and a context-aware AI assistant. Preloaded and ready from day one.

[![Website](https://img.shields.io/badge/website-taskx.tech-06b6d4?style=flat-square)](https://taskx.tech)
[![Docs](https://img.shields.io/badge/docs-taskx.tech/docs-06b6d4?style=flat-square)](https://taskx.tech/docs)
[![License](https://img.shields.io/badge/license-open%20source-22d3ee?style=flat-square)](#license)
[![Stack](https://img.shields.io/badge/stack-TanStack%20Start%20%2B%20React%2019-0ea5e9?style=flat-square)](#tech-stack)
[![Self-host](https://img.shields.io/badge/self--host-Docker-38bdf8?style=flat-square)](./SELF_HOSTING.md)

[**Try Cloud (free)**](https://taskx.tech) · [**Self-host**](./SELF_HOSTING.md) · [**Documentation**](https://taskx.tech/docs) · [**Report a bug**](https://github.com/K3E9X/TaskX/issues)

<img width="1000" alt="taskx-demo" src="https://github.com/user-attachments/assets/8b54ed31-f6ed-41cd-bd83-9fdf1a305ae8" />

</div>

---

## Why TaskX

Every cyber pro ends up cobbling together the same improvised kit: Notion or Obsidian for notes and runbooks, a pile of RSS feeds for CVE/CTI watch, a Trello board for tasks, and X open in another tab to follow the community.

Nothing is built for the cyber workflow — it's all glued together by hand, and the context for any given day is scattered across ten tabs. Keeping the CVE/CTI watch current is a chore on its own.

**TaskX replaces that DIY stack with one fast personal workspace, preconfigured from the moment you sign up — no setup friction.** Free for personal use, no credit card.

Built for pentesters, security architects, SOC analysts, forensic investigators, and CISOs who want a single tab instead of ten.

---

## Features

### 🛡️ Watch — CVE & CTI, curated
- Automated feeds from **NVD, CISA KEV, MITRE, CERT-FR** and more
- Signal-only: filtered to **CVSS ≥ 7.5** (High / Critical) by default
- Enriched with **EPSS** exploit probability, **KEV** flag, and **Nuclei PoC** availability
- "My Stack" CPE matching — see only what actually hits your tech
- 7-day rolling window, auto-refresh, purge cron

### 📝 Notes & Runbooks
- Markdown editor with **wiki-style bidirectional linking** `[[Note title]]`
- Backlinks panel, note templates, full-text search
- Perfect for playbooks, IR notes, engagement writeups

### ✅ Todos & Projects
- Smart filters, snooze, momentum metrics, streak heatmap
- Group by project, quick-capture from anywhere

### ⚡ Snippets
- Variable snippets with `{{VAR}}` placeholders
- Save AI-generated commands in one click
- Fast paste for recurring `nmap`, `ffuf`, `crackmapexec`, IR one-liners

### 📊 Diagrams
- Mermaid.js editor with **AI diagram-as-code** generator
- Zoom / pan preview, export

### 🤖 Context-aware AI assistant
- Floating assistant available on every module
- Generates snippets, diagrams, note drafts
- Multi-provider: **Lovable AI** (Cloud), **OpenRouter**, **Qwen**, **Z.ai** (self-hosted)

### 🎛️ Dashboard
- Customizable hybrid layout with dynamic tiles
- "Watch For You", radial charts, streak heatmap, momentum

### 🔍 Extras
- **⌘K** command palette
- Bookmarks, meetings, routines
- Full **FR / EN** i18n
- Dark "Cyber Cyan" terminal theme

---

## Deployment

### ☁️ Cloud — [taskx.tech](https://taskx.tech)
Free for personal use. Zero setup. Managed backend, updates and AI provider.

### 🐳 Self-hosted
Own your data. Bring your own AI provider (Qwen / OpenRouter / Z.ai — all offer free tiers).

```bash
git clone https://github.com/K3E9X/TaskX.git
cd TaskX
cp .env.example .env         # configure Supabase + AI provider
docker compose up -d
```

Full guide: [**SELF_HOSTING.md**](./SELF_HOSTING.md) · Complete docs: [**taskx.tech/docs**](https://taskx.tech/docs)

---

## Tech stack

| Layer      | Tech                                                      |
| ---------- | --------------------------------------------------------- |
| Framework  | TanStack Start v1 · React 19 · Vite 7                     |
| Styling    | Tailwind CSS v4 · shadcn/ui                               |
| Backend    | Supabase (Postgres, Auth, RLS, pg_cron)                   |
| AI         | Lovable AI Gateway · OpenRouter · Qwen · Z.ai             |
| Runtime    | Edge (Cloudflare Workers) · Docker for self-host          |
| Diagrams   | Mermaid.js                                                |

---

## Project structure

```
src/
├── routes/              # File-based routing (TanStack Router)
│   ├── index.tsx        # Landing page
│   ├── docs.tsx         # In-app documentation
│   ├── _authenticated/  # Auth-gated app (dashboard, watch, notes…)
│   └── api/public/      # Webhooks & public endpoints
├── lib/
│   ├── *.functions.ts   # Client-callable server functions
│   ├── *.server.ts      # Server-only helpers
│   └── ai-provider.server.ts  # Multi-provider AI abstraction
├── components/          # UI components
└── integrations/supabase/  # Auto-generated client & types

supabase/migrations/     # Database schema & RLS policies
```

---

## Contributing

Issues and PRs welcome. For substantial changes, open an issue first to discuss the direction. TaskX is scoped as a **personal** workspace — SIEM / SOAR / multi-tenant SOC features are out of scope by design.

---

## License

Open source. See repository for details.

---

<div align="center">

**Built by cyber pros, for cyber pros.**

[taskx.tech](https://taskx.tech) · [Docs](https://taskx.tech/docs) · [X / Twitter](https://x.com)

</div>
