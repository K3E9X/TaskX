import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkCronHookAuth } from "@/lib/cron-hook-auth";

type RssItem = {
  title: string;
  url: string | null;
  summary: string | null;
  external_id: string | null;
  published_at: string;
};

const FEED_PAGE_SIZE = 30;

function toIsoDate(raw: string | null | undefined): string {
  if (!raw) return new Date().toISOString();
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function newestFirst(items: RssItem[]): RssItem[] {
  return [...items].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
}

function nvdDate(value: Date): string {
  return value.toISOString().replace(/\.\d{3}Z$/, ".000");
}

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
    const published_at = toIsoDate(dateRaw);
    items.push({
      title: title.slice(0, 500),
      url: url ?? null,
      summary: summary ? summary.slice(0, 1000) : null,
      external_id: guid ? guid.slice(0, 200) : null,
      published_at,
    });
  }
  return newestFirst(items).slice(0, FEED_PAGE_SIZE);
}

// --- CISA KEV JSON ---
function parseCisaKev(json: unknown): RssItem[] {
  const data = json as { vulnerabilities?: Array<{ cveID: string; vulnerabilityName: string; shortDescription: string; dateAdded: string }> };
  return newestFirst((data.vulnerabilities ?? []).map((v) => ({
    title: `${v.cveID} — ${v.vulnerabilityName}`,
    url: `https://nvd.nist.gov/vuln/detail/${v.cveID}`,
    summary: v.shortDescription,
    external_id: v.cveID,
    published_at: toIsoDate(v.dateAdded),
  }))).slice(0, FEED_PAGE_SIZE);
}

// --- NVD JSON ---
function parseNvd(json: unknown): RssItem[] {
  const data = json as { vulnerabilities?: Array<{ cve: { id: string; descriptions: Array<{ lang: string; value: string }>; published: string } }> };
  return newestFirst((data.vulnerabilities ?? []).map((entry) => {
    const cve = entry.cve;
    const en = cve.descriptions.find((d) => d.lang === "en") ?? cve.descriptions[0];
    return {
      title: `${cve.id}`,
      url: `https://nvd.nist.gov/vuln/detail/${cve.id}`,
      summary: en?.value?.slice(0, 1000) ?? null,
      external_id: cve.id,
      published_at: toIsoDate(cve.published),
    };
  })).slice(0, FEED_PAGE_SIZE);
}

// SSRF guard: only allow public https URLs, reject private/reserved IP ranges and non-DNS hostnames.
function isBlockedHostname(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  // IPv6 literal — block all (most edge cases are private/loopback)
  if (h.startsWith("[")) return true;
  // IPv4 literal check
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [parseInt(m[1], 10), parseInt(m[2], 10)];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reserved
  }
  return false;
}

function validateFeedUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }
  if (parsed.protocol !== "https:") throw new Error("Only https:// URLs are allowed");
  if (!parsed.hostname || isBlockedHostname(parsed.hostname)) {
    throw new Error("Hostname not allowed");
  }
  if (parsed.username || parsed.password) throw new Error("Credentials in URL not allowed");
  return parsed;
}

async function fetchSource(rawUrl: string): Promise<RssItem[]> {
  const parsed = validateFeedUrl(rawUrl);
  const isNvd = parsed.hostname === "services.nvd.nist.gov" && parsed.pathname.includes("/rest/json/cves/2.0");
  if (isNvd && !parsed.searchParams.has("pubStartDate") && !parsed.searchParams.has("lastModStartDate")) {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    parsed.searchParams.set("pubStartDate", nvdDate(start));
    parsed.searchParams.set("pubEndDate", nvdDate(end));
    parsed.searchParams.set("resultsPerPage", String(FEED_PAGE_SIZE));
  }
  const url = parsed.toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "Lovable-Cockpit/1.0 (+rss-ingest)", Accept: "application/json, application/rss+xml, application/xml, text/xml, */*" },
      redirect: "error", // prevent redirect-based SSRF bypass
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // Limit response size to ~2MB to mitigate blind SSRF / DoS
  const MAX_BYTES = 2 * 1024 * 1024;
  const ct = res.headers.get("content-type") ?? "";
  const isJson = ct.includes("json") || url.endsWith(".json") || url.includes("nvd.nist.gov/rest");
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) throw new Error("Response too large");
  const text = new TextDecoder().decode(buf);
  if (isJson) {
    const json = JSON.parse(text);
    if (url.includes("cisa.gov")) return parseCisaKev(json);
    if (url.includes("nvd.nist.gov")) return parseNvd(json);
    return [];
  }
  return parseRss(text);
}

export const Route = createFileRoute("/api/public/hooks/ingest-feeds")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await checkCronHookAuth(request);
        if (denied) return denied;

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
          JSON.stringify({ ok: true, sources: sources?.length ?? 0, inserted, failed }),
          { headers: { "Content-Type": "application/json" } }
        );
      },
    },
  },
});
