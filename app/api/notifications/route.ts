import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/**
 * GET /api/notifications?since=<ISO>
 * Returns new orders and low-stock products since `since`.
 * Polling-based — no Realtime/replication needed (free tier friendly).
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseUser = await createClient();
    const { data: { user }, error } = await supabaseUser.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since") ?? new Date(Date.now() - 60_000).toISOString();

    const supabase = createAdminClient();

    const [{ data: newOrders }, { data: lowStock }] = await Promise.all([
      supabase
        .from("orders")
        .select("id, order_number, customer_name, total, created_at")
        .gt("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("products")
        .select("id, name, stock, updated_at")
        .lt("stock", 10)
        .eq("is_active", true)
        .order("stock", { ascending: true })
        .limit(10),
    ]);

    return NextResponse.json({
      data: {
        new_orders: newOrders ?? [],
        low_stock:  lowStock  ?? [],
        checked_at: new Date().toISOString(),
      }
    });
  } catch (err) {
    console.error("[GET /api/notifications]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
