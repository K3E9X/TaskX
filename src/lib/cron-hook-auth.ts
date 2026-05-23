import { supabaseAdmin } from "@/integrations/supabase/client.server";

let cachedSecret: string | null = null;

async function loadSecret(): Promise<string | null> {
  if (cachedSecret) return cachedSecret;
  const { data, error } = await supabaseAdmin.rpc("get_cron_hook_secret" as never);
  if (error || !data) return null;
  cachedSecret = data as unknown as string;
  return cachedSecret;
}

/**
 * Validate that an incoming request to a /api/public/hooks/* endpoint is
 * authorized by the server-only cron hook secret (stored in Supabase Vault).
 * Returns null when allowed, or a 403 Response when denied.
 */
export async function checkCronHookAuth(request: Request): Promise<Response | null> {
  const expected = await loadSecret();
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.headers.get("x-cron-secret");
  if (!expected || !provided || provided !== expected) {
    return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export async function isCronHookAuthorized(request: Request): Promise<boolean> {
  const expected = await loadSecret();
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.headers.get("x-cron-secret");
  return !!expected && !!provided && provided === expected;
}
