import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { searchCpe } from "@/lib/stack.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Search, Package, Sparkles } from "lucide-react";

type StackItem = {
  id: string;
  vendor: string;
  product: string;
  version: string | null;
  cpe_prefix: string;
  label: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/stack")({
  head: () => ({
    meta: [
      { title: "My Stack — TaskX" },
      { name: "description", content: "Declare your products and versions to filter CVE watch by what actually affects your parc (CPE matching)." },
    ],
  }),
  component: StackPage,
});

function StackPage() {
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<Array<{ cpe_name: string; title: string; vendor: string; product: string }>>([]);
  const [searching, setSearching] = useState(false);
  const searchFn = useServerFn(searchCpe);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["user_stack_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_stack_items").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as StackItem[];
    },
  });

  const add = useMutation({
    mutationFn: async (r: { cpe_name: string; vendor: string; product: string; title: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const prefix = r.cpe_name.split(":").slice(0, 5).join(":"); // cpe:2.3:a:vendor:product
      const { error } = await supabase.from("user_stack_items").insert({
        user_id: user.id,
        vendor: r.vendor,
        product: r.product,
        cpe_prefix: prefix,
        label: r.title,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_stack_items"] });
      toast.success("Added to your stack");
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_stack_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_stack_items"] }),
  });

  const runSearch = async () => {
    if (keyword.trim().length < 2) return;
    setSearching(true);
    try {
      const r = await searchFn({ data: { keyword: keyword.trim() } });
      setResults(r.results);
      if (r.results.length === 0) toast.info("No CPE match — try another keyword");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Package className="h-6 w-6" /> My Stack
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Declare products you run. CVEs matching these show up flagged in <Link to="/feeds" className="text-primary hover:underline">Watch</Link> and drive the "For You" filter.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 mb-6">
        <div className="text-sm font-medium mb-2 flex items-center gap-2">
          <Search className="h-4 w-4" /> Search NVD CPE dictionary
        </div>
        <div className="flex gap-2 mb-3">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
            placeholder="e.g. exchange server, fortigate, kubernetes"
            className="h-9"
          />
          <Button size="sm" onClick={runSearch} disabled={searching || keyword.trim().length < 2}>
            {searching ? "Searching…" : "Search"}
          </Button>
        </div>
        {results.length > 0 && (
          <ul className="space-y-1 max-h-72 overflow-auto">
            {results.map((r) => (
              <li key={r.cpe_name} className="flex items-center gap-2 text-xs border rounded px-2 py-1.5">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.title}</div>
                  <div className="text-[10px] font-mono text-muted-foreground truncate">{r.cpe_name}</div>
                </div>
                <Button size="sm" variant="outline" className="h-7"
                  onClick={() => add.mutate(r)} disabled={add.isPending}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-sm font-medium mb-2">Your stack ({items.length})</h2>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center border rounded-lg bg-muted/30">
            <Sparkles className="h-4 w-4 inline mr-1" />
            Nothing yet — search above and add your first product.
          </p>
        ) : (
          <ul className="space-y-1">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-2 border rounded px-3 py-2">
                <Badge variant="outline" className="h-5 text-[10px]">{it.vendor}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{it.label ?? `${it.vendor} ${it.product}`}</div>
                  <div className="text-[10px] font-mono text-muted-foreground truncate">{it.cpe_prefix}</div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(it.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
