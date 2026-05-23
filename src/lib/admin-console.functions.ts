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
  actorEmail: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  targetEmail?: string;
  details?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("admin_actions").insert({
    actor_id: params.actorId,
    actor_email: params.actorEmail,
    action: params.action,
    target_type: params.targetType ?? null,
    target_id: params.targetId ?? null,
    target_email: params.targetEmail ?? null,
    details: (params.details ?? {}) as never,
  });
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
      "diagrams", "tips", "feed_items", "routines",
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
    const { data, error } = await supabaseAdmin
      .schema("auth" as never)
      .from("audit_log_entries" as never)
      .select("id, created_at, ip_address, payload")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return { entries: [] as Entry[], error: error.message };
    const entries: Entry[] = (data ?? []).map((row: unknown) => {
      const r = row as { id: string; created_at: string; ip_address: string | null; payload: Record<string, unknown> | null };
      const p = r.payload ?? {};
      return {
        id: r.id,
        created_at: r.created_at,
        ip_address: r.ip_address,
        action: (p.action as string) ?? null,
        actor_username: (p.actor_username as string) ?? null,
        actor_id: (p.actor_id as string) ?? null,
      };
    });
    return { entries, error: null as string | null };
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

// Tracking — appelable par TOUT user authentifié (pas seulement admin)
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
    try {
      ip = getRequestIP({ xForwardedFor: true })
        ?? getRequestHeader("cf-connecting-ip")
        ?? getRequestHeader("x-real-ip")
        ?? null;
    } catch { ip = null; }
    const { error } = await supabaseAdmin.from("page_views").insert({
      user_id: context.userId,
      path: data.path,
      referrer: data.referrer ?? null,
      user_agent: data.user_agent ?? null,
      ip,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
