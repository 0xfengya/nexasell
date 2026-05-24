import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/supabase/types";

type ProfileUpdate = Partial<Pick<ProfileRow, "full_name" | "username" | "phone" | "avatar_url">> & {
  notif_preferences?: unknown;
};

// ─── GET /api/admin/profile ───────────────────────────────────
export async function GET() {
  try {
    const supabaseUser = await createClient();
    const { data: { user }, error } = await supabaseUser.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createAdminClient();
    const { data: profile, error: profileErr } = await (supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single() as unknown as Promise<{ data: ProfileRow | null; error: unknown }>);

    if (profileErr) throw profileErr;
    if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Attach auth metadata (last_sign_in_at)
    const { data: authUser } = await supabase.auth.admin.getUserById(user.id);

    return NextResponse.json({
      data: {
        ...profile,
        last_sign_in_at: authUser?.user?.last_sign_in_at ?? null,
      }
    });
  } catch (err) {
    console.error("[GET /api/admin/profile]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── PATCH /api/admin/profile ─────────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const supabaseUser = await createClient();
    const { data: { user }, error } = await supabaseUser.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { full_name, username, phone, avatar_url, notif_preferences } = body;

    const supabase = createAdminClient();

    const { data: existing } = await (supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single() as unknown as Promise<{ data: Pick<ProfileRow, "role"> | null }>);

    if (!existing || existing.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatePayload: ProfileUpdate = {
      ...(full_name         !== undefined && { full_name:         full_name?.trim()  || null }),
      ...(username          !== undefined && { username:          username?.trim()   || null }),
      ...(phone             !== undefined && { phone:             phone?.trim()      || null }),
      ...(avatar_url        !== undefined && { avatar_url:        avatar_url?.trim() || null }),
      ...(notif_preferences !== undefined && { notif_preferences }),
    };

    const { data, error: updateErr } = await (supabase
      .from("profiles")
      .update(updatePayload as never)
      .eq("id", user.id)
      .select()
      .single() as unknown as Promise<{ data: ProfileRow | null; error: unknown }>);

    if (updateErr) throw updateErr;

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[PATCH /api/admin/profile]", err);
    return NextResponse.json({ error: "Gagal update profil" }, { status: 500 });
  }
}
