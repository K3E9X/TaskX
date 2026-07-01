/**
 * AI provider abstraction — server-only.
 *
 * Supports Lovable AI Gateway (default) and self-hosted friendly providers
 * with free tiers: OpenRouter, Qwen (DashScope), Z.ai (GLM).
 *
 * All providers are OpenAI-compatible /chat/completions.
 *
 * Env vars (self-host):
 *   AI_PROVIDER   = lovable | openrouter | qwen | zai   (default: lovable)
 *   AI_API_KEY    = provider API key                    (overrides LOVABLE_API_KEY)
 *   AI_BASE_URL   = override base URL (optional)
 *   AI_MODEL      = override default model (optional)
 */

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type ProviderId = "lovable" | "openrouter" | "qwen" | "zai";

type ProviderSpec = {
  baseUrl: string;
  defaultModel: string;
  authHeader: (key: string) => Record<string, string>;
};

const PROVIDERS: Record<ProviderId, ProviderSpec> = {
  lovable: {
    baseUrl: "https://ai.gateway.lovable.dev/v1",
    defaultModel: "google/gemini-3-flash-preview",
    authHeader: (k) => ({ "Lovable-API-Key": k, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }),
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "qwen/qwen-2.5-72b-instruct:free",
    authHeader: (k) => ({
      Authorization: `Bearer ${k}`,
      "HTTP-Referer": "https://taskx.tech",
      "X-Title": "TaskX",
    }),
  },
  qwen: {
    // Alibaba DashScope OpenAI-compatible endpoint (intl)
    baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-turbo",
    authHeader: (k) => ({ Authorization: `Bearer ${k}` }),
  },
  zai: {
    // Z.ai (Zhipu GLM) OpenAI-compatible endpoint
    baseUrl: "https://api.z.ai/api/paas/v4",
    defaultModel: "glm-4-flash",
    authHeader: (k) => ({ Authorization: `Bearer ${k}` }),
  },
};

function resolveProvider(): { id: ProviderId; spec: ProviderSpec; key: string; baseUrl: string; defaultModel: string } {
  const id = (process.env.AI_PROVIDER as ProviderId | undefined) ?? "lovable";
  const spec = PROVIDERS[id] ?? PROVIDERS.lovable;
  const key =
    process.env.AI_API_KEY ??
    (id === "lovable" ? process.env.LOVABLE_API_KEY : undefined) ??
    "";
  if (!key) {
    throw new Error(
      `AI provider "${id}" requires an API key. Set AI_API_KEY${id === "lovable" ? " or LOVABLE_API_KEY" : ""}.`,
    );
  }
  return {
    id,
    spec,
    key,
    baseUrl: process.env.AI_BASE_URL || spec.baseUrl,
    defaultModel: process.env.AI_MODEL || spec.defaultModel,
  };
}

export type ChatOpts = {
  messages: ChatMessage[];
  /** Preferred model id (only used on Lovable; other providers substitute their default). */
  model?: string;
  /** Fallback model if `model` unset. */
  fallbackModel?: string;
};

/**
 * Call an OpenAI-compatible /chat/completions endpoint.
 * Returns the assistant text (best effort — empty string if missing).
 */
export async function chatCompletion(opts: ChatOpts): Promise<string> {
  const { id, key, baseUrl, defaultModel } = resolveProvider();

  // Only Lovable supports the vendor/model catalog; other providers use their own ids.
  const model = id === "lovable" ? (opts.model || opts.fallbackModel || defaultModel) : defaultModel;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...PROVIDERS[id].authHeader(key),
    },
    body: JSON.stringify({ model, messages: opts.messages }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI rate limit, retry shortly");
    if (res.status === 402) throw new Error("AI credits exhausted");
    throw new Error(`AI error ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

export function currentProviderId(): ProviderId {
  return (process.env.AI_PROVIDER as ProviderId | undefined) ?? "lovable";
}
