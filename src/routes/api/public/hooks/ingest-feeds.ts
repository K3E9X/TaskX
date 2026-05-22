import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type RssItem = {
  title: string;
  url: string | null;
  summary: string | null;
  external_id: string | null;
  published_at: string;
};

// --- Tiny XML/RSS parser (regex-based, sufficient for RSS/Atom feeds) ---
function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function pick(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  return m ? decodeEntities(m[1]) : null;
}

function pickAttr(block: string, tag: string, attr: string): string | null {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["']`, "i");
  const m = block.match(re);
  return m ? m[1] : null;
}

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  // RSS <item> or Atom <entry>
  const blocks = [
    ...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi),
  ];
  for (const m of blocks) {
    const block = m[0];
    const title = pick(block, "title") ?? "Untitled";
    const url =
      pick(block, "link") ||
      pickAttr(block, "link", "href") ||
      pick(block, "guid");
    const summary =
      pick(block, "description") ||
      pick(block, "summary") ||
      pick(block, "content");
    const dateRaw =
      pick(block, "pubDate") ||
      pick(block, "published") ||
      pick(block, "updated") ||
      pick(block, "dc:date");
    const guid = pick(block, "guid") || pick(block, "id") || url;
    const published_at = dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString();
    items.push({
      title: title.slice(0, 500),
      url: url ?? null,
      summary: summary ? summary.slice(0, 1000) : null,
      external_id: guid ? guid.slice(0, 200) : null,
      published_at,
    });
  }
  return items;
}

// --- CISA KEV JSON ---
function parseCisaKev(json: unknown): RssItem[] {
  const data = json as { vulnerabilities?: Array<{ cveID: string; vulnerabilityName: string; shortDescription: string; dateAdded: string }> };
  return (data.vulnerabilities ?? []).slice(0, 30).map((v) => ({
    title: `${v.cveID} — ${v.vulnerabilityName}`,
    url: `https://nvd.nist.gov/vuln/detail/${v.cveID}`,
    summary: v.shortDescription,
    external_id: v.cveID,
    published_at: new Date(v.dateAdded).toISOString(),
  }));
}

// --- NVD JSON ---
function parseNvd(json: unknown): RssItem[] {
  const data = json as { vulnerabilities?: Array<{ cve: { id: string; descriptions: Array<{ lang: string; value: string }>; published: string } }> };
  return (data.vulnerabilities ?? []).slice(0, 30).map((entry) => {
    const cve = entry.cve;
    const en = cve.descriptions.find((d) => d.lang === "en") ?? cve.descriptions[0];
    return {
      title: `${cve.id}`,
      url: `https://nvd.nist.gov/vuln/detail/${cve.id}`,
      summary: en?.value?.slice(0, 1000) ?? null,
      external_id: cve.id,
      published_at: new Date(cve.published).toISOString(),
    };
  });
}

async function fetchSource(url: string): Promise<RssItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Lovable-Cockpit/1.0 (+rss-ingest)", Accept: "application/json, application/rss+xml, application/xml, text/xml, */*" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("json") || url.endsWith(".json") || url.includes("nvd.nist.gov/rest")) {
    const json = await res.json();
    if (url.includes("cisa.gov")) return parseCisaKev(json);
    if (url.includes("nvd.nist.gov")) return parseNvd(json);
    return [];
  }
  const xml = await res.text();
  return parseRss(xml);
}

export const Route = createFileRoute("/api/public/hooks/ingest-feeds")({
  server: {
    handlers: {
      POST: async () => {
        const { data: sources, error: srcErr } = await supabaseAdmin
          .from("rss_sources")
          .select("*")
          .eq("enabled", true);
        if (srcErr) return new Response(JSON.stringify({ error: srcErr.message }), { status: 500 });

        let inserted = 0;
        let failed = 0;
        const results: Array<{ source: string; count: number; error?: string }> = [];

        for (const src of sources ?? []) {
          try {
            const items = await fetchSource(src.url);
            if (items.length === 0) {
              results.push({ source: src.name, count: 0 });
              continue;
            }

            // Dedup: find existing external_ids / urls for this user
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
                ].filter(Boolean).join(",") || "id.eq.00000000-0000-0000-0000-000000000000"
              );

            const seenExt = new Set((existing ?? []).map((e) => e.external_id).filter(Boolean));
            const seenUrl = new Set((existing ?? []).map((e) => e.url).filter(Boolean));

            const fresh = items.filter((it) => {
              if (it.external_id && seenExt.has(it.external_id)) return false;
              if (it.url && seenUrl.has(it.url)) return false;
              return true;
            });

            if (fresh.length > 0) {
              const rows = fresh.map((it) => ({
                user_id: src.user_id,
                source: src.source_type,
                severity: src.default_severity,
                title: it.title,
                summary: it.summary,
                url: it.url,
                external_id: it.external_id,
                published_at: it.published_at,
                is_auto: true,
                tags: [src.name],
              }));
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
            results.push({ source: src.name, count: 0, error: e instanceof Error ? e.message : String(e) });
          }
        }

        return new Response(
          JSON.stringify({ ok: true, sources: sources?.length ?? 0, inserted, failed, results }),
          { headers: { "Content-Type": "application/json" } }
        );
      },
    },
  },
});
