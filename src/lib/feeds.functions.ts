import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchSource, fetchEpss, CVSS_MIN, type RssItem } from "@/lib/feed-parsers";

async function loadEnrichmentContext(cveIds: string[]) {
  const uniq = [...new Set(cveIds.filter(Boolean))];
  if (uniq.length === 0) return { epss: new Map(), kevSet: new Set<string>(), pocSet: new Set<string>() };
  const [epss, kevRes, pocRes] = await Promise.all([
    fetchEpss(uniq),
    supabaseAdmin.from("feed_items").select("cve_id").in("cve_id", uniq).eq("is_kev", true),
    supabaseAdmin.from("nuclei_cve_index").select("cve_id").in("cve_id", uniq),
  ]);
  const kevSet = new Set<string>((kevRes.data ?? []).map((r) => (r.cve_id as string).toUpperCase()));
  const pocSet = new Set<string>((pocRes.data ?? []).map((r) => (r.cve_id as string).toUpperCase()));
  return { epss, kevSet, pocSet };
}

type Sev = "info" | "low" | "medium" | "high" | "critical";
type Src = "cve" | "cti";
function enrichRow(it: RssItem, src: { name: string; source_type: Src; default_severity: Sev }, ctx: {
  epss: Map<string, { epss: number; percentile: number }>;
  kevSet: Set<string>;
  pocSet: Set<string>;
}) {
  const cveId = it.cve_id ?? null;
  const isKev = src.name === "CISA KEV" || (cveId ? ctx.kevSet.has(cveId) : false);
  const hasPoc = cveId ? ctx.pocSet.has(cveId) : false;
  const epssHit = cveId ? ctx.epss.get(cveId) : undefined;
  return {
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

export const refreshMyFeeds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: sources, error: srcErr } = await supabaseAdmin
      .from("rss_sources").select("*").eq("user_id", userId).eq("enabled", true);
    if (srcErr) throw new Error(srcErr.message);

    let inserted = 0;
    let failed = 0;

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
        if (items.length === 0) continue;

        const extIds = items.map((i) => i.external_id).filter(Boolean) as string[];
        const urls = items.map((i) => i.url).filter(Boolean) as string[];

        const { data: existing } = await supabaseAdmin
          .from("feed_items")
          .select("external_id,url")
          .eq("user_id", userId)
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
          const rows = fresh.map((it) => ({ user_id: userId, ...enrichRow(it, src as { name: string; source_type: Src; default_severity: Sev }, ctx) }));
          const { error: insErr } = await supabaseAdmin.from("feed_items").insert(rows);
          if (insErr) throw new Error(insErr.message);
          inserted += rows.length;
        }

        await supabaseAdmin.from("rss_sources")
          .update({ last_fetched_at: new Date().toISOString() })
          .eq("id", src.id);
      } catch (e) {
        console.warn("Feed refresh failed", { source: src.name, url: src.url, error: e instanceof Error ? e.message : String(e) });
        failed++;
      }
    }
    return { ok: true, sources: sources?.length ?? 0, inserted, failed };
  });
