"use client";
import { useState, useEffect, useCallback } from "react";
import { TrendingUp, ShoppingBag, Users, Package, ArrowUpRight, RefreshCw, Loader2 } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface MonthlyRevenue { month: string; revenue: number; }
interface TopProduct    { id: string; name: string; sold: number; price: number; image_url: string | null; category: string; }
interface RecentOrder   { id: string; total: number; status: string; }
interface Summary       { total_products: number; total_orders: number; total_revenue: number; paid_orders: number; }

const catIcons: Record<string, string>  = { food:"🍔", electronics:"📱", fashion:"👕", beauty:"💄", home:"🏠", sports:"⚽" };
const catGrads = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)", "linear-gradient(135deg,#3b82f6,#06b6d4)",
  "linear-gradient(135deg,#10b981,#059669)", "linear-gradient(135deg,#f43f5e,#ec4899)",
  "linear-gradient(135deg,#f59e0b,#ef4444)", "linear-gradient(135deg,#8b5cf6,#6366f1)",
];

const Card = ({ children, className="" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-3xl p-5 sm:p-6 ${className}`} style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
    {children}
  </div>
);

export default function AnalyticsPage() {
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [summary, setSummary]           = useState<Summary>({ total_products:0, total_orders:0, total_revenue:0, paid_orders:0 });
  const [monthly, setMonthly]           = useState<MonthlyRevenue[]>([]);
  const [topProducts, setTopProducts]   = useState<TopProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res  = await fetch("/api/admin/analytics");
      const json = await res.json();
      if (res.ok && json.data) {
        setSummary(json.data.summary);
        setMonthly(json.data.monthly_revenue ?? []);
        setTopProducts(json.data.top_products ?? []);
        setRecentOrders(json.data.recent_orders ?? []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derivasi dari data API
  const maxR = Math.max(...monthly.map(d => d.revenue), 1);

  // Category breakdown dari topProducts
  const catStats = topProducts.reduce((a, p) => {
    if (!a[p.category]) a[p.category] = { revenue: 0, sold: 0 };
    a[p.category].revenue += p.price * p.sold;
    a[p.category].sold    += p.sold;
    return a;
  }, {} as Record<string, { revenue: number; sold: number }>);
  const cats  = Object.entries(catStats).sort((a, b) => b[1].revenue - a[1].revenue);
  const maxC  = Math.max(...cats.map(([, v]) => v.revenue), 1);

  // Status distribution dari recentOrders
  const statusMap = recentOrders.reduce((a, o) => {
    a[o.status] = (a[o.status] || 0) + 1; return a;
  }, {} as Record<string, number>);
  const totalOrdersForStatus = recentOrders.length || 1;

  const avgOrder = recentOrders.length > 0
    ? Math.round(recentOrders.reduce((s, o) => s + o.total, 0) / recentOrders.length)
    : 0;

  const kpis = [
    { label:"Total Revenue",  value:formatRupiah(summary.total_revenue), icon:TrendingUp, from:"#6366f1", to:"#8b5cf6", change:`${summary.paid_orders} paid` },
    { label:"Avg Order Value", value:formatRupiah(avgOrder),             icon:ShoppingBag, from:"#10b981", to:"#06b6d4", change:"per order" },
    { label:"Total Pesanan",   value:summary.total_orders.toLocaleString(), icon:Package,  from:"#f43f5e", to:"#ec4899", change:"semua order" },
    { label:"Active SKUs",     value:String(summary.total_products),     icon:Users,      from:"#f59e0b", to:"#ef4444", change:"produk aktif" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-full" style={{ background:"var(--bg)", minHeight:"100vh" }}>
      <div className="mb-7 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color:"var(--text3)" }}>Insights</p>
          <h1 className="font-black text-2xl sm:text-3xl" style={{ color:"var(--text)", fontFamily:"Outfit,sans-serif" }}>Analytics</h1>
          <p className="text-sm mt-0.5" style={{ color:"var(--text2)" }}>Performa toko secara mendalam</p>
        </div>
        <button onClick={fetchData} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50 transition-all"
          style={{ background:"var(--surface)", border:"1px solid var(--border)", color:"var(--text2)" }}>
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="relative overflow-hidden rounded-3xl p-5 text-white"
              style={{ background:`linear-gradient(135deg,${k.from},${k.to})`, boxShadow:`0 8px 28px ${k.from}44` }}>
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full" style={{ background:"rgba(255,255,255,0.1)" }} />
              <div className="relative z-10">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center mb-3" style={{ background:"rgba(255,255,255,0.2)" }}>
                  {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Icon className="w-4 h-4 text-white" />}
                </div>
                <p className="font-black text-xl text-white leading-none mb-0.5" style={{ fontFamily:"Outfit,sans-serif" }}>
                  {loading ? "—" : k.value}
                </p>
                <p className="text-xs font-semibold mb-1.5" style={{ color:"rgba(255,255,255,0.75)" }}>{k.label}</p>
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" style={{ color:"rgba(255,255,255,0.7)" }} />
                  <span className="text-[10px]" style={{ color:"rgba(255,255,255,0.65)" }}>{k.change}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        {/* Revenue horizontal bars */}
        <Card>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-0.5" style={{ color:"var(--text3)" }}>Revenue</p>
          <p className="font-black text-sm mb-5" style={{ color:"var(--text)" }}>Tren Bulanan</p>
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2" style={{ color:"var(--text3)" }}>
              <Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Memuat...</span>
            </div>
          ) : monthly.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color:"var(--text3)" }}>Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {monthly.map((d, i) => {
                const pct = (d.revenue / maxR) * 100;
                const isLast = i === monthly.length - 1;
                return (
                  <div key={d.month} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-7 flex-shrink-0 text-right" style={{ color:"var(--text3)" }}>{d.month}</span>
                    <div className="flex-1 h-7 rounded-full overflow-hidden" style={{ background:"var(--surface2)" }}>
                      <div className="h-full rounded-full"
                        style={{ width:`${pct}%`, minWidth: d.revenue > 0 ? 8 : 0, background:isLast?"linear-gradient(to right,#6366f1,#a78bfa)":"linear-gradient(to right,#c7d2fe,#ddd6fe)", transition:"width 0.8s ease" }} />
                    </div>
                    <span className="text-[11px] font-black w-24 text-right flex-shrink-0" style={{ color:"var(--text)" }}>{formatRupiah(d.revenue)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Order volume column bars */}
        <Card>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-0.5" style={{ color:"var(--text3)" }}>Pesanan</p>
          <p className="font-black text-sm mb-5" style={{ color:"var(--text)" }}>Distribusi Status</p>
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2" style={{ color:"var(--text3)" }}>
              <Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Memuat...</span>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-5">
                {Object.entries(statusMap).map(([status, count]) => {
                  const pct = (count / totalOrdersForStatus) * 100;
                  const cfg: Record<string, { bar: string; bg: string; color: string }> = {
                    paid:      { bar:"linear-gradient(to right,#10b981,#059669)", bg:"rgba(16,185,129,0.1)", color:"#10b981" },
                    pending:   { bar:"linear-gradient(to right,#f59e0b,#d97706)", bg:"rgba(245,158,11,0.1)",  color:"#f59e0b" },
                    cancelled: { bar:"linear-gradient(to right,#ef4444,#dc2626)", bg:"rgba(239,68,68,0.1)",   color:"#ef4444" },
                    refunded:  { bar:"linear-gradient(to right,#8b5cf6,#7c3aed)", bg:"rgba(139,92,246,0.1)",  color:"#8b5cf6" },
                  };
                  const c = cfg[status] ?? cfg.pending;
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full capitalize"
                          style={{ background:c.bg, color:c.color, border:`1px solid ${c.color}25` }}>{status}</span>
                        <span className="text-xs" style={{ color:"var(--text3)" }}>{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background:"var(--surface2)" }}>
                        <div className="h-full rounded-full" style={{ width:`${pct}%`, background:c.bar }} />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(statusMap).length === 0 && (
                  <p className="text-xs text-center py-4" style={{ color:"var(--text3)" }}>Belum ada data order</p>
                )}
              </div>
              <div className="rounded-2xl p-5 text-center" style={{ background:"linear-gradient(135deg,rgba(16,185,129,0.08),rgba(6,182,212,0.08))", border:"1px solid rgba(16,185,129,0.15)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color:"var(--text3)" }}>Order Paid Rate</p>
                <p className="font-black" style={{ fontSize:42, color:"#10b981", fontFamily:"Outfit,sans-serif", lineHeight:1 }}>
                  {summary.total_orders > 0 ? Math.round((summary.paid_orders / summary.total_orders) * 100) : 0}%
                </p>
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Category breakdown */}
        <Card>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-0.5" style={{ color:"var(--text3)" }}>Breakdown</p>
          <p className="font-black text-sm mb-5" style={{ color:"var(--text)" }}>Revenue per Kategori</p>
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2" style={{ color:"var(--text3)" }}>
              <Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Memuat...</span>
            </div>
          ) : cats.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color:"var(--text3)" }}>Belum ada data kategori</p>
          ) : (
            <div className="space-y-4">
              {cats.map(([cat, data], i) => {
                const pct = (data.revenue / maxC) * 100;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm shadow-sm" style={{ background:catGrads[i % catGrads.length] }}>
                          {catIcons[cat] ?? "📦"}
                        </div>
                        <span className="text-xs font-bold capitalize" style={{ color:"var(--text)" }}>{cat}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-black" style={{ color:"var(--text)" }}>{formatRupiah(data.revenue)}</span>
                        <span className="text-[10px] ml-2" style={{ color:"var(--text3)" }}>{data.sold} sold</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background:"var(--surface2)" }}>
                      <div className="h-full rounded-full" style={{ width:`${pct}%`, background:catGrads[i % catGrads.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Top products */}
        <Card>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-0.5" style={{ color:"var(--text3)" }}>Top 5</p>
          <p className="font-black text-sm mb-5" style={{ color:"var(--text)" }}>Produk Terlaris</p>
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2" style={{ color:"var(--text3)" }}>
              <Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Memuat...</span>
            </div>
          ) : topProducts.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color:"var(--text3)" }}>Belum ada data produk</p>
          ) : (
            <div className="space-y-4">
              {topProducts.map((p, i) => {
                const maxSold = Math.max(...topProducts.map(x => x.sold), 1);
                const pct     = (p.sold / maxSold) * 100;
                return (
                  <div key={p.id}>
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-[10px] font-black w-5 text-center flex-shrink-0" style={{ color:"var(--text3)" }}>#{i + 1}</span>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded-xl object-cover flex-shrink-0" />
                        : <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold line-clamp-1" style={{ color:"var(--text)" }}>{p.name}</p>
                        <p className="text-[10px]" style={{ color:"var(--text3)" }}>{p.sold} terjual</p>
                      </div>
                      <span className="text-[11px] font-black flex-shrink-0" style={{ color:"var(--text)" }}>{formatRupiah(p.price)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden ml-8" style={{ background:"var(--surface2)" }}>
                      <div className="h-full rounded-full" style={{ width:`${pct}%`, background:catGrads[i % catGrads.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
