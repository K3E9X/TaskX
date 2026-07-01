# TaskX Documentation

TaskX is a personal daily workspace for cyber professionals — CVE watch,
snippets with variables, Markdown runbooks, Mermaid diagrams, a ⌘K palette
and a context-aware AI assistant, all on a single page.

- Cloud version (managed, free for personal use): https://taskx.tech
- Source: https://github.com/K3E9X/TaskX
- Self-hosting guide: [`SELF_HOSTING.md`](./SELF_HOSTING.md)

---

## Table of contents

1. [Getting started](#1-getting-started)
2. [Modules overview](#2-modules-overview)
3. [Deployment options](#3-deployment-options)
4. [AI providers](#4-ai-providers)
5. [Data model & security](#5-data-model--security)
6. [Environment variables](#6-environment-variables)
7. [Cron jobs & background work](#7-cron-jobs--background-work)
8. [Troubleshooting](#8-troubleshooting)
9. [Contributing](#9-contributing)

---

## 1. Getting started

### Managed cloud (recommended)

1. Open <https://taskx.tech>
2. Create an account (email + password, Google, or Apple)
3. Confirm your email, log in — you land on the dashboard

### Self-hosted

See [`SELF_HOSTING.md`](./SELF_HOSTING.md) or jump to
[Deployment options](#3-deployment-options) below.

---

## 2. Modules overview

| Module        | What it does                                                                                       |
|---------------|----------------------------------------------------------------------------------------------------|
| **Dashboard** | Hybrid customizable tiles: streaks, momentum, watch for you, todos, heatmap.                       |
| **Watch**     | CVE + CTI feed, filtered by CVSS ≥ 7.5 and enriched with EPSS / KEV / PoC / CPE.                   |
| **Stack**     | Declare your products (CPE-based). Feeds get scored against your stack for "For You".              |
| **Snippets**  | Reusable commands with `{{VARIABLES}}`. AI assistant can generate + save them.                     |
| **Notes**     | Markdown notes, templates, `[[wiki-links]]` and bidirectional backlinks.                           |
| **Runbooks**  | Structured procedures for IR, hardening, audits.                                                   |
| **Diagrams**  | Mermaid live editor, zoomable preview, AI chat for diagram-as-code.                                |
| **Todos**     | Snooze, tags, priority, recurrence, smart filters.                                                  |
| **Projects**  | Group notes / snippets / todos per engagement.                                                     |
| **Meetings** | Meeting notes, decisions, action items.                                                            |
| **Routines**  | Recurring rituals (daily standup, morning brief).                                                  |
| **Bookmarks** | External links, tagged.                                                                            |
| **⌘K palette**| Global command palette — create, search, navigate.                                                 |
| **AI assistant** | Floating chat, context-aware (knows which page you're on). Supports FR/EN.                      |
| **Admin**     | Usage tips, feed sources, cron introspection (admin role only).                                    |

---

## 3. Deployment options

### Option A — Managed cloud

- URL: <https://taskx.tech>
- Zero infra to run, backups + updates handled.
- Free tier for personal use, EU-hosted data.

### Option B — Self-hosted (Docker)

```bash
git clone https://github.com/K3E9X/TaskX.git
cd TaskX
cp .env.example .env      # fill in Supabase + AI provider
docker compose up -d
```

Open <http://localhost:3000>.

The `docker-compose.yml` runs the app container. You still need a Supabase
project (Cloud free tier or self-hosted Supabase) for auth + database.

### Option C — Self-hosted (bare metal)

```bash
git clone https://github.com/K3E9X/TaskX.git
cd TaskX
bun install
cp .env.example .env
bun run build
bun run start
```

---

## 4. AI providers

TaskX uses an abstraction layer (`src/lib/ai-provider.server.ts`) that talks
to any OpenAI-compatible `/chat/completions` endpoint. Pick one via
`AI_PROVIDER`:

| Provider     | `AI_PROVIDER` | Free tier                                      | Default model                       |
|--------------|---------------|------------------------------------------------|-------------------------------------|
| OpenRouter   | `openrouter`  | Yes (`:free` models like Qwen-2.5-72B)         | `qwen/qwen-2.5-72b-instruct:free`   |
| Qwen (Alibaba)| `qwen`       | Yes (DashScope)                                | `qwen-turbo`                        |
| Z.ai (GLM)   | `zai`         | Yes                                            | `glm-4-flash`                       |
| Lovable      | `lovable`     | Only on Lovable Cloud hosted instances         | `google/gemini-3-flash-preview`     |

Only `AI_API_KEY` is required; `AI_MODEL` and `AI_BASE_URL` are optional
overrides.

---

## 5. Data model & security

- All app tables live in the `public` schema with **Row-Level Security enabled**
  and scoped to `auth.uid()`.
- Roles are stored in a dedicated `user_roles` table with a
  `SECURITY DEFINER` `has_role()` function (no client-side role checks).
- The service-role key is used only in `.server.ts` files, never leaked to the
  client bundle.
- Public API routes live under `/api/public/*` and must verify their caller
  (HMAC, secret header) inside the handler.

---

## 6. Environment variables

See `.env.example`. Summary:

```env
# Supabase (required)
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI provider (required — pick one)
AI_PROVIDER=openrouter
AI_API_KEY=

# Optional
AI_MODEL=
AI_BASE_URL=
PORT=3000
```

---

## 7. Cron jobs & background work

Scheduled tasks run via `pg_cron` inside Postgres. Key jobs:

| Name                          | Schedule       | Purpose                                    |
|-------------------------------|----------------|--------------------------------------------|
| `refresh-feeds-hourly`        | every hour     | Refresh CVE / CTI feeds                    |
| `purge-old-feeds-daily`       | daily          | Enforce 7-day retention on feed items      |
| `refresh-nuclei-index-daily`  | daily @ 04:00  | Refresh Nuclei PoC index for CVE enrichment|
| `email-queue-dispatch`        | frequent       | Dispatch outbound transactional emails     |

Introspect from the admin console or `cron.job` / `cron.job_run_details`.

---

## 8. Troubleshooting

- **"Unauthorized" on protected routes**: your Supabase session is missing —
  log out and back in, or check the `Authorization` header middleware in
  `src/start.ts`.
- **AI assistant returns 500**: check `AI_PROVIDER` + `AI_API_KEY` are set
  server-side. Restart the app after changing envs.
- **Feeds not refreshing**: check `cron.job_run_details` for the
  `refresh-feeds-hourly` job.

---

## 9. Contributing

Pull requests welcome — MIT license.
Report issues on <https://github.com/K3E9X/TaskX/issues>.
