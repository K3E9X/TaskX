import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const OUTLOOK_GATEWAY = "https://connector-gateway.lovable.dev/microsoft_outlook";

type Todo = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_at: string | null;
};

type FeedItem = {
  id: string;
  title: string;
  summary: string | null;
  url: string | null;
  severity: string;
  source: string;
  published_at: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(displayName: string, todos: Todo[], cves: FeedItem[]): string {
  const now = new Date();
  const dateStr = now.toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const todosHtml = todos.length
    ? `<ul style="padding-left:18px;margin:8px 0;">${todos
        .map((t) => {
          const due = t.due_at
            ? ` <span style="color:#888;">(échéance ${new Date(t.due_at).toLocaleDateString("fr-FR")})</span>`
            : "";
          const prio =
            t.priority === "high"
              ? '<span style="background:#ef4444;color:#fff;padding:1px 6px;border-radius:3px;font-size:11px;">HIGH</span> '
              : t.priority === "low"
                ? '<span style="background:#94a3b8;color:#fff;padding:1px 6px;border-radius:3px;font-size:11px;">LOW</span> '
                : "";
          return `<li style="margin:6px 0;">${prio}<strong>${escapeHtml(t.title)}</strong>${due}${t.description ? `<br/><span style="color:#555;font-size:13px;">${escapeHtml(t.description)}</span>` : ""}</li>`;
        })
        .join("")}</ul>`
    : '<p style="color:#888;font-style:italic;">Aucune todo en cours 🎉</p>';

  const cvesHtml = cves.length
    ? `<ul style="padding-left:18px;margin:8px 0;">${cves
        .map((c) => {
          const sev = c.severity === "critical" ? "#dc2626" : "#f59e0b";
          const sevLabel = c.severity.toUpperCase();
          return `<li style="margin:8px 0;">
            <span style="background:${sev};color:#fff;padding:1px 6px;border-radius:3px;font-size:11px;">${sevLabel}</span>
            ${c.url ? `<a href="${escapeHtml(c.url)}" style="color:#2563eb;text-decoration:none;"><strong>${escapeHtml(c.title)}</strong></a>` : `<strong>${escapeHtml(c.title)}</strong>`}
            <span style="color:#888;font-size:12px;"> · ${escapeHtml(c.source)}</span>
            ${c.summary ? `<br/><span style="color:#555;font-size:13px;">${escapeHtml(c.summary.slice(0, 240))}${c.summary.length > 240 ? "…" : ""}</span>` : ""}
          </li>`;
        })
        .join("")}</ul>`
    : '<p style="color:#888;font-style:italic;">Aucune alerte critique sur les dernières 24h ✅</p>';

  return `<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:680px;margin:0 auto;padding:20px;color:#1a1a1a;">
    <h1 style="font-size:22px;margin:0 0 4px;">Digest — ${escapeHtml(displayName)}</h1>
    <p style="color:#888;margin:0 0 24px;font-size:13px;">${dateStr}</p>

    <h2 style="font-size:16px;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin-top:24px;">📋 Todos en cours (${todos.length})</h2>
    ${todosHtml}

    <h2 style="font-size:16px;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin-top:24px;">🚨 Alertes CVE critiques / high — dernières 24h (${cves.length})</h2>
    ${cvesHtml}

    <p style="color:#aaa;font-size:11px;margin-top:32px;border-top:1px solid #eee;padding-top:12px;">Digest automatique · 11h & 15h</p>
  </body></html>`;
}

async function sendOutlookMail(to: string, subject: string, html: string): Promise<void> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  const OUTLOOK_API_KEY = process.env.MICROSOFT_OUTLOOK_API_KEY;
  if (!OUTLOOK_API_KEY) throw new Error("MICROSOFT_OUTLOOK_API_KEY is not configured");

  const res = await fetch(`${OUTLOOK_GATEWAY}/me/sendMail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": OUTLOOK_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "HTML", content: html },
        toRecipients: [{ emailAddress: { address: to } }],
      },
    }),
  });

  if (!res.ok && res.status !== 202) {
    throw new Error(`Outlook sendMail failed [${res.status}]: ${await res.text()}`);
  }
}

async function getConnectedOutlookEmail(): Promise<string> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  const OUTLOOK_API_KEY = process.env.MICROSOFT_OUTLOOK_API_KEY;
  if (!OUTLOOK_API_KEY) throw new Error("MICROSOFT_OUTLOOK_API_KEY is not configured");

  const res = await fetch(`${OUTLOOK_GATEWAY}/me?$select=mail,userPrincipalName`, {
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": OUTLOOK_API_KEY,
    },
  });
  if (!res.ok) throw new Error(`Outlook /me failed [${res.status}]: ${await res.text()}`);
  const data = (await res.json()) as { mail?: string; userPrincipalName?: string };
  const email = data.mail || data.userPrincipalName;
  if (!email) throw new Error("No email found on connected Outlook account");
  return email;
}

export const Route = createFileRoute("/api/public/hooks/daily-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let userIdFilter: string | null = null;
        try {
          const body = (await request.json()) as { user_id?: string };
          if (body.user_id) userIdFilter = body.user_id;
        } catch {
          // empty body OK
        }

        let recipient: string;
        try {
          recipient = await getConnectedOutlookEmail();
        } catch (e) {
          return new Response(
            JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        // Fetch profiles
        let profilesQuery = supabaseAdmin.from("profiles").select("id, display_name");
        if (userIdFilter) profilesQuery = profilesQuery.eq("id", userIdFilter);
        const { data: profiles, error: profErr } = await profilesQuery;
        if (profErr) {
          return new Response(JSON.stringify({ ok: false, error: profErr.message }), { status: 500 });
        }

        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const results: Array<{ user_id: string; sent: boolean; error?: string; todos: number; cves: number }> = [];

        for (const p of profiles ?? []) {
          try {
            const { data: todos } = await supabaseAdmin
              .from("todos")
              .select("id, title, description, priority, status, due_at")
              .eq("user_id", p.id)
              .in("status", ["todo", "doing"])
              .order("priority", { ascending: false })
              .order("due_at", { ascending: true, nullsFirst: false })
              .limit(20);

            const { data: cves } = await supabaseAdmin
              .from("feed_items")
              .select("id, title, summary, url, severity, source, published_at")
              .eq("user_id", p.id)
              .in("severity", ["critical", "high"])
              .gte("published_at", since)
              .order("published_at", { ascending: false })
              .limit(15);

            const todoList = (todos ?? []) as Todo[];
            const cveList = (cves ?? []) as FeedItem[];

            if (todoList.length === 0 && cveList.length === 0) {
              results.push({ user_id: p.id, sent: false, todos: 0, cves: 0, error: "nothing to send" });
              continue;
            }

            const html = buildHtml(p.display_name || "toi", todoList, cveList);
            const subject = `🛡️ Digest · ${todoList.length} todo${todoList.length > 1 ? "s" : ""} · ${cveList.length} alerte${cveList.length > 1 ? "s" : ""}`;
            await sendOutlookMail(recipient, subject, html);
            results.push({ user_id: p.id, sent: true, todos: todoList.length, cves: cveList.length });
          } catch (e) {
            results.push({
              user_id: p.id,
              sent: false,
              todos: 0,
              cves: 0,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }

        return new Response(
          JSON.stringify({ ok: true, recipient, results }),
          { headers: { "Content-Type": "application/json" } }
        );
      },
    },
  },
});
