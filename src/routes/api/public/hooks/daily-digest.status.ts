import { createFileRoute } from "@tanstack/react-router";

const OUTLOOK_GATEWAY = "https://connector-gateway.lovable.dev/microsoft_outlook";

export const Route = createFileRoute("/api/public/hooks/daily-digest/status")({
  server: {
    handlers: {
      GET: async () => {
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const OUTLOOK_API_KEY = process.env.MICROSOFT_OUTLOOK_API_KEY;
        if (!LOVABLE_API_KEY || !OUTLOOK_API_KEY) {
          return Response.json({ connected: false, error: "Missing credentials" });
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
          return Response.json({ connected: !!email, email });
        } catch {
          return Response.json({ connected: false });
        }
      },
    },
  },
});
