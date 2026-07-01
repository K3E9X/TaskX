import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkCronHookAuth } from "@/lib/cron-hook-auth";
import { fetchSource, fetchEpss, CVSS_MIN, type RssItem } from "@/lib/feed-parsers";

type Sev = "info" | "low" | "medium" | "high" | "critical";
type Src = "cve" | "cti";

async function loadEnrichmentContext(cveIds: string[]) {
  const uniq = [...new Set(cveIds.filter(Boolean))];
  if (uniq.length === 0) return { epss: new Map<string, { epss: number; percentile: number }>(), kevSet: new Set<string>(), pocSet: new Set<string>() };
  const [epss, kevRes, pocRes] = await Promise.all([
    fetchEpss(uniq),
    supabaseAdmin.from("feed_items").select("cve_id").in("cve_id", uniq).eq("is_kev", true),
    supabaseAdmin.from("nuclei_cve_index").select("cve_id").in("cve_id", uniq),
  ]);
  const kevSet = new Set<string>((kevRes.data ?? []).map((r) => (r.cve_id as string).toUpperCase()));
  const pocSet = new Set<string>((pocRes.data ?? []).map((r) => (r.cve_id as string).toUpperCase()));
  return { epss, kevSet, pocSet };
}

function buildRow(it: RssItem, src: { user_id: string; name: string; source_type: Src; default_severity: Sev }, ctx: {
  epss: Map<string, { epss: number; percentile: number }>;
  kevSet: Set<string>;
  pocSet: Set<string>;
}) {
  const cveId = it.cve_id ?? null;
  const isKev = src.name === "CISA KEV" || (cveId ? ctx.kevSet.has(cveId) : false);
  const hasPoc = cveId ? ctx.pocSet.has(cveId) : false;
  const epssHit = cveId ? ctx.epss.get(cveId) : undefined;
  return {
    user_id: src.user_id,
    source: src.source_type,
    severity: (it.severity ?? src.default_severity) as Sev,
    title: it.title,
    summary: it.summary,
    url: it.url,
    external_id: it.external_id,
    published_at: it.published_at,
    is_auto: true,
    tags: [src.name],
    cve_id: cveId,
    epss_score: epssHit?.epss ?? null,
    epss_percentile: epssHit?.percentile ?? null,
    is_kev: isKev,
    has_poc: hasPoc,
    affected_cpes: it.affected_cpes ?? [],
  };
}

export const Route = createFileRoute("/api/public/hooks/ingest-feeds")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await checkCronHookAuth(request);
        if (denied) return denied;

        const { data: sources, error: srcErr } = await supabaseAdmin
          .from("rss_sources").select("*").eq("enabled", true);
        if (srcErr) return new Response(JSON.stringify({ error: srcErr.message }), { status: 500 });

        let inserted = 0;
        let failed = 0;
        const results: Array<{ source: string; count: number; error?: string }> = [];

        for (const src of sources ?? []) {
          try {
            const rawItems = await fetchSource(src.url);
            const items = src.source_type === "cve"
              ? rawItems.filter((it) =>
                  typeof it.cvss === "number"
                    ? it.cvss >= CVSS_MIN
                    : it.severity === "high" || it.severity === "critical",
                )
              : rawItems;
            if (items.length === 0) { results.push({ source: src.name, count: 0 }); continue; }

            const extIds = items.map((i) => i.external_id).filter(Boolean) as string[];
            const urls = items.map((i) => i.url).filter(Boolean) as string[];

            const { data: existing } = await supabaseAdmin
              .from("feed_items")
              .select("external_id,url")
              .eq("user_id", src.user_id)
              .or(
                [
                  extIds.length ? `external_id.in.(${extIds.map((x) => `"${x.replace(/"/g, "")}"`).join(",")})` : "",
                  urls.length ? `url.in.(${urls.map((x) => `"${x.replace(/"/g, "")}"`).join(",")})` : "",
                ].filter(Boolean).join(",") || "id.eq.00000000-0000-0000-0000-000000000000",
              );

            const seenExt = new Set((existing ?? []).map((e) => e.external_id).filter(Boolean));
            const seenUrl = new Set((existing ?? []).map((e) => e.url).filter(Boolean));
            const fresh = items.filter((it) => {
              if (it.external_id && seenExt.has(it.external_id)) return false;
              if (it.url && seenUrl.has(it.url)) return false;
              return true;
            });

            if (fresh.length > 0) {
              const cveIds = fresh.map((f) => f.cve_id).filter(Boolean) as string[];
              const ctx = await loadEnrichmentContext(cveIds);
              const rows = fresh.map((it) => buildRow(it, src as { user_id: string; name: string; source_type: Src; default_severity: Sev }, ctx));
              const { error: insErr } = await supabaseAdmin.from("feed_items").insert(rows);
              if (insErr) throw new Error(insErr.message);
              inserted += rows.length;
            }

            await supabaseAdmin
              .from("rss_sources")
              .update({ last_fetched_at: new Date().toISOString() })
              .eq("id", src.id);

            results.push({ source: src.name, count: fresh.length });
          } catch (e) {
            failed++;
            console.warn("Scheduled feed ingest failed", { source: src.name, url: src.url, error: e instanceof Error ? e.message : String(e) });
            results.push({ source: src.name, count: 0, error: e instanceof Error ? e.message : String(e) });
          }
        }

        return new Response(
          JSON.stringify({ ok: true, sources: sources?.length ?? 0, inserted, failed, results }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
