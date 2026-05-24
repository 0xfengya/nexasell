import { NextResponse } from "next/server";
import { createAdminClient, createClient, getProfileRole } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabaseUser = await createClient();
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await getProfileRole(user.id);
    if (!profile || profile.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const supabase = createAdminClient();

    const [
      { count: totalProducts },
      { count: totalOrders },
      { data: paidOrders },
      { data: topProducts },
      { data: recentOrders },
    ] = await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      // Ambil order yang paid: status='paid' ATAU pay_status='success'
      supabase.from("orders").select("total, created_at").or("status.eq.paid,pay_status.eq.success"),
      supabase
        .from("products")
        .select("id, name, sold, price, image_url, category")
        .eq("is_active", true)
        .order("sold", { ascending: false })
        .limit(5),
      supabase
        .from("orders")
        .select("id, order_number, customer_name, total, status, pay_method, created_at, order_items(name, quantity)")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const totalRevenue = (paidOrders ?? []).reduce((s: number, o: { total: number | null; created_at: string | null }) => s + (o.total ?? 0), 0);

    // Revenue per bulan (6 bulan terakhir)
    const now = new Date();
    const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const monthKey  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthName = d.toLocaleString("id-ID", { month: "short" });
      const revenue = (paidOrders ?? [])
        .filter(o => o.created_at && o.created_at.startsWith(monthKey))
        .reduce((s: number, o: { total: number | null; created_at: string | null }) => s + (o.total ?? 0), 0);
      return { month: monthName, revenue };
    });

    return NextResponse.json({
      data: {
        summary: {
          total_products: totalProducts ?? 0,
          total_orders:   totalOrders   ?? 0,
          total_revenue:  totalRevenue,
          paid_orders:    (paidOrders ?? []).length,
        },
        monthly_revenue: monthlyRevenue,
        top_products:    topProducts  ?? [],
        recent_orders:   recentOrders ?? [],
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/analytics]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
