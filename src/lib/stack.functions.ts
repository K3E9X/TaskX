import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// NVD CPE dictionary search (public, no key required — rate limited).
// Ref: https://services.nvd.nist.gov/rest/json/cpes/2.0

export const searchCpe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ keyword: z.string().min(2).max(80) }).parse(data))
  .handler(async ({ data }) => {
    const url = `https://services.nvd.nist.gov/rest/json/cpes/2.0?keywordSearch=${encodeURIComponent(data.keyword)}&resultsPerPage=15`;
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 8_000);
    try {
      const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
      clearTimeout(to);
      if (!res.ok) return { results: [] as Array<{ cpe_name: string; title: string; vendor: string; product: string }> };
      const j = (await res.json()) as {
        products?: Array<{ cpe?: { cpeName?: string; titles?: Array<{ title?: string; lang?: string }> } }>;
      };
      const results = (j.products ?? [])
        .map((p) => {
          const name = p.cpe?.cpeName ?? "";
          const title =
            p.cpe?.titles?.find((t) => t.lang === "en")?.title ||
            p.cpe?.titles?.[0]?.title ||
            name;
          // cpe:2.3:<part>:<vendor>:<product>:<version>:...
          const parts = name.split(":");
          const vendor = parts[3] ?? "";
          const product = parts[4] ?? "";
          return { cpe_name: name, title, vendor, product };
        })
        .filter((r) => r.cpe_name);
      // Dédupliquer par vendor+product
      const seen = new Set<string>();
      const uniq: typeof results = [];
      for (const r of results) {
        const k = `${r.vendor}:${r.product}`;
        if (seen.has(k)) continue;
        seen.add(k);
        uniq.push(r);
      }
      return { results: uniq.slice(0, 10) };
    } finally {
      clearTimeout(to);
    }
  });
