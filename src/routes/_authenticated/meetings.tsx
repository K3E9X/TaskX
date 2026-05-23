import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronRight, Users, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/_authenticated/meetings")({
  head: () => ({ meta: [{ title: "Meetings — TaskX" }] }),
  component: MeetingsPage,
});

type Meeting = {
  id: string;
  title: string;
  meeting_date: string;
  attendees: string[];
  agenda: string | null;
  notes: string;
  decisions: string | null;
  action_items: string | null;
  updated_at: string;
};

function MeetingsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings").select("*").order("meeting_date", { ascending: false });
      if (error) throw error;
      return data as Meeting[];
    },
  });

  const create = useMutation({
    mutationFn: async (p: { title: string; meeting_date: string; attendees: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase.from("meetings").insert({
        user_id: user.id,
        title: p.title,
        meeting_date: p.meeting_date,
        attendees: p.attendees,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (m) => { qc.invalidateQueries({ queryKey: ["meetings"] }); setShowNew(false); setExpanded(m.id); },
    onError: (e) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Meeting> }) => {
      const { error } = await supabase.from("meetings").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("meetings.title")}</h1>
        <Button size="sm" onClick={() => setShowNew(!showNew)}>
          <Plus className="h-4 w-4" /> {t("meetings.new")}
        </Button>
      </div>

      {showNew && <NewMeetingForm onCreate={(p) => create.mutate(p)} pending={create.isPending} />}

      <div className="mt-6 space-y-2">
        {isLoading && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}
        {!isLoading && meetings.length === 0 && (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            {t("common.empty")}
          </div>
        )}
        {meetings.map((m) => {
          const isOpen = expanded === m.id;
          return (
            <div key={m.id} className="rounded-lg border bg-card overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-accent/40 transition-colors"
                onClick={() => setExpanded(isOpen ? null : m.id)}
              >
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{m.title}</div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(parseISO(m.meeting_date), "dd MMM yyyy HH:mm")}</span>
                      {m.attendees.length > 0 && (
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{m.attendees.length}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {isOpen && (
                <div className="border-t p-4 space-y-3 bg-muted/20">
                  <Field label={t("meetings.date")} type="datetime-local"
                    value={format(parseISO(m.meeting_date), "yyyy-MM-dd'T'HH:mm")}
                    onSave={(v) => v && update.mutate({ id: m.id, patch: { meeting_date: new Date(v).toISOString() } })} />
                  <Field label={t("meetings.attendees")} value={m.attendees.join(", ")} placeholder={t("meetings.attendeesPh")}
                    onSave={(v) => update.mutate({ id: m.id, patch: { attendees: v.split(",").map((s) => s.trim()).filter(Boolean) } })} />
                  <Area label={t("meetings.agenda")} value={m.agenda ?? ""} placeholder={t("meetings.agendaPh")} rows={2}
                    onSave={(v) => update.mutate({ id: m.id, patch: { agenda: v || null } })} />
                  <Area label={t("meetings.notes")} value={m.notes} placeholder={t("meetings.notesPh")} rows={6}
                    onSave={(v) => update.mutate({ id: m.id, patch: { notes: v } })} />
                  <Area label={t("meetings.decisions")} value={m.decisions ?? ""} placeholder={t("meetings.decisionsPh")} rows={3}
                    onSave={(v) => update.mutate({ id: m.id, patch: { decisions: v || null } })} />
                  <Area label={t("meetings.actions")} value={m.action_items ?? ""} placeholder={t("meetings.actionsPh")} rows={3}
                    onSave={(v) => update.mutate({ id: m.id, patch: { action_items: v || null } })} />
                  <div className="flex items-center justify-end pt-2 border-t">
                    <button
                      onClick={() => confirm(t("meetings.deleteConfirm")) && remove.mutate(m.id)}
                      className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {t("common.delete")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, value, placeholder, onSave, type = "text" }: {
  label: string; value: string; placeholder?: string; onSave: (v: string) => void; type?: string;
}) {
  const [v, setV] = useState(value);
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <Input className="h-8 text-xs mt-1" type={type} value={v} placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onSave(v)} />
    </div>
  );
}

function Area({ label, value, placeholder, onSave, rows = 3 }: {
  label: string; value: string; placeholder?: string; onSave: (v: string) => void; rows?: number;
}) {
  const [v, setV] = useState(value);
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <Textarea className="text-xs mt-1" rows={rows} value={v} placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onSave(v)} />
    </div>
  );
}

function NewMeetingForm({ onCreate, pending }: {
  onCreate: (p: { title: string; meeting_date: string; attendees: string[] }) => void;
  pending: boolean;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [attendees, setAttendees] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onCreate({
          title: title.trim(),
          meeting_date: new Date(date).toISOString(),
          attendees: attendees.split(",").map((s) => s.trim()).filter(Boolean),
        });
        setTitle(""); setAttendees("");
      }}
      className="rounded-lg border bg-card p-4 space-y-3"
    >
      <Input placeholder={t("meetings.titlePh")} value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="flex gap-2">
        <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1" />
        <Input placeholder={t("meetings.attendeesPh")} value={attendees} onChange={(e) => setAttendees(e.target.value)} className="flex-1" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>{t("common.save")}</Button>
    </form>
  );
}
