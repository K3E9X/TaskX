import { createFileRoute } from "@tanstack/react-router";

const OUTLOOK_GATEWAY = "https://connector-gateway.lovable.dev/microsoft_outlook";

function checkApiKey(request: Request): boolean {
  const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
  const provided =
    request.headers.get("apikey") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return !!expected && !!provided && provided === expected;
}

export const Route = createFileRoute("/api/public/hooks/daily-digest/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authed = checkApiKey(request);
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const OUTLOOK_API_KEY = process.env.MICROSOFT_OUTLOOK_API_KEY;
        if (!LOVABLE_API_KEY || !OUTLOOK_API_KEY) {
          return Response.json({ connected: false });
        }
        try {
          const res = await fetch(`${OUTLOOK_GATEWAY}/me?$select=mail,userPrincipalName`, {
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": OUTLOOK_API_KEY,
            },
          });
          if (!res.ok) return Response.json({ connected: false });
          const data = (await res.json()) as { mail?: string; userPrincipalName?: string };
          const email = data.mail || data.userPrincipalName;
          // Only authenticated callers see the email; public callers get a boolean only.
          return Response.json(authed ? { connected: !!email, email } : { connected: !!email });
        } catch {
          return Response.json({ connected: false });
        }
      },
    },
  },
});
