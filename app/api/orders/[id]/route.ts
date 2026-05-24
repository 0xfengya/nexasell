import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { OrderRow } from "@/lib/supabase/types";

type OrderUpdate = Partial<Pick<OrderRow, "status" | "pay_status" | "snap_token" | "payment_url">>;

// ─── GET /api/orders/[id] ─────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[GET /api/orders/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── PATCH /api/orders/[id] ───────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    const updateData: OrderUpdate = {};
    if (body.status      !== undefined) updateData.status      = body.status;
    if (body.pay_status  !== undefined) updateData.pay_status  = body.pay_status;
    if (body.snap_token  !== undefined) updateData.snap_token  = body.snap_token;
    if (body.payment_url !== undefined) updateData.payment_url = body.payment_url;

    const { data, error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[PATCH /api/orders/[id]]", err);
    return NextResponse.json({ error: "Gagal mengupdate order" }, { status: 500 });
  }
}
