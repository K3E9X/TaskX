import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ───────── helpers ─────────
async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

async function getActorEmail(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

async function logAction(params: {
  actorId: string;
  actorEmail?: string | null; // accepted for back-compat, no longer stored
  action: string;
  targetType?: string;
  targetId?: string;
  targetEmail?: string; // accepted for back-compat, no longer stored
  details?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("admin_actions").insert({
    actor_id: params.actorId,
    action: params.action,
    target_type: params.targetType ?? null,
    target_id: params.targetId ?? null,
    details: (params.details ?? {}) as never,
  });
}

// Resolve uid -> email server-side. Returns a Map populated for the requested ids.
async function emailMapFor(userIds: (string | null | undefined)[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = Array.from(new Set(userIds.filter((x): x is string => !!x)));
  if (unique.length === 0) return map;
  const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  (data?.users ?? []).forEach((u) => { if (u.email) map.set(u.id, u.email); });
  return map;
}


// ═════════════════ USERS ═════════════════
export const listUsersDetailed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const users = usersPage?.users ?? [];

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, first_name, last_name, team_role, avatar_url");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");

    const profMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
    const roleMap = new Map<string, "admin" | "member">();
    (roles ?? []).forEach((r) => {
      const cur = roleMap.get(r.user_id);
      if (r.role === "admin" || !cur) roleMap.set(r.user_id, r.role as "admin" | "member");
    });

    // Dernière IP connue par user (via page_views)
    const userIds = users.map((u) => u.id);
    const ipMap = new Map<string, { ip: string | null; at: string }>();
    if (userIds.length > 0) {
      const { data: views } = await supabaseAdmin
        .from("page_views")
        .select("user_id, ip, created_at")
        .in("user_id", userIds)
        .not("ip", "is", null)
        .order("created_at", { ascending: false })
        .limit(5000);
      (views ?? []).forEach((v) => {
        if (!ipMap.has(v.user_id)) ipMap.set(v.user_id, { ip: v.ip, at: v.created_at });
      });
    }

    return users.map((u) => {
      const p = profMap.get(u.id);
      const provider =
        (u.app_metadata as { provider?: string } | undefined)?.provider ?? "email";
      const banned = (u as unknown as { banned_until?: string | null }).banned_until ?? null;
      const lastIp = ipMap.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        provider,
        banned_until: banned,
        is_banned: !!banned && new Date(banned) > new Date(),
        display_name: p?.display_name ?? "",
        first_name: p?.first_name ?? "",
        last_name: p?.last_name ?? "",
        team_role: (p?.team_role ?? "architect") as
          | "architect" | "pentester" | "forensic" | "analyst",
        avatar_url: p?.avatar_url ?? null,
        app_role: roleMap.get(u.id) ?? "member",
        last_ip: lastIp?.ip ?? null,
        last_ip_at: lastIp?.at ?? null,
      };
    });
  });

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      email: z.string().email().max(255),
      role: z.enum(["admin", "member"]).default("member"),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: inv, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email);
    if (error) throw new Error(error.message);
    if (data.role === "admin" && inv.user?.id) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", inv.user.id);
      await supabaseAdmin.from("user_roles").insert({ user_id: inv.user.id, role: "admin" });
    }
    await logAction({
      actorId: context.userId,
      actorEmail: await getActorEmail(context.userId),
      action: "user.invite",
      targetType: "user",
      targetId: inv.user?.id,
      targetEmail: data.email,
      details: { role: data.role },
    });
    return { ok: true, userId: inv.user?.id };
  });

export const suspendUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userId: z.string().uuid(),
      hours: z.number().int().min(1).max(24 * 365),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("Cannot suspend yourself");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: `${data.hours}h`,
    });
    if (error) throw new Error(error.message);
    await logAction({
      actorId: context.userId,
      actorEmail: await getActorEmail(context.userId),
      action: "user.suspend",
      targetType: "user",
      targetId: data.userId,
      details: { hours: data.hours },
    });
    return { ok: true };
  });

export const unsuspendUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: "none",
    });
    if (error) throw new Error(error.message);
    await logAction({
      actorId: context.userId,
      actorEmail: await getActorEmail(context.userId),
      action: "user.unsuspend",
      targetType: "user",
      targetId: data.userId,
    });
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("Cannot delete yourself");
    const { data: target } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await logAction({
      actorId: context.userId,
      actorEmail: await getActorEmail(context.userId),
      action: "user.delete",
      targetType: "user",
      targetId: data.userId,
      targetEmail: target.user?.email ?? undefined,
    });
    return { ok: true };
  });

export const sendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ email: z.string().email().max(255) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
    });
    if (error) throw new Error(error.message);
    await logAction({
      actorId: context.userId,
      actorEmail: await getActorEmail(context.userId),
      action: "user.password_reset",
      targetType: "user",
      targetEmail: data.email,
    });
    return { ok: true };
  });

export const getUserDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const tables = [
      "todos", "notes", "bookmarks", "projects", "meetings",
      "diagrams", "snippets", "feed_items", "routines",
    ] as const;
    const counts: Record<string, number> = {};
    await Promise.all(tables.map(async (t) => {
      const { count } = await supabaseAdmin
        .from(t).select("id", { head: true, count: "exact" }).eq("user_id", data.userId);
      counts[t] = count ?? 0;
    }));
    const { data: views } = await supabaseAdmin
      .from("page_views").select("path, created_at")
      .eq("user_id", data.userId).order("created_at", { ascending: false }).limit(50);
    return { counts, recentViews: views ?? [] };
  });

// ═════════════════ SESSIONS / ENGAGEMENT ═════════════════
export const getEngagement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin.rpc("get_engagement_stats" as never);
    if (error) throw new Error(error.message);
    return data as {
      dau: number; wau: number; mau: number; total_views_30d: number;
      top_paths: { path: string; views: number; uniques: number }[];
      views_per_day: { day: string; views: number; uniques: number }[];
    };
  });

export const getActiveSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    // Use last_sign_in_at as a proxy + recent page_views (last 30 min = "online")
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: views } = await supabaseAdmin
      .from("page_views").select("user_id, path, created_at, user_agent")
      .gte("created_at", since).order("created_at", { ascending: false });
    const seen = new Map<string, { path: string; created_at: string; user_agent: string | null }>();
    (views ?? []).forEach((v) => {
      if (!seen.has(v.user_id)) seen.set(v.user_id, {
        path: v.path, created_at: v.created_at, user_agent: v.user_agent,
      });
    });
    const userIds = Array.from(seen.keys());
    const emails = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      usersPage?.users.forEach((u) => emails.set(u.id, u.email ?? ""));
    }
    return Array.from(seen.entries()).map(([userId, v]) => ({
      userId,
      email: emails.get(userId) ?? "",
      last_path: v.path,
      last_seen_at: v.created_at,
      user_agent: v.user_agent,
    }));
  });

// ═════════════════ LOGS ═════════════════
export const getAuthLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    type Entry = {
      id: string;
      created_at: string;
      ip_address: string | null;
      action: string | null;
      actor_username: string | null;
      actor_id: string | null;
    };

    // Recent page activity (with IP) — most useful & always populated
    const { data: views, error: viewsErr } = await supabaseAdmin
      .from("page_views")
      .select("id, created_at, ip, user_id, path")
      .order("created_at", { ascending: false })
      .limit(300);

    // Build email map for actor_username enrichment
    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const users = usersPage?.users ?? [];
    const emailMap = new Map(users.map((u) => [u.id, u.email ?? null]));

    const entries: Entry[] = [];

    // Page views → activity entries
    (views ?? []).forEach((v) => {
      entries.push({
        id: `pv-${v.id}`,
        created_at: v.created_at,
        ip_address: v.ip ?? null,
        action: `visit ${v.path}`,
        actor_username: emailMap.get(v.user_id) ?? null,
        actor_id: v.user_id,
      });
    });

    // Auth: signups + last sign-in events from auth.users
    users.forEach((u) => {
      if (u.created_at) {
        entries.push({
          id: `signup-${u.id}`,
          created_at: u.created_at,
          ip_address: null,
          action: "signup",
          actor_username: u.email ?? null,
          actor_id: u.id,
        });
      }
      if (u.last_sign_in_at) {
        entries.push({
          id: `login-${u.id}-${u.last_sign_in_at}`,
          created_at: u.last_sign_in_at,
          ip_address: null,
          action: "login",
          actor_username: u.email ?? null,
          actor_id: u.id,
        });
      }
    });

    entries.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return {
      entries: entries.slice(0, 500),
      error: viewsErr?.message ?? null,
    };
  });


export const getAdminActionLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("admin_actions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ═════════════════ CONTENT MODERATION ═════════════════
export const listAllContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      table: z.enum(["notes", "bookmarks", "feed_items", "todos"]),
      limit: z.number().int().min(1).max(200).default(50),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from(data.table)
      .select("id, user_id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const deleteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      table: z.enum(["notes", "bookmarks", "feed_items", "todos"]),
      id: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from(data.table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAction({
      actorId: context.userId,
      actorEmail: await getActorEmail(context.userId),
      action: "content.delete",
      targetType: data.table,
      targetId: data.id,
    });
    return { ok: true };
  });

// ═════════════════ FEATURE FLAGS ═════════════════
export const listFeatureFlags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("feature_flags").select("*").order("key");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertFeatureFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      key: z.string().min(1).max(64).regex(/^[a-z0-9_.-]+$/),
      user_id: z.string().uuid().nullable(),
      enabled: z.boolean(),
      description: z.string().max(280).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("feature_flags").upsert(
      {
        key: data.key,
        user_id: data.user_id,
        enabled: data.enabled,
        description: data.description ?? null,
      },
      { onConflict: "key,user_id" },
    );
    if (error) throw new Error(error.message);
    await logAction({
      actorId: context.userId,
      actorEmail: await getActorEmail(context.userId),
      action: "flag.upsert",
      targetType: "feature_flag",
      targetId: data.key,
      details: { user_id: data.user_id, enabled: data.enabled },
    });
    return { ok: true };
  });

export const deleteFeatureFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("feature_flags").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAction({
      actorId: context.userId,
      actorEmail: await getActorEmail(context.userId),
      action: "flag.delete",
      targetType: "feature_flag",
      targetId: data.id,
    });
    return { ok: true };
  });

// ═════════════════ SYSTEM ═════════════════
export const getSystemInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    type CronRow = {
      jobname: string; status: string; return_message: string | null;
      start_time: string; end_time: string | null;
    };
    let cronRuns: CronRow[] = [];
    try {
      const { data } = await supabaseAdmin.rpc("get_cron_recent_runs" as never);
      cronRuns = (data ?? []) as CronRow[];
    } catch { /* RPC may not exist */ }

    const { count: totalUsers } = await supabaseAdmin
      .from("profiles").select("id", { head: true, count: "exact" });
    const { count: totalViews } = await supabaseAdmin
      .from("page_views").select("id", { head: true, count: "exact" });
    const { count: totalAdminActions } = await supabaseAdmin
      .from("admin_actions").select("id", { head: true, count: "exact" });

    return {
      cronRuns,
      totalUsers: totalUsers ?? 0,
      totalViews: totalViews ?? 0,
      totalAdminActions: totalAdminActions ?? 0,
      serverTime: new Date().toISOString(),
      env: {
        url: process.env.SUPABASE_URL ?? "",
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasLovableAi: !!process.env.LOVABLE_API_KEY,
      },
    };
  });

// ───────── helpers parse UA ─────────
function parseUA(ua: string | null | undefined): { browser: string; os: string } {
  if (!ua) return { browser: "unknown", os: "unknown" };
  let browser = "Other";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
  let os = "Other";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iOS/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";
  return { browser, os };
}

export const trackPageView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      path: z.string().min(1).max(500),
      referrer: z.string().max(500).optional(),
      user_agent: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { getRequestIP, getRequestHeader } = await import("@tanstack/react-start/server");
    let ip: string | null = null;
    let country: string | null = null;
    try {
      ip = getRequestIP({ xForwardedFor: true })
        ?? getRequestHeader("cf-connecting-ip")
        ?? getRequestHeader("x-real-ip")
        ?? null;
      country = getRequestHeader("cf-ipcountry") ?? null;
      if (country === "XX" || country === "T1") country = null;
    } catch { /* ignore */ }

    if (ip) {
      const { data: blocked } = await supabaseAdmin
        .from("blocked_ips").select("id").eq("ip", ip).maybeSingle();
      if (blocked) throw new Error("IP blocked");
    }

    const { browser, os } = parseUA(data.user_agent);
    const { error } = await supabaseAdmin.from("page_views").insert({
      user_id: context.userId,
      path: data.path,
      referrer: data.referrer ?? null,
      user_agent: data.user_agent ?? null,
      ip, country, browser, os,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ═════════════════ ADMIN USER NOTES ═════════════════
export const listUserNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("admin_user_notes").select("*")
      .eq("target_user_id", data.userId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const emails = await emailMapFor((rows ?? []).map((r) => r.author_id));
    return (rows ?? []).map((r) => ({ ...r, author_email: emails.get(r.author_id) ?? null }));
  });

export const addUserNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), note: z.string().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const authorEmail = await getActorEmail(context.userId);
    const { error } = await supabaseAdmin.from("admin_user_notes").insert({
      target_user_id: data.userId, author_id: context.userId,
      author_email: authorEmail, note: data.note,
    });
    if (error) throw new Error(error.message);
    await logAction({
      actorId: context.userId, actorEmail: authorEmail,
      action: "note.add", targetType: "user", targetId: data.userId,
    });
    return { ok: true };
  });

export const deleteUserNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("admin_user_notes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ═════════════════ BLOCKED IPS ═════════════════
export const listBlockedIps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("blocked_ips").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const blockIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ ip: z.string().min(3).max(64), reason: z.string().max(280).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const email = await getActorEmail(context.userId);
    const { error } = await supabaseAdmin.from("blocked_ips").insert({
      ip: data.ip.trim(), reason: data.reason ?? null,
      blocked_by: context.userId, blocked_by_email: email,
    });
    if (error) throw new Error(error.message);
    await logAction({
      actorId: context.userId, actorEmail: email,
      action: "ip.block", targetType: "ip", targetId: data.ip,
      details: { reason: data.reason },
    });
    return { ok: true };
  });

export const unblockIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: row } = await supabaseAdmin
      .from("blocked_ips").select("ip").eq("id", data.id).maybeSingle();
    const { error } = await supabaseAdmin.from("blocked_ips").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAction({
      actorId: context.userId, actorEmail: await getActorEmail(context.userId),
      action: "ip.unblock", targetType: "ip", targetId: row?.ip,
    });
    return { ok: true };
  });

// ═════════════════ ANALYTICS AVANCÉS ═════════════════
export const getTopUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: views } = await supabaseAdmin
      .from("page_views").select("user_id, created_at")
      .gte("created_at", since).limit(50000);

    const byUser = new Map<string, { views: number; lastSeen: string }>();
    (views ?? []).forEach((v) => {
      const cur = byUser.get(v.user_id);
      if (!cur) byUser.set(v.user_id, { views: 1, lastSeen: v.created_at });
      else { cur.views++; if (v.created_at > cur.lastSeen) cur.lastSeen = v.created_at; }
    });

    const sorted = Array.from(byUser.entries())
      .sort((a, b) => b[1].views - a[1].views).slice(0, 20);
    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map(usersPage?.users.map((u) => [u.id, u.email ?? ""]) ?? []);

    return sorted.map(([userId, stats]) => ({
      userId, email: emailMap.get(userId) ?? "",
      views: stats.views, lastSeen: stats.lastSeen,
    }));
  });

export const getHourlyHeatmap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: views } = await supabaseAdmin
      .from("page_views").select("created_at").gte("created_at", since).limit(50000);
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    (views ?? []).forEach((v) => {
      const d = new Date(v.created_at);
      grid[d.getDay()][d.getHours()]++;
    });
    return grid;
  });

export const getCountryStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data } = await supabaseAdmin
      .from("page_views").select("country, user_id")
      .gte("created_at", since).not("country", "is", null).limit(50000);
    const map = new Map<string, { views: number; users: Set<string> }>();
    (data ?? []).forEach((v) => {
      if (!v.country) return;
      const cur = map.get(v.country) ?? { views: 0, users: new Set() };
      cur.views++; cur.users.add(v.user_id);
      map.set(v.country, cur);
    });
    return Array.from(map.entries())
      .map(([country, s]) => ({ country, views: s.views, uniques: s.users.size }))
      .sort((a, b) => b.views - a.views).slice(0, 30);
  });


// ═════════════════ ANNOUNCEMENTS (broadcast banners) ═════════════════
export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("admin_announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listActiveAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("admin_announcements")
      .select("id, message, level, expires_at")
      .eq("active", true)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { message: string; level: "info" | "warning" | "critical"; expiresInHours?: number | null }) =>
    z.object({
      message: z.string().min(1).max(500),
      level: z.enum(["info", "warning", "critical"]),
      expiresInHours: z.number().min(1).max(720).nullable().optional(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const email = await getActorEmail(context.userId);
    const expires_at = data.expiresInHours
      ? new Date(Date.now() + data.expiresInHours * 3600_000).toISOString()
      : null;
    const { error } = await supabaseAdmin.from("admin_announcements").insert({
      message: data.message, level: data.level, expires_at,
      author_id: context.userId,
    });
    if (error) throw new Error(error.message);
    await logAction({ actorId: context.userId, actorEmail: email, action: "announcement.create", details: { level: data.level } });
    return { ok: true };
  });

export const toggleAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; active: boolean }) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("admin_announcements").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("admin_announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ═════════════════ LIVE SESSIONS (last 5 min activity) ═════════════════
export const getLiveSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const since = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data: views } = await supabaseAdmin
      .from("page_views")
      .select("user_id, path, ip, country, browser, os, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);

    const byUser = new Map<string, { user_id: string; last_path: string; ip: string | null; country: string | null; browser: string | null; os: string | null; last_seen: string; hits: number }>();
    (views ?? []).forEach((v) => {
      const cur = byUser.get(v.user_id);
      if (!cur) {
        byUser.set(v.user_id, {
          user_id: v.user_id, last_path: v.path, ip: v.ip, country: v.country,
          browser: v.browser, os: v.os, last_seen: v.created_at, hits: 1,
        });
      } else {
        cur.hits++;
      }
    });

    const userIds = Array.from(byUser.keys());
    const emailMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: pages } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      (pages?.users ?? []).forEach((u) => { if (userIds.includes(u.id) && u.email) emailMap.set(u.id, u.email); });
    }

    return Array.from(byUser.values())
      .map((s) => ({ ...s, email: emailMap.get(s.user_id) ?? null }))
      .sort((a, b) => b.last_seen.localeCompare(a.last_seen));
  });

// ═════════════════ BRUTE FORCE / SECURITY ALERTS ═════════════════
// Detects: IPs with many recent page_view inserts (proxy for activity) and users with rapid succession.
// True failed-login detection requires auth_logs (analytics) — we expose a simple heuristic from page_views.
export const getSecurityAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const since = new Date(Date.now() - 60 * 60_000).toISOString();

    const { data: views } = await supabaseAdmin
      .from("page_views").select("ip, user_id, created_at")
      .gte("created_at", since).not("ip", "is", null).limit(20000);

    // 1) IPs shared by multiple users (potential credential sharing / scraping)
    const ipUsers = new Map<string, Set<string>>();
    const ipHits = new Map<string, number>();
    (views ?? []).forEach((v) => {
      if (!v.ip) return;
      if (!ipUsers.has(v.ip)) ipUsers.set(v.ip, new Set());
      ipUsers.get(v.ip)!.add(v.user_id);
      ipHits.set(v.ip, (ipHits.get(v.ip) ?? 0) + 1);
    });

    const sharedIps = Array.from(ipUsers.entries())
      .filter(([, users]) => users.size >= 3)
      .map(([ip, users]) => ({ ip, distinct_users: users.size, hits: ipHits.get(ip) ?? 0 }))
      .sort((a, b) => b.distinct_users - a.distinct_users).slice(0, 20);

    // 2) High-volume IPs (>200 hits/h)
    const noisyIps = Array.from(ipHits.entries())
      .filter(([, h]) => h > 200)
      .map(([ip, hits]) => ({ ip, hits, distinct_users: ipUsers.get(ip)?.size ?? 0 }))
      .sort((a, b) => b.hits - a.hits).slice(0, 20);

    // 3) Recent suspended users from admin_actions
    const { data: suspendActions } = await supabaseAdmin
      .from("admin_actions").select("target_email, target_id, created_at, actor_email")
      .eq("action", "user.suspend")
      .gte("created_at", new Date(Date.now() - 7 * 86400_000).toISOString())
      .order("created_at", { ascending: false }).limit(20);

    return { sharedIps, noisyIps, recentSuspensions: suspendActions ?? [] };
  });
