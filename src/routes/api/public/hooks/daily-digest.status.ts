import { createFileRoute } from "@tanstack/react-router";
import { isCronHookAuthorized } from "@/lib/cron-hook-auth";

const OUTLOOK_GATEWAY = "https://connector-gateway.lovable.dev/microsoft_outlook";

export const Route = createFileRoute("/api/public/hooks/daily-digest/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authed = await isCronHookAuthorized(request);
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
          // Only authenticated cron callers see the email; public callers get a boolean only.
          return Response.json(authed ? { connected: !!email, email } : { connected: !!email });
        } catch {
          return Response.json({ connected: false });
        }
      },
    },
  },
});
