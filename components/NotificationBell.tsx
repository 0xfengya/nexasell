"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Bell, ShoppingBag, AlertTriangle, BarChart2, Wrench, X, CheckCheck } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

export interface AppNotif {
  id:        string;
  type:      "new_order" | "new_trx" | "low_stock" | "daily_rep" | "sys_update" | "shift" | "report" | "system";
  title:     string;
  body:      string;
  read:      boolean;
  createdAt: Date;
}

const ICONS: Record<AppNotif["type"], { icon: typeof Bell; color: string }> = {
  new_order:  { icon: ShoppingBag,   color: "#6366f1" },
  new_trx:    { icon: ShoppingBag,   color: "#10b981" },
  low_stock:  { icon: AlertTriangle, color: "#f59e0b" },
  daily_rep:  { icon: BarChart2,     color: "#8b5cf6" },
  report:     { icon: BarChart2,     color: "#8b5cf6" },
  shift:      { icon: Bell,          color: "#06b6d4" },
  sys_update: { icon: Wrench,        color: "#6b7280" },
  system:     { icon: Wrench,        color: "#6b7280" },
};

function timeAgo(d: Date): string {
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)    return "Baru saja";
  if (diff < 3600)  return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (Math.floor(diff / 86400) === 1) return "Kemarin";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

interface Props {
  role:           "admin" | "cashier";
  accentColor:    string;
  apiBase:        string;
  pollInterval?:  number;
  dropDirection?: "left" | "right" | "auto"; // default: auto
}

export default function NotificationBell({ role, accentColor, apiBase, pollInterval = 15_000, dropDirection = "auto" }: Props) {
  const [open,   setOpen]   = useState(false);
  const [notifs, setNotifs] = useState<AppNotif[]>([]);
  const [prefs,  setPrefs]  = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<"idle" | "live">("idle");

  const bellRef  = useRef<HTMLButtonElement>(null);
  const dropRef  = useRef<HTMLDivElement>(null);
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});

  // Hitung posisi dropdown: expand ke kanan jika ada ruang, ke kiri jika tidak
  const calcDropStyle = useCallback(() => {
    if (!bellRef.current) return;
    const rect = bellRef.current.getBoundingClientRect();
    const DROPDOWN_W = 320;
    const style: React.CSSProperties = {
      position: "fixed",
      top: rect.bottom + 8,
      zIndex: 99999,
      width: DROPDOWN_W,
    };
    if (dropDirection === "right" || (dropDirection === "auto" && window.innerWidth - rect.left >= DROPDOWN_W)) {
      style.left = rect.left; // expand ke kanan
    } else {
      style.right = window.innerWidth - rect.right; // expand ke kiri
    }
    setDropStyle(style);
  }, []);

  // sinceRef: only advance after we confirm new notifs processed
  const sinceRef     = useRef<string>(new Date(Date.now() - 60_000).toISOString());
  // seenIds & seenLowStock: session-only (reset saat reload, wajar)
  const seenIds      = useRef<Set<string>>(new Set());
  const seenLowStock = useRef<Set<string>>(new Set());

  // dismissedIds: persisten di localStorage agar tidak muncul lagi setelah pindah halaman
  const LS_KEY = `nexasell_dismissed_${role}`;
  const dismissedIds = useRef<Set<string>>(
    new Set(typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as string[]
      : [])
  );
  const saveDismissed = useCallback(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify([...dismissedIds.current])); } catch {}
  }, [LS_KEY]);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        dropRef.current  && !dropRef.current.contains(e.target as Node) &&
        bellRef.current  && !bellRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Load prefs once
  useEffect(() => {
    fetch(`${apiBase}/profile`)
      .then(r => r.json())
      .then(json => { if (json.data?.notif_preferences) setPrefs(json.data.notif_preferences); })
      .catch(() => {});
  }, [apiBase]);

  const isEnabled = useCallback((type: AppNotif["type"]) => {
    if (Object.keys(prefs).length === 0) return true;
    return prefs[type] !== false;
  }, [prefs]);

  const addNotif = useCallback((n: AppNotif) => {
    if (!isEnabled(n.type))           return; // preference off
    if (seenIds.current.has(n.id))    return; // already shown
    if (dismissedIds.current.has(n.id)) return; // user dismissed
    seenIds.current.add(n.id);
    setNotifs(prev => [n, ...prev].slice(0, 50));
  }, [isEnabled]);

  // Polling
  const poll = useCallback(async () => {
    try {
      const res  = await fetch(`/api/notifications?since=${encodeURIComponent(sinceRef.current)}`);
      if (!res.ok) return;
      const json = await res.json();
      const { new_orders = [], low_stock = [], checked_at } = json.data ?? {};

      for (const order of new_orders) {
        const type = role === "admin" ? "new_order" : "new_trx";
        addNotif({
          id:        `order-${order.id}`,
          type,
          title:     role === "admin" ? "Pesanan Baru Masuk" : "Transaksi Baru",
          body:      `${order.customer_name ?? "Pelanggan"} · ${formatRupiah(order.total ?? 0)}`,
          read:      false,
          createdAt: new Date(order.created_at),
        });
      }

      for (const product of low_stock) {
        const key = `${product.id}-${product.stock}`;
        if (seenLowStock.current.has(key)) continue;
        seenLowStock.current.add(key);
        addNotif({
          id:        `stock-${product.id}-${product.stock}`,
          type:      "low_stock",
          title:     "Stok Menipis!",
          body:      `${product.name} tersisa ${product.stock} unit`,
          read:      false,
          createdAt: new Date(),
        });
      }

      // Only advance since after processing
      if (checked_at) sinceRef.current = checked_at;
      setStatus("live");
    } catch {
      setStatus("idle");
    }
  }, [role, addNotif]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, pollInterval);
    return () => clearInterval(id);
  }, [poll, pollInterval]);

  const unread     = notifs.filter(n => !n.read).length;
  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const markRead    = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  // Dismiss: remove from list AND persist to localStorage
  const dismiss = (id: string) => {
    dismissedIds.current.add(id);
    saveDismissed();
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  // Clear all: persist semua ke localStorage
  const clearAll = () => {
    notifs.forEach(n => dismissedIds.current.add(n.id));
    saveDismissed();
    setNotifs([]);
  };

  const handleOpen = () => {
    calcDropStyle();
    const next = !open;
    setOpen(next);
    if (next && unread > 0) markAllRead(); // mark read when opening
  };

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={bellRef}
        onClick={handleOpen}
        className="relative w-9 h-9 rounded-2xl flex items-center justify-center transition-all"
        style={{
          background: open ? `${accentColor}18` : "var(--surface2)",
          border: `1.5px solid ${open ? accentColor + "44" : "var(--border)"}`,
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = `${accentColor}12`; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = "var(--surface2)"; }}>
        <Bell className="w-4 h-4" style={{ color: open ? accentColor : "var(--text2)" }} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-black pointer-events-none"
            style={{ background: "#ef4444", fontSize: 9, minWidth: 16 }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown — render via portal agar selalu di atas semua elemen */}
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={dropRef}
          className="rounded-3xl shadow-2xl overflow-hidden"
          style={{
            ...dropStyle,
            background: "var(--surface)",
            border:     "1px solid var(--border)",
          }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: accentColor }} />
              <span className="text-sm font-black" style={{ color: "var(--text)" }}>Notifikasi</span>
              {notifs.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: `${accentColor}15`, color: accentColor }}>
                  {notifs.length}
                </span>
              )}
            </div>
            {notifs.length > 0 && (
              <div className="flex items-center gap-1">
                <button onClick={markAllRead} title="Tandai semua dibaca"
                  className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ color: "var(--text3)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
                <button onClick={clearAll} title="Hapus semua"
                  className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ color: "var(--text3)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: "var(--surface2)" }}>
                  <Bell className="w-5 h-5" style={{ color: "var(--text3)" }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--text3)" }}>Belum ada notifikasi</p>
                <p className="text-xs text-center px-6" style={{ color: "var(--text3)", opacity: 0.7 }}>
                  Notifikasi muncul otomatis saat ada pesanan baru atau stok menipis
                </p>
              </div>
            ) : (
              notifs.map((n, i) => {
                const { icon: Icon, color } = ICONS[n.type] ?? ICONS.system;
                return (
                  <div key={n.id}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer group"
                    style={{
                      background: n.read ? undefined : `${accentColor}08`,
                      borderBottom: i < notifs.length - 1 ? "1px solid var(--border)" : undefined,
                      transition: "background 0.15s",
                    }}
                    onClick={() => markRead(n.id)}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = n.read ? "" : `${accentColor}08`)}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${color}15` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-bold leading-tight" style={{ color: "var(--text)" }}>{n.title}</p>
                        {!n.read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: accentColor }} />}
                      </div>
                      <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "var(--text2)" }}>{n.body}</p>
                      <p className="text-[10px] mt-1" style={{ color: "var(--text3)" }}>{timeAgo(n.createdAt)}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                      className="flex-shrink-0 w-5 h-5 rounded-lg flex items-center justify-center mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "var(--text3)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--surface3,#e5e7eb)"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 flex items-center justify-between"
            style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-[10px]" style={{ color: "var(--text3)" }}>Cek setiap {pollInterval / 1000}s</p>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: status === "live" ? "#10b981" : "#f59e0b" }} />
              <span className="text-[10px] font-semibold"
                style={{ color: status === "live" ? "#10b981" : "#f59e0b" }}>
                {status === "live" ? "Live" : "Connecting..."}
              </span>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
