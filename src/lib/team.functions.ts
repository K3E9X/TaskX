import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    // Fetch all auth users (email + created_at) via admin API
    const { data: usersPage, error: usersErr } =
      await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (usersErr) throw new Error(usersErr.message);

    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, first_name, last_name, team_role, avatar_url, created_at");
    if (profErr) throw new Error(profErr.message);

    const { data: roles, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (rolesErr) throw new Error(rolesErr.message);

    const profMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
    const roleMap = new Map<string, "admin" | "member">();
    (roles ?? []).forEach((r) => {
      const cur = roleMap.get(r.user_id);
      if (r.role === "admin" || !cur) roleMap.set(r.user_id, r.role as "admin" | "member");
    });

    return usersPage.users.map((u) => {
      const p = profMap.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        display_name: p?.display_name ?? "",
        first_name: p?.first_name ?? "",
        last_name: p?.last_name ?? "",
        team_role: (p?.team_role ?? "architect") as
          | "architect" | "pentester" | "forensic" | "analyst",
        avatar_url: p?.avatar_url ?? null,
        app_role: roleMap.get(u.id) ?? "member",
      };
    });
  });

export const setAppRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["admin", "member"]),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) {
      throw new Error("Forbidden: cannot modify your own role");
    }
    // Replace existing roles for this user with the new one
    const { error: delErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);
    if (delErr) throw new Error(delErr.message);
    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (insErr) throw new Error(insErr.message);
    return { ok: true };
  });

export const updateMemberProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userId: z.string().uuid(),
      first_name: z.string().max(80).optional(),
      last_name: z.string().max(80).optional(),
      team_role: z.enum(["architect", "pentester", "forensic", "analyst"]).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const patch: {
      first_name?: string;
      last_name?: string;
      team_role?: "architect" | "pentester" | "forensic" | "analyst";
    } = {};
    if (data.first_name !== undefined) patch.first_name = data.first_name;
    if (data.last_name !== undefined) patch.last_name = data.last_name;
    if (data.team_role !== undefined) patch.team_role = data.team_role;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(patch)
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
