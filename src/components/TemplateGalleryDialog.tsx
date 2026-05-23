import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { NOTE_TEMPLATES, renderTemplate, type TemplateRole } from "@/lib/note-templates";

const ROLE_LABEL: Record<TemplateRole, { fr: string; en: string }> = {
  pentester: { fr: "Pentester", en: "Pentester" },
  forensic: { fr: "Forensic", en: "Forensic" },
  architect: { fr: "Architecte", en: "Architect" },
  soc: { fr: "SOC", en: "SOC" },
  ciso: { fr: "CISO", en: "CISO" },
  universal: { fr: "Universel", en: "Universal" },
};

export function TemplateGalleryDialog({
  open,
  onOpenChange,
  defaultRole,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultRole?: TemplateRole | null;
  onPick: (data: { title: string; body: string }) => void;
}) {
  const { t, lang } = useI18n();
  const [filter, setFilter] = useState<"mine" | "all">(defaultRole ? "mine" : "all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    return NOTE_TEMPLATES.filter((tpl) => {
      if (filter === "mine" && defaultRole) {
        if (tpl.role !== defaultRole && tpl.role !== "universal") return false;
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        const title = tpl[lang].title.toLowerCase();
        if (!title.includes(q) && !tpl.id.includes(q)) return false;
      }
      return true;
    });
  }, [filter, defaultRole, query, lang]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">{t("tpl.title")}</DialogTitle>
          <DialogDescription className="text-xs">{t("tpl.subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          {defaultRole && (
            <div className="inline-flex rounded-md border overflow-hidden text-xs">
              <button
                onClick={() => setFilter("mine")}
                className={`px-3 py-1.5 transition-colors ${filter === "mine" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/40"}`}
              >
                {t("tpl.mine")}
              </button>
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 transition-colors ${filter === "all" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/40"}`}
              >
                {t("tpl.all")}
              </button>
            </div>
          )}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("tpl.search")}
            className="h-8 text-xs"
          />
        </div>
        <div className="flex-1 overflow-auto -mx-6 px-6">
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("tpl.empty")}</p>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-2">
              {visible.map((tpl) => (
                <li key={tpl.id}>
                  <button
                    onClick={() => {
                      onPick(renderTemplate(tpl, lang));
                      onOpenChange(false);
                    }}
                    className="w-full text-left rounded-md border p-3 hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-tight">{tpl[lang].title}</span>
                      <Badge variant="outline" className="h-5 text-[10px] shrink-0">
                        {ROLE_LABEL[tpl.role][lang]}
                      </Badge>
                    </div>
                    {tpl.tags && tpl.tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {tpl.tags.map((tag) => (
                          <span key={tag} className="text-[10px] text-muted-foreground">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>{t("common.close")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
