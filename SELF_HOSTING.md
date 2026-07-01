# Self-hosting TaskX

TaskX is 100% open source and can run on your own infrastructure.
The stack is Node/TypeScript + TanStack Start + PostgreSQL (via Supabase).

## Prerequisites

- Node.js 20+ and `bun` (or `pnpm`)
- A PostgreSQL database (Supabase Cloud, self-hosted Supabase, or plain Postgres)
- An AI provider API key (**one** of the free tiers below)

## 1. Clone

```bash
git clone https://github.com/K3E9X/TaskX.git
cd TaskX
bun install
```

## 2. Configure environment

Copy `.env.example` to `.env` and fill it in.

### Required — Database / Auth (Supabase)

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-anon-key>
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server-only, never expose
```

Run the migrations located in `supabase/migrations/` against your database.

### Required — AI provider

TaskX supports several OpenAI-compatible providers. Pick **one**:

| Provider     | `AI_PROVIDER` | Where to get a free key                                | Default model                  |
|--------------|---------------|--------------------------------------------------------|--------------------------------|
| OpenRouter   | `openrouter`  | https://openrouter.ai (`:free` models available)       | `qwen/qwen-2.5-72b-instruct:free` |
| Qwen         | `qwen`        | https://bailian.console.alibabacloud.com (DashScope)   | `qwen-turbo`                    |
| Z.ai (GLM)   | `zai`         | https://z.ai (GLM API)                                 | `glm-4-flash`                   |
| Lovable      | `lovable`     | Only for projects hosted on Lovable Cloud              | `google/gemini-3-flash-preview` |

Example for OpenRouter:

```env
AI_PROVIDER=openrouter
AI_API_KEY=sk-or-v1-xxxxxxxx
# Optional overrides:
# AI_MODEL=qwen/qwen-2.5-72b-instruct:free
# AI_BASE_URL=https://openrouter.ai/api/v1
```

Example for Qwen:

```env
AI_PROVIDER=qwen
AI_API_KEY=sk-xxxxxxxx
AI_MODEL=qwen-turbo
```

Example for Z.ai:

```env
AI_PROVIDER=zai
AI_API_KEY=xxxxxxxx
AI_MODEL=glm-4-flash
```

## 3. Run

Development:

```bash
bun run dev
```

Production build:

```bash
bun run build
bun run start
```

The app listens on port 3000 by default.

## 4. (Optional) Email

Transactional email uses Lovable's email gateway by default. For self-hosting,
either plug in SMTP (Postmark, Resend, SES...) or disable outbound email —
signup/login still work without it.

## 5. Updating

```bash
git pull
bun install
bun run build
```

## Security notes

- Never commit `.env`. Rotate the service-role key if leaked.
- All app data is scoped by Row-Level Security — a new tenant just needs a fresh
  Supabase project.
- Keep `AI_API_KEY` server-side only; it is never exposed to the browser.

## Support

- Issues: https://github.com/K3E9X/TaskX/issues
- Cloud version: https://taskx.tech (managed by the maintainer, free for personal use)
