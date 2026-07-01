// Shared feed parsing + CVE enrichment helpers.
// Used by src/lib/feeds.functions.ts (user-triggered refresh) and
// src/routes/api/public/hooks/ingest-feeds.ts (cron ingestion).

export type RssItem = {
  title: string;
  url: string | null;
  summary: string | null;
  external_id: string | null;
  published_at: string;
  cvss?: number | null;
  severity?: "low" | "medium" | "high" | "critical" | null;
  cve_id?: string | null;
  affected_cpes?: string[];
};

export const FEED_PAGE_SIZE = 30;
export const CVSS_MIN = 7.5;

const CVE_RE = /CVE-\d{4}-\d{4,}/i;

export function extractCveId(...parts: Array<string | null | undefined>): string | null {
  for (const p of parts) {
    if (!p) continue;
    const m = p.match(CVE_RE);
    if (m) return m[0].toUpperCase();
  }
  return null;
}

export function severityFromCvss(score: number | null | undefined): "low" | "medium" | "high" | "critical" | null {
  if (score == null) return null;
  if (score >= 9.0) return "critical";
  if (score >= 7.0) return "high";
  if (score >= 4.0) return "medium";
  return "low";
}

export function toIsoDate(raw: string | null | undefined): string {
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

export async function fetchText(url: string): Promise<{ text: string; contentType: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json, application/rss+xml, application/xml, text/xml, */*" },
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });
  } finally { clearTimeout(timeout); }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const MAX_BYTES = 2 * 1024 * 1024;
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) throw new Error("Response too large");
  return { text: new TextDecoder().decode(buf), contentType: res.headers.get("content-type") ?? "" };
}

// --- Tiny XML/RSS parser ---
function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .trim();
}
function pick(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? decodeEntities(m[1]) : null;
}
function pickAttr(block: string, tag: string, attr: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["']`, "i"));
  return m ? m[1] : null;
}
export function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const blocks = [
    ...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi),
  ];
  for (const m of blocks) {
    const block = m[0];
    const title = pick(block, "title") ?? "Untitled";
    const url = pick(block, "link") || pickAttr(block, "link", "href") || pick(block, "guid");
    const summary = pick(block, "description") || pick(block, "summary") || pick(block, "content");
    const dateRaw = pick(block, "pubDate") || pick(block, "published") || pick(block, "updated") || pick(block, "dc:date");
    const guid = pick(block, "guid") || pick(block, "id") || url;
    const cve_id = extractCveId(title, summary, guid);
    items.push({
      title: title.slice(0, 500),
      url: url ?? null,
      summary: summary ? summary.slice(0, 1000) : null,
      external_id: guid ? guid.slice(0, 200) : null,
      published_at: toIsoDate(dateRaw),
      cve_id,
    });
  }
  return newestFirst(items).slice(0, FEED_PAGE_SIZE);
}

// --- CISA KEV JSON ---
export function parseCisaKev(json: unknown): RssItem[] {
  const data = json as { vulnerabilities?: Array<{ cveID: string; vulnerabilityName: string; shortDescription: string; dateAdded: string }> };
  return newestFirst((data.vulnerabilities ?? []).map((v) => ({
    title: `${v.cveID} — ${v.vulnerabilityName}`,
    url: `https://nvd.nist.gov/vuln/detail/${v.cveID}`,
    summary: v.shortDescription,
    external_id: v.cveID,
    published_at: toIsoDate(v.dateAdded),
    cvss: null,
    severity: "critical" as const,
    cve_id: v.cveID.toUpperCase(),
  }))).slice(0, FEED_PAGE_SIZE);
}

// --- NVD JSON ---
type NvdCpeMatch = { criteria?: string; vulnerable?: boolean };
type NvdNode = { cpeMatch?: NvdCpeMatch[]; children?: NvdNode[] };
function collectCpes(nodes: NvdNode[] | undefined): string[] {
  if (!nodes) return [];
  const out: string[] = [];
  const walk = (ns: NvdNode[]) => {
    for (const n of ns) {
      for (const m of n.cpeMatch ?? []) {
        if (m.criteria) out.push(m.criteria);
      }
      if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  return [...new Set(out)].slice(0, 50);
}

export function parseNvd(json: unknown): RssItem[] {
  type NvdMetric = { cvssData?: { baseScore?: number; baseSeverity?: string } };
  type NvdEntry = {
    cve: {
      id: string;
      descriptions: Array<{ lang: string; value: string }>;
      published: string;
      metrics?: {
        cvssMetricV31?: NvdMetric[];
        cvssMetricV30?: NvdMetric[];
        cvssMetricV2?: NvdMetric[];
      };
      configurations?: Array<{ nodes?: NvdNode[] }>;
    };
  };
  const data = json as { vulnerabilities?: NvdEntry[] };
  return newestFirst((data.vulnerabilities ?? []).map((entry) => {
    const cve = entry.cve;
    const en = cve.descriptions.find((d) => d.lang === "en") ?? cve.descriptions[0];
    const metric =
      cve.metrics?.cvssMetricV31?.[0] ??
      cve.metrics?.cvssMetricV30?.[0] ??
      cve.metrics?.cvssMetricV2?.[0];
    const score = metric?.cvssData?.baseScore ?? null;
    const severity = severityFromCvss(score);
    const scoreLabel = score != null ? ` (CVSS ${score.toFixed(1)})` : "";
    const cpes = (cve.configurations ?? []).flatMap((c) => collectCpes(c.nodes));
    return {
      title: `${cve.id}${scoreLabel}`,
      url: `https://nvd.nist.gov/vuln/detail/${cve.id}`,
      summary: en?.value?.slice(0, 1000) ?? null,
      external_id: cve.id,
      published_at: toIsoDate(cve.published),
      cvss: score,
      severity,
      cve_id: cve.id.toUpperCase(),
      affected_cpes: cpes,
    };
  })).slice(0, FEED_PAGE_SIZE);
}

export async function fetchNvdRecent(parsed: URL): Promise<RssItem[]> {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  parsed.searchParams.set("pubStartDate", nvdDate(start));
  parsed.searchParams.set("pubEndDate", nvdDate(end));
  parsed.searchParams.set("resultsPerPage", "1");
  parsed.searchParams.delete("startIndex");
  const first = JSON.parse((await fetchText(parsed.toString())).text) as { totalResults?: number };
  const total = Math.max(0, first.totalResults ?? 0);
  parsed.searchParams.set("resultsPerPage", String(FEED_PAGE_SIZE));
  parsed.searchParams.set("startIndex", String(Math.max(0, total - FEED_PAGE_SIZE)));
  return parseNvd(JSON.parse((await fetchText(parsed.toString())).text));
}

// --- SSRF guard ---
function isBlockedHostname(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h.startsWith("[")) return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [parseInt(m[1], 10), parseInt(m[2], 10)];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
  }
  return false;
}
export function validateFeedUrl(rawUrl: string): URL {
  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch { throw new Error("Invalid URL"); }
  if (parsed.protocol !== "https:") throw new Error("Only https:// URLs are allowed");
  if (!parsed.hostname || isBlockedHostname(parsed.hostname)) throw new Error("Hostname not allowed");
  if (parsed.username || parsed.password) throw new Error("Credentials in URL not allowed");
  return parsed;
}

export async function fetchSource(rawUrl: string): Promise<RssItem[]> {
  const parsed = validateFeedUrl(rawUrl);
  const isNvd = parsed.hostname === "services.nvd.nist.gov" && parsed.pathname.includes("/rest/json/cves/2.0");
  if (isNvd && !parsed.searchParams.has("pubStartDate") && !parsed.searchParams.has("lastModStartDate")) {
    return fetchNvdRecent(parsed);
  }
  const url = parsed.toString();
  const { text, contentType: ct } = await fetchText(url);
  const isJson = ct.includes("json") || url.endsWith(".json") || url.includes("nvd.nist.gov/rest");
  if (isJson) {
    const json = JSON.parse(text);
    if (url.includes("cisa.gov")) return parseCisaKev(json);
    if (url.includes("nvd.nist.gov")) return parseNvd(json);
    return [];
  }
  return parseRss(text);
}

// --- EPSS enrichment (batch, public API, no key) ---
// Ref: https://www.first.org/epss/api
export type EpssHit = { cve: string; epss: number; percentile: number };
export async function fetchEpss(cveIds: string[]): Promise<Map<string, EpssHit>> {
  const out = new Map<string, EpssHit>();
  const uniq = [...new Set(cveIds.map((s) => s.toUpperCase()))].filter(Boolean);
  if (uniq.length === 0) return out;
  // API accepts comma-separated list up to ~200 per call.
  for (let i = 0; i < uniq.length; i += 100) {
    const batch = uniq.slice(i, i + 100);
    try {
      const url = `https://api.first.org/data/v1/epss?cve=${encodeURIComponent(batch.join(","))}`;
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), 8_000);
      const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
      clearTimeout(to);
      if (!res.ok) continue;
      const j = (await res.json()) as { data?: Array<{ cve: string; epss: string; percentile: string }> };
      for (const row of j.data ?? []) {
        out.set(row.cve.toUpperCase(), {
          cve: row.cve.toUpperCase(),
          epss: Number(row.epss),
          percentile: Number(row.percentile),
        });
      }
    } catch (e) {
      console.warn("EPSS fetch failed", e instanceof Error ? e.message : e);
    }
  }
  return out;
}
