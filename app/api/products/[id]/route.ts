import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient, getProfileRole } from "@/lib/supabase/server";

// Helper: cek apakah user adalah admin
async function requireAdmin() {
  const supabaseUser = await createClient();
  const { data: { user }, error } = await supabaseUser.auth.getUser();
  if (error || !user) return { error: "Unauthorized", status: 401 as const };

  const profile = await getProfileRole(user.id);

  if (!profile || profile.role !== "admin") return { error: "Forbidden", status: 403 as const };
  return { user };
}

// ─── GET /api/products/[id] ───────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[GET /api/products/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── PUT /api/products/[id] ───────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.name        !== undefined) updateData.name           = body.name.trim();
    if (body.price       !== undefined) updateData.price          = Number(body.price);
    if (body.original_price !== undefined) updateData.original_price = body.original_price ? Number(body.original_price) : null;
    if (body.category    !== undefined) updateData.category       = body.category.trim();
    if (body.image_url   !== undefined) updateData.image_url      = body.image_url?.trim() || null;
    if (body.description !== undefined) updateData.description    = body.description?.trim() || null;
    if (body.stock       !== undefined) updateData.stock          = Number(body.stock);
    if (body.badge       !== undefined) updateData.badge          = body.badge?.trim() || null;
    if (body.is_active   !== undefined) updateData.is_active      = Boolean(body.is_active);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[PUT /api/products/[id]]", err);
    return NextResponse.json({ error: "Gagal mengupdate produk" }, { status: 500 });
  }
}

// ─── DELETE /api/products/[id] ────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Soft delete: set is_active = false agar order history tetap valid
    const { error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ message: "Produk berhasil dihapus" });
  } catch (err) {
    console.error("[DELETE /api/products/[id]]", err);
    return NextResponse.json({ error: "Gagal menghapus produk" }, { status: 500 });
  }
}
