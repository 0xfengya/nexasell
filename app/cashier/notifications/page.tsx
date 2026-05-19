"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell, ShoppingBag, AlertTriangle,
  X, CheckCheck, Trash2, RefreshCcw, Loader2,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface AppNotif {
  id:        string;
  type:      "new_trx" | "low_stock";
  title:     string;
  body:      string;
  read:      boolean;
  createdAt: Date;
}

const ICONS: Record<AppNotif["type"], { icon: typeof Bell; color: string; bg: string }> = {
  new_trx:   { icon: ShoppingBag,   color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  low_stock: { icon: AlertTriangle, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
};

const TYPE_LABELS: Record<AppNotif["type"], string> = {
  new_trx:   "Transaksi",
  low_stock: "Stok Menipis",
};

function timeAgo(d: Date): string {
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)    return "Baru saja";
  if (diff < 3600)  return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (Math.floor(diff / 86400) === 1) return "Kemarin";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

const LS_KEY = "nexasell_dismissed_cashier";
const loadDismissed = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) ?? "[]")); } catch { return new Set(); }
};
const saveDismissed = (ids: Set<string>) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify([...ids])); } catch {}
};

export default function CashierNotificationsPage() {
  const [notifs,  setNotifs]  = useState<AppNotif[]>([]);
  const [status,  setStatus]  = useState<"idle" | "live">("idle");
  const [filter,  setFilter]  = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);

  const dismissedIds = useRef<Set<string>>(loadDismissed());
  const seenIds      = useRef<Set<string>>(new Set());
  const seenLowStock = useRef<Set<string>>(new Set());
  const sinceRef     = useRef<string>(new Date(Date.now() - 60_000).toISOString());

  const addNotif = useCallback((n: AppNotif) => {
    if (dismissedIds.current.has(n.id)) return;
    if (seenIds.current.has(n.id))      return;
    seenIds.current.add(n.id);
    setNotifs(prev => [n, ...prev].slice(0, 100));
  }, []);

  const poll = useCallback(async (isFirst = false) => {
    if (isFirst) setLoading(true);
    try {
      const res  = await fetch("/api/notifications?since=" + encodeURIComponent(sinceRef.current));
      if (!res.ok) return;
      const json = await res.json();
      const { new_orders = [], low_stock = [], checked_at } = json.data ?? {};

      for (const order of new_orders) {
        addNotif({
          id:        "order-" + order.id,
          type:      "new_trx",
          title:     "Transaksi Baru",
          body:      "#" + (order.order_number ?? order.id.slice(0,8)) + " · " + (order.customer_name ?? "Pelanggan") + " · " + formatRupiah(order.total ?? 0),
          read:      false,
          createdAt: new Date(order.created_at),
        });
      }
      for (const product of low_stock) {
        const key = product.id + "-" + product.stock;
        if (seenLowStock.current.has(key)) continue;
        seenLowStock.current.add(key);
        addNotif({
          id:        "stock-" + product.id + "-" + product.stock,
          type:      "low_stock",
          title:     "Stok Menipis!",
          body:      product.name + " tersisa " + product.stock + " unit",
          read:      false,
          createdAt: new Date(),
        });
      }
      if (checked_at) sinceRef.current = checked_at;
      setStatus("live");
    } catch {
      setStatus("idle");
    } finally {
      if (isFirst) setLoading(false);
    }
  }, [addNotif]);

  useEffect(() => {
    poll(true);
    const id = setInterval(() => poll(), 15_000);
    return () => clearInterval(id);
  }, [poll]);

  const markRead    = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const dismiss = (id: string) => {
    dismissedIds.current.add(id);
    saveDismissed(dismissedIds.current);
    setNotifs(prev => prev.filter(n => n.id !== id));
  };
  const clearAll = () => {
    notifs.forEach(n => dismissedIds.current.add(n.id));
    saveDismissed(dismissedIds.current);
    setNotifs([]);
  };

  const unread   = notifs.filter(n => !n.read).length;
  const filtered = filter === "unread" ? notifs.filter(n => !n.read) : notifs;

  return (
    <div className="p-4 sm:p-6 w-full max-w-full">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 rounded-full" style={{ background: "linear-gradient(to bottom, #8b5cf6, #06b6d4)" }} />
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">Notifikasi</h1>
            {unread > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: "#8b5cf6" }}>
                {unread} baru
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 ml-3.5">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: status === "live" ? "#10b981" : "#f59e0b" }} />
            <p className="text-xs font-semibold" style={{ color: status === "live" ? "#10b981" : "#f59e0b" }}>
              {status === "live" ? "Live · cek setiap 15 detik" : "Connecting..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => poll(true)} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <RefreshCcw className={"w-3.5 h-3.5" + (loading ? " animate-spin" : "")} />
            Refresh
          </button>
          {notifs.length > 0 && (<>
            <button onClick={markAllRead} title="Tandai semua dibaca"
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <CheckCheck className="w-4 h-4" />
            </button>
            <button onClick={clearAll} title="Hapus semua"
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/[0.08]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <Trash2 className="w-4 h-4" />
            </button>
          </>)}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total",        value: notifs.length,                                      color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  border: "border-violet-100 dark:border-violet-500/20" },
          { label: "Belum Dibaca", value: unread,                                              color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "border-red-100 dark:border-red-500/20"       },
          { label: "Transaksi",    value: notifs.filter(n => n.type === "new_trx").length,    color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "border-emerald-100 dark:border-emerald-500/20" },
          { label: "Stok Menipis", value: notifs.filter(n => n.type === "low_stock").length,  color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "border-amber-100 dark:border-amber-500/20"   },
        ].map(s => (
          <div key={s.label} className={"bg-[var(--surface)] rounded-2xl p-4 border " + s.border + " hover:shadow-md dark:hover:shadow-black/20 transition-all"}>
            <div className="p-2.5 rounded-xl w-fit mb-3" style={{ background: s.bg }}>
              <Bell className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-none mb-1">{s.value}</p>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(["all", "unread"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={"px-4 py-1.5 rounded-xl text-xs font-bold transition-all " +
              (filter === f
                ? "text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 bg-[var(--surface)] hover:bg-gray-100 dark:hover:bg-white/[0.06]")}
            style={{
              background: filter === f ? "#8b5cf6" : undefined,
              border: "1px solid " + (filter === f ? "#8b5cf6" : "var(--border)"),
            }}>
            {f === "all" ? "Semua" : "Belum Dibaca"}
            {f === "all"    && notifs.length > 0 && <span className="ml-1 opacity-60">({notifs.length})</span>}
            {f === "unread" && unread > 0         && <span className="ml-1 opacity-60">({unread})</span>}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-[var(--surface)] rounded-2xl border border-black/[0.06] dark:border-white/[0.06] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Memuat notifikasi...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gray-100 dark:bg-white/[0.06]">
              <Bell className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
              {filter === "unread" ? "Semua sudah dibaca" : "Belum ada notifikasi"}
            </p>
            <p className="text-xs text-center px-10 text-gray-400">
              {filter === "unread"
                ? "Tidak ada notifikasi baru saat ini"
                : "Notifikasi transaksi dan stok menipis akan muncul di sini secara otomatis"}
            </p>
          </div>
        ) : (
          filtered.map((n, i) => {
            const { icon: Icon, color, bg } = ICONS[n.type] ?? ICONS.system;
            return (
              <div key={n.id}
                className="flex items-start gap-4 px-5 py-4 cursor-pointer group transition-all hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                style={{
                  background:   n.read ? undefined : "rgba(139,92,246,0.04)",
                  borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : undefined,
                }}
                onClick={() => markRead(n.id)}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: bg }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: bg, color }}>
                      {TYPE_LABELS[n.type]}
                    </span>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#8b5cf6" }} />}
                    <span className="text-[10px] ml-auto text-gray-400">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{n.title}</p>
                  <p className="text-xs mt-0.5 text-gray-500 dark:text-gray-400">{n.body}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                  className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/[0.08]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
