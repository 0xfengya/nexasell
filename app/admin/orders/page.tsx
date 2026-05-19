"use client";
import { useState, useEffect, useCallback } from "react";
import {
  ShoppingBag, Monitor, Globe, RefreshCw, Loader2, Search,
  ChevronDown, ChevronUp, Package, Phone, MapPin, StickyNote, Clock,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface OrderItem { name: string; quantity: number; price: number; subtotal: number; }
interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  notes: string | null;
  total: number;
  status: string;
  pay_method: string | null;
  pay_status: string;
  source: string;
  created_at: string;
  order_items: OrderItem[];
}

const STATUS_TABS = ["all", "pending", "paid", "cancelled"];
const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer", ewallet: "E-Wallet",
  qris: "QRIS", credit_card: "Kartu Kredit", cash: "Tunai", card: "Kartu",
};

function statusCfg(s: string) {
  if (s === "paid")      return { bg: "rgba(16,185,129,0.1)",  color: "#10b981", border: "rgba(16,185,129,0.25)" };
  if (s === "pending")   return { bg: "rgba(245,158,11,0.1)",  color: "#f59e0b", border: "rgba(245,158,11,0.25)" };
  if (s === "cancelled") return { bg: "rgba(239,68,68,0.1)",   color: "#ef4444", border: "rgba(239,68,68,0.25)"  };
  return { bg: "rgba(100,116,139,0.1)", color: "#64748b", border: "rgba(100,116,139,0.2)" };
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminOrdersPage() {
  const [allOrders,   setAllOrders]   = useState<Order[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [search,      setSearch]      = useState("");
  const [sourceTab,   setSourceTab]   = useState<"online" | "pos">("online");
  const [statusTab,   setStatusTab]   = useState("all");
  const [expanded,    setExpanded]    = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setRefreshing(true);
    try {
      const res  = await fetch("/api/orders?limit=200&offset=0");
      const json = await res.json();
      if (res.ok) setAllOrders(json.data ?? []);
    } catch { /* silent */ } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Split by source
  const onlineOrders = allOrders.filter(o => o.source === "online");
  const posOrders    = allOrders.filter(o => o.source === "pos");
  const sourceOrders = sourceTab === "online" ? onlineOrders : posOrders;

  // Status filter + search on top of source
  const filtered = sourceOrders
    .filter(o => statusTab === "all" || o.status === statusTab)
    .filter(o =>
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_phone ?? "").includes(search)
    );

  const counts = sourceOrders.reduce((a, o) => {
    a[o.status] = (a[o.status] ?? 0) + 1; return a;
  }, {} as Record<string, number>);

  const SOURCE_TABS = [
    { key: "online" as const, label: "Order Online",  icon: Globe,   color: "#6366f1", count: onlineOrders.length },
    { key: "pos"    as const, label: "Kasir (POS)",   icon: Monitor, color: "#10b981", count: posOrders.length    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-full" style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        .expand-btn:hover { background: rgba(99,102,241,0.04) !important; }
        .src-tab { transition: all 0.2s cubic-bezier(0.16,1,0.3,1); }
        .src-tab:hover { transform: translateY(-1px); }
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 fade-up">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: "var(--text3)" }}>Admin</p>
          <h1 className="font-black text-2xl sm:text-3xl" style={{ color: "var(--text)", fontFamily: "Outfit,sans-serif" }}>
            History Pesanan
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text2)" }}>
            {loading ? "Memuat..." : `${allOrders.length} total order • ${onlineOrders.length} online • ${posOrders.length} kasir`}
          </p>
        </div>
        <button onClick={fetchOrders} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}>
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── SOURCE TABS (main nav) ── */}
      <div className="grid grid-cols-2 gap-3 mb-6 fade-up" style={{ animationDelay: "0.04s" }}>
        {SOURCE_TABS.map(({ key, label, icon: Icon, color, count }) => {
          const active = sourceTab === key;
          return (
            <button
              key={key}
              onClick={() => { setSourceTab(key); setStatusTab("all"); setSearch(""); setExpanded(null); }}
              className="src-tab relative flex items-center gap-3 p-4 sm:p-5 rounded-2xl text-left overflow-hidden"
              style={{
                background: active
                  ? `linear-gradient(135deg,${color}18,${color}08)`
                  : "var(--surface)",
                border: active ? `2px solid ${color}50` : "2px solid var(--border)",
                cursor: "pointer",
              }}
            >
              {/* glow blob */}
              {active && (
                <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20"
                  style={{ background: color, filter: "blur(16px)" }} />
              )}
              <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: active ? `${color}20` : "var(--surface2)" }}>
                <Icon className="w-5 h-5" style={{ color: active ? color : "var(--text3)" }} />
              </div>
              <div className="relative flex-1 min-w-0">
                <p className="font-black text-sm" style={{ color: active ? color : "var(--text)" }}>{label}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text3)" }}>
                  {loading ? "—" : count} pesanan
                </p>
              </div>
              {active && (
                <div className="relative w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── STATUS PILLS ── */}
      <div className="flex flex-wrap gap-2 mb-4 fade-up" style={{ animationDelay: "0.08s" }}>
        {[
          { key: "all",       label: "Semua",     color: "#6366f1" },
          { key: "pending",   label: "Pending",   color: "#f59e0b" },
          { key: "paid",      label: "Paid",      color: "#10b981" },
          { key: "cancelled", label: "Cancelled", color: "#ef4444" },
        ].map(s => {
          const cnt   = s.key === "all" ? sourceOrders.length : (counts[s.key] ?? 0);
          const active = statusTab === s.key;
          return (
            <button key={s.key} onClick={() => setStatusTab(s.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                background: active ? s.color : `${s.color}12`,
                color: active ? "#fff" : s.color,
                border: `1px solid ${active ? s.color : s.color + "30"}`,
              }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? "#fff" : s.color }} />
              {s.label} {loading ? "" : `(${cnt})`}
            </button>
          );
        })}

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text3)" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama / no. order / HP..."
            className="pl-9 pr-4 py-1.5 rounded-full text-xs outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "inherit", minWidth: 200 }}
          />
        </div>
      </div>

      {/* ── ORDERS LIST ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24 gap-2" style={{ color: "var(--text3)" }}>
          <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Memuat pesanan...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3" style={{ color: "var(--text3)" }}>
          <ShoppingBag className="w-10 h-10 opacity-30" />
          <p className="text-sm">Tidak ada pesanan ditemukan</p>
        </div>
      ) : (
        <div className="space-y-2 fade-up" style={{ animationDelay: "0.12s" }}>
          {filtered.map(order => {
            const sc     = statusCfg(order.status);
            const isOpen = expanded === order.id;
            return (
              <div key={order.id} className="rounded-2xl overflow-hidden"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

                <button onClick={() => setExpanded(isOpen ? null : order.id)}
                  className="expand-btn w-full text-left px-4 sm:px-5 py-4 flex items-center gap-3"
                  style={{ background: "transparent", border: "none", cursor: "pointer", transition: "background 0.15s" }}>

                  <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-black"
                    style={{ background: sourceTab === "online" ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "linear-gradient(135deg,#10b981,#059669)" }}>
                    {order.customer_name[0]?.toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black" style={{ color: "var(--text)" }}>{order.customer_name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-lg"
                        style={{ background: "var(--surface2)", color: "var(--text3)" }}>
                        {order.order_number}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-[11px]" style={{ color: "var(--text3)" }}>
                        <Clock className="w-3 h-3 inline mr-0.5 -mt-0.5" />{fmt(order.created_at)}
                      </span>
                      <span className="text-[11px]" style={{ color: "var(--text3)" }}>
                        {order.order_items?.length ?? 0} item
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right flex flex-col items-end gap-1.5">
                    <span className="font-black text-sm" style={{ color: "var(--text)", fontFamily: "Outfit,sans-serif" }}>
                      {formatRupiah(order.total)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full"
                      style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.color }} />
                      {order.status}
                    </span>
                  </div>

                  <div className="flex-shrink-0 ml-1" style={{ color: "var(--text3)" }}>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Expanded */}
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: "var(--text3)" }}>
                          Info Pelanggan
                        </p>
                        <div className="space-y-2">
                          {order.customer_phone && (
                            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text2)" }}>
                              <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text3)" }} />
                              {order.customer_phone}
                            </div>
                          )}
                          {order.customer_address && (
                            <div className="flex items-start gap-2 text-xs" style={{ color: "var(--text2)" }}>
                              <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "var(--text3)" }} />
                              {order.customer_address}
                            </div>
                          )}
                          {order.notes && (
                            <div className="flex items-start gap-2 text-xs" style={{ color: "var(--text2)" }}>
                              <StickyNote className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "var(--text3)" }} />
                              {order.notes}
                            </div>
                          )}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl"
                            style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}>
                            💳 {METHOD_LABELS[order.pay_method ?? ""] ?? order.pay_method ?? "—"}
                          </span>
                          <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl"
                            style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}>
                            Pay: {order.pay_status}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: "var(--text3)" }}>
                          Item Pesanan
                        </p>
                        <div className="space-y-2">
                          {(order.order_items ?? []).map((item, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ background: "var(--surface2)" }}>
                                  <Package className="w-3 h-3" style={{ color: "var(--text3)" }} />
                                </div>
                                <span className="truncate font-semibold" style={{ color: "var(--text)" }}>{item.name}</span>
                                <span style={{ color: "var(--text3)" }}>×{item.quantity}</span>
                              </div>
                              <span className="font-black flex-shrink-0" style={{ color: "var(--text)" }}>
                                {formatRupiah(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between pt-2 mt-1 border-t font-black text-sm"
                            style={{ borderColor: "var(--border)" }}>
                            <span style={{ color: "var(--text2)" }}>Total</span>
                            <span style={{ color: "#6366f1" }}>{formatRupiah(order.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
