import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { CheckSquare, FileText, Bookmark } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type Kind = "todo" | "note" | "bookmark";

const URL_RE = /^https?:\/\/\S+$/i;

function parseInput(raw: string): {
  title: string; tags: string[]; priority?: "low" | "med" | "high" | "urgent"; due_at?: string; url?: string;
} {
  const tags: string[] = [];
  let priority: "low" | "med" | "high" | "urgent" | undefined;
  let due_at: string | undefined;
  let url: string | undefined;

  let text = raw.trim();

  // URL
  const urlMatch = text.match(/https?:\/\/\S+/);
  if (urlMatch) url = urlMatch[0];

  // #tags
  text = text.replace(/(^|\s)#([\w-]+)/g, (_, sp, tag) => { tags.push(tag); return sp; });

  // !priority
  text = text.replace(/(^|\s)!(low|med|high|urgent)\b/gi, (_, sp, p) => {
    priority = p.toLowerCase() as "low" | "med" | "high" | "urgent";
    return sp;
  });

  // @date
  text = text.replace(/(^|\s)@(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, (_, sp, w) => {
    const now = new Date();
    const target = new Date(now);
    const day = w.toLowerCase();
    if (day === "today") { /* keep */ }
    else if (day === "tomorrow") target.setDate(now.getDate() + 1);
    else {
      const map: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
      const t = map[day]; const diff = (t - now.getDay() + 7) % 7 || 7;
      target.setDate(now.getDate() + diff);
    }
    target.setHours(18, 0, 0, 0);
    due_at = target.toISOString();
    return sp;
  });

  return { title: text.replace(/\s+/g, " ").trim(), tags, priority, due_at, url };
}

export function QuickCaptureDialog({ open, onOpenChange }: {
  open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>("todo");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setValue(""); setKind("todo"); }
  }, [open]);

  // Auto-switch to bookmark if input is a URL
  useEffect(() => {
    if (URL_RE.test(value.trim())) setKind((k) => (k === "todo" ? "bookmark" : k));
  }, [value]);

  const submit = async () => {
    const parsed = parseInput(value);
    if (!parsed.title && !parsed.url) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      if (kind === "todo") {
        await supabase.from("todos").insert({
          user_id: user.id, title: parsed.title || "Untitled",
          priority: parsed.priority ?? "med",
          due_at: parsed.due_at ?? null,
          tags: parsed.tags,
        });
        qc.invalidateQueries({ queryKey: ["dash"] });
        toast.success(t("qc.toast.todo"));
      } else if (kind === "note") {
        await supabase.from("notes").insert({
          user_id: user.id, title: parsed.title || "Untitled", content: "",
          tags: parsed.tags,
        });
        qc.invalidateQueries({ queryKey: ["notes"] });
        toast.success(t("qc.toast.note"));
      } else {
        await supabase.from("notes").insert({
          user_id: user.id,
          title: parsed.title || parsed.url || "Untitled",
          content: "",
          kind: "link",
          link_url: parsed.url ?? parsed.title,
          tags: parsed.tags,
        });
        qc.invalidateQueries({ queryKey: ["notes"] });
        toast.success(t("qc.toast.bookmark"));
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">{t("qc.title")}</DialogTitle>
          <DialogDescription className="text-xs">{t("qc.hint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex rounded-md border overflow-hidden text-xs">
            <KindBtn active={kind === "todo"} onClick={() => setKind("todo")} icon={CheckSquare} label={t("qc.kind.todo")} />
            <KindBtn active={kind === "note"} onClick={() => setKind("note")} icon={FileText} label={t("qc.kind.note")} />
            <KindBtn active={kind === "bookmark"} onClick={() => setKind("bookmark")} icon={Bookmark} label={t("qc.kind.bookmark")} />
          </div>
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t("qc.placeholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
            }}
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{t("qc.syntax")}</span>
            <Button size="sm" onClick={submit} disabled={saving || !value.trim()}>
              {t("qc.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KindBtn({ active, onClick, icon: Icon, label }: {
  active: boolean; onClick: () => void; icon: typeof CheckSquare; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 transition-colors ${
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/40"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

export function useQuickCapture() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const editable = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement | null)?.isContentEditable;
      if (editable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === "t" || e.key.toLowerCase() === "n" || e.key.toLowerCase() === "b") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { open, setOpen };
}
