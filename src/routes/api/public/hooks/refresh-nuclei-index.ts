import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkCronHookAuth } from "@/lib/cron-hook-auth";

// Refresh public list of CVEs covered by Nuclei templates.
// Source: projectdiscovery/nuclei-templates repo — tree walk via GitHub API.
// The `http/cves` tree contains templates named like `CVE-2024-1234.yaml`.

async function fetchTree(sha: string, path: string): Promise<string[]> {
  const url = `https://api.github.com/repos/projectdiscovery/nuclei-templates/git/trees/${sha}?recursive=1`;
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 15_000);
  const res = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json",
      "User-Agent": "TaskX/1.0",
    },
    signal: controller.signal,
  });
  clearTimeout(to);
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const j = (await res.json()) as { tree?: Array<{ path: string; type: string }> };
  const cveIds = new Set<string>();
  const re = /CVE-\d{4}-\d{4,}/i;
  for (const node of j.tree ?? []) {
    if (!node.path.startsWith(path)) continue;
    const m = node.path.match(re);
    if (m) cveIds.add(m[0].toUpperCase());
  }
  return [...cveIds];
}

export const Route = createFileRoute("/api/public/hooks/refresh-nuclei-index")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await checkCronHookAuth(request);
        if (denied) return denied;
        try {
          // Get default branch tree sha (master)
          const headRes = await fetch("https://api.github.com/repos/projectdiscovery/nuclei-templates/git/refs/heads/main", {
            headers: { "Accept": "application/vnd.github+json", "User-Agent": "TaskX/1.0" },
          });
          if (!headRes.ok) throw new Error(`GitHub head ${headRes.status}`);
          const head = (await headRes.json()) as { object?: { sha?: string } };
          const sha = head.object?.sha;
          if (!sha) throw new Error("no head sha");
          const ids = await fetchTree(sha, "http/cves/");
          if (ids.length === 0) throw new Error("no CVEs parsed");

          // Upsert
          const rows = ids.map((cve_id) => ({ cve_id }));
          const { error } = await supabaseAdmin.from("nuclei_cve_index").upsert(rows, { onConflict: "cve_id" });
          if (error) throw new Error(error.message);
          return new Response(JSON.stringify({ ok: true, count: ids.length }), { headers: { "Content-Type": "application/json" } });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});
