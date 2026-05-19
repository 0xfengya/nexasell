import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient, getProfileRole } from "@/lib/supabase/server";

// ─── GET /api/products ────────────────────────────────────────
// Query params: ?category=food&search=coffee&limit=20&offset=0&active=true
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category");
    const search   = searchParams.get("search");
    const limit    = parseInt(searchParams.get("limit")  ?? "50");
    const offset   = parseInt(searchParams.get("offset") ?? "0");
    const activeOnly = searchParams.get("active") !== "false";

    let query = supabase
      .from("products")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (activeOnly) query = query.eq("is_active", true);
    if (category && category !== "all") query = query.eq("category", category);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({ data, count });
  } catch (err) {
    console.error("[GET /api/products]", err);
    return NextResponse.json({ error: "Gagal mengambil produk" }, { status: 500 });
  }
}

// ─── POST /api/products ───────────────────────────────────────
// Admin only — create new product
export async function POST(request: NextRequest) {
  try {
    // Verifikasi user adalah admin
    const supabaseUser = await createClient();
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileRole(user.id);

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, price, original_price, category, image_url, description, stock, badge } = body;

    // Validasi
    if (!name?.trim())        return NextResponse.json({ error: "name wajib diisi" }, { status: 400 });
    if (!price || price <= 0) return NextResponse.json({ error: "price harus > 0" }, { status: 400 });
    if (!category?.trim())    return NextResponse.json({ error: "category wajib diisi" }, { status: 400 });
    if (stock == null || stock < 0) return NextResponse.json({ error: "stock tidak valid" }, { status: 400 });

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("products")
      .insert({
        name:           name.trim(),
        price:          Number(price),
        original_price: original_price ? Number(original_price) : null,
        category:       category.trim(),
        image_url:      image_url?.trim() || null,
        description:    description?.trim() || null,
        stock:          Number(stock),
        badge:          badge?.trim() || null,
        sold:           0,
        rating:         0,
        is_active:      true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/products]", err);
    return NextResponse.json({ error: "Gagal menyimpan produk" }, { status: 500 });
  }
}
