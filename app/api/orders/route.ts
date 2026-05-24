import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient, getProfileRole } from "@/lib/supabase/server";
import type { OrderRow, OrderItemRow } from "@/lib/supabase/types";

// Buat order number unik: NXS-YYYYMMDD-XXXX
function generateOrderNumber(): string {
  const now   = new Date();
  const date  = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand  = Math.floor(1000 + Math.random() * 9000);
  return `NXS-${date}-${rand}`;
}

// ─── GET /api/orders ──────────────────────────────────────────
// Admin: semua order | Cashier: order miliknya
// ?status=pending|paid|cancelled&source=online|pos&limit=20&offset=0
export async function GET(request: NextRequest) {
  try {
    const supabaseUser = await createClient();
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileRole(user.id);

    if (!profile) return NextResponse.json({ error: "Profile tidak ditemukan" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status  = searchParams.get("status");
    const source  = searchParams.get("source");
    const limit   = parseInt(searchParams.get("limit")  ?? "20");
    const offset  = parseInt(searchParams.get("offset") ?? "0");

    const supabase = createAdminClient();

    let query = supabase
      .from("orders")
      .select("*, order_items(*)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Kasir hanya lihat ordernya sendiri (POS)
    if (profile.role === "cashier") {
      query = query.eq("cashier_id", user.id);
    }

    if (status) query = query.eq("status", status);
    if (source) query = query.eq("source", source);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ data, count });
  } catch (err) {
    console.error("[GET /api/orders]", err);
    return NextResponse.json({ error: "Gagal mengambil data order" }, { status: 500 });
  }
}

// ─── POST /api/orders ─────────────────────────────────────────
// Buat order baru (dari customer online atau kasir POS)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      notes,
      items,          // Array<{ product_id, name, price, quantity, image_url }>
      pay_method,
      source = "online",
      cashier_id,
    } = body;

    // Validasi dasar
    if (!customer_name?.trim()) {
      return NextResponse.json({ error: "customer_name wajib diisi" }, { status: 400 });
    }
    if (!items?.length) {
      return NextResponse.json({ error: "items tidak boleh kosong" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Hitung total dari items
    const itemsWithSubtotal = items.map((item: {
      product_id?: string;
      name: string;
      price: number;
      quantity: number;
      image_url?: string;
    }) => ({
      ...item,
      subtotal: item.price * item.quantity,
    }));

    const subtotal     = itemsWithSubtotal.reduce((s: number, i: { subtotal: number }) => s + i.subtotal, 0);
    const shipping_cost = 0; // Gratis ongkir untuk sekarang
    const total        = subtotal + shipping_cost;

    // Buat order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        order_number:     generateOrderNumber(),
        customer_name:    customer_name.trim(),
        customer_email:   customer_email?.trim() || null,
        customer_phone:   customer_phone?.trim() || null,
        customer_address: customer_address?.trim() || null,
        notes:            notes?.trim() || null,
        subtotal,
        shipping_cost,
        total,
        // POS cash/card langsung lunas; online atau ewallet/qris tetap pending
        status:           (source === "pos" && pay_method !== "qris") ? "paid"    : "pending",
        pay_method:       pay_method || null,
        pay_status:       (source === "pos" && pay_method !== "qris") ? "success" : "pending",
        source,
        cashier_id:       cashier_id || null,
      } as Omit<OrderRow, "id" | "created_at" | "updated_at">)
      .select()
      .single();

    if (orderErr) throw orderErr;

    // Insert order items
    const orderItemsData = itemsWithSubtotal.map((item: {
      product_id?: string;
      name: string;
      price: number;
      quantity: number;
      subtotal: number;
      image_url?: string;
    }) => ({
      order_id:   order.id,
      product_id: item.product_id || null,
      name:       item.name,
      price:      item.price,
      quantity:   item.quantity,
      subtotal:   item.subtotal,
      image_url:  item.image_url || null,
    }));

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(orderItemsData as Omit<OrderItemRow, "id">[]);

    if (itemsErr) throw itemsErr;

    // Kurangi stok produk
    for (const item of items) {
      if (item.product_id) {
        try {
          const { error: rpcErr } = await supabase.rpc("decrement_stock", {
            p_product_id: item.product_id,
            p_qty:        item.quantity,
          });

          if (rpcErr) {
            // Fallback manual jika RPC belum ada / error
            const { data: prodData } = await supabase
              .from("products")
              .select("stock, sold")
              .eq("id", item.product_id)
              .single();

            if (prodData) {
              await supabase
                .from("products")
                .update({
                  stock: Math.max(0, prodData.stock - item.quantity),
                  sold:  (prodData.sold ?? 0) + item.quantity,
                })
                .eq("id", item.product_id);
            }
          }
        } catch {
          // Abaikan error stok agar order tetap berhasil dibuat
        }
      }
    }

    return NextResponse.json({ data: order }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/orders]", err);
    return NextResponse.json({ error: "Gagal membuat order" }, { status: 500 });
  }
}
