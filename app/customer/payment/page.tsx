"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2, Clock, Copy, ArrowLeft, Banknote,
  Wallet, Smartphone, CreditCard, ChevronDown, ChevronUp,
  RefreshCw, Shield, Zap, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import { formatRupiah } from "@/lib/utils";
import { useTheme } from "@/lib/ThemeContext";

/* ─── Types ─── */
type PayStatus = "pending" | "checking" | "success" | "expired";
/* Key HARUS sama dengan value di checkout/page.tsx */
type MethodKey = "bank_transfer" | "ewallet" | "qris" | "credit_card";

interface PayMethod {
  key: MethodKey;
  label: string;
  sub: string;
  icon: React.ElementType;
  color: string;
  /* Detail per metode */
  vaNumber?: string;       // bank_transfer: hanya angka, tidak ada huruf
  bank?: string;
  ewalletPhone?: string;   // ewallet: nomor HP biasa (0812...)
  qrUrl?: string;
  instructions: string[];
}

/* ─── Data metode — key SINKRON dengan checkout/page.tsx ─── */
const METHODS: PayMethod[] = [
  {
    key: "bank_transfer",
    label: "Bank Transfer",
    sub: "BCA Virtual Account",
    icon: Banknote,
    color: "#0060AF",
    bank: "BCA",
    vaNumber: "8277082512345678",   // HANYA angka — ditampilkan dengan format grup
    instructions: [
      "Buka aplikasi BCA Mobile / myBCA atau ATM BCA",
      "Pilih Transfer → BCA Virtual Account",
      "Masukkan nomor VA di atas, lalu Next",
      "Periksa nama tujuan: NEXASELL, konfirmasi nominal",
      "Selesaikan pembayaran. Konfirmasi otomatis 1–5 menit.",
    ],
  },
  {
    key: "ewallet",
    label: "E-Wallet",
    sub: "GoPay / OVO / DANA",
    icon: Wallet,
    color: "#00AED6",
    ewalletPhone: "081234567890",   // nomor HP biasa
    instructions: [
      "Buka aplikasi GoPay, OVO, atau DANA",
      "Pilih Transfer / Kirim Uang",
      "Masukkan nomor: 081234567890",
      "Konfirmasi nama penerima: NEXASELL",
      "Masukkan nominal tepat, lalu konfirmasi",
    ],
  },
  {
    key: "qris",
    label: "QRIS",
    sub: "Semua e-wallet & m-banking",
    icon: Smartphone,
    color: "#E02020",
    qrUrl: "https://api.qrserver.com/v1/create-qr-code/?data=NEXASELL-PAY-ORD2024-0042&size=200x200",
    instructions: [
      "Buka aplikasi e-wallet atau m-banking yang mendukung QRIS",
      "Pilih fitur Scan / Pay / Bayar",
      "Scan QR Code di atas",
      "Nominal muncul otomatis, konfirmasi & selesaikan",
    ],
  },
  {
    key: "credit_card",
    label: "Kartu Kredit / Debit",
    sub: "Visa · Mastercard · JCB",
    icon: CreditCard,
    color: "#6366F1",
    instructions: [
      "Klik tombol 'Bayar dengan Kartu' di bawah",
      "Anda diarahkan ke halaman aman Midtrans",
      "Masukkan nomor kartu, masa berlaku, dan CVV",
      "OTP dikirim ke nomor HP terdaftar di bank",
      "Pembayaran dikonfirmasi otomatis",
    ],
  },
];

/* ─── Real order type ─── */
interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  image_url?: string;
}

interface RealOrder {
  id: string;
  order_number: string;
  total: number;
  customer_name: string;
  pay_status: string;
  status: string;
  pay_method: string | null;
  order_items: OrderItem[];
  created_at: string;
}

/* ─── Format VA: 16 digit → "8277 0825 1234 5678" ─── */
function formatVA(raw: string) {
  return raw.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim();
}

/* ─── Format nomor HP: "081234567890" → "0812-3456-7890" ─── */
function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.length <= 4)  return d;
  if (d.length <= 8)  return `${d.slice(0,4)}-${d.slice(4)}`;
  if (d.length <= 12) return `${d.slice(0,4)}-${d.slice(4,8)}-${d.slice(8)}`;
  return `${d.slice(0,4)}-${d.slice(4,8)}-${d.slice(8,12)}-${d.slice(12)}`;
}

/* ─── Countdown ─── */
function useCountdown(targetMs: number) {
  const [left, setLeft] = useState(Math.max(targetMs - Date.now(), 0));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(targetMs - Date.now(), 0)), 1000);
    return () => clearInterval(t);
  }, [targetMs]);
  return {
    h: Math.floor(left / 3_600_000),
    m: Math.floor((left % 3_600_000) / 60_000),
    s: Math.floor((left % 60_000) / 1000),
    expired: left <= 0,
  };
}

/* ─── Copy button ─── */
function CopyButton({ text, dark }: { text: string; dark: boolean }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text.replace(/\D/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0"
      style={{
        background: copied ? "#10b981" : "rgba(99,102,241,.15)",
        color: copied ? "#fff" : "#6366f1",
        border: `1px solid ${copied ? "#10b981" : "rgba(99,102,241,.3)"}`,
        transition: "all .2s",
      }}
    >
      {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Disalin!" : "Salin"}
    </button>
  );
}

/* ─── Number display box (VA / nomor HP) ─── */
function NumberBox({ label, number, dark }: { label: string; number: string; dark: boolean }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold mb-2" style={{ color: "var(--text2)" }}>{label}</p>
      <div
        className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
        style={{
          background: dark ? "rgba(255,255,255,.05)" : "rgba(99,102,241,.05)",
          border: `1.5px dashed ${dark ? "rgba(255,255,255,.18)" : "rgba(99,102,241,.3)"}`,
        }}
      >
        <span
          className="flex-1 font-black tabular-nums select-all"
          style={{ color: "var(--text)", fontSize: "1.05rem", letterSpacing: "0.06em" }}
        >
          {number}
        </span>
        <CopyButton text={number} dark={dark} />
      </div>
    </div>
  );
}

/* ─── Inner (needs useSearchParams) ─── */
function PaymentInner() {
  const { dark: _dark, mounted } = useTheme();
  const dark = mounted ? _dark : false;
  const searchParams = useSearchParams();

  /* Support both ?orderId= (from checkout) and ?order_id= */
  const orderId = searchParams.get("orderId") ?? searchParams.get("order_id");

  const [order, setOrder] = useState<RealOrder | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [orderError, setOrderError] = useState<string | null>(null);

  /* Fetch real order on mount */
  useEffect(() => {
    if (!orderId) { setOrderError("Order ID tidak ditemukan di URL."); setLoadingOrder(false); return; }
    fetch(`/api/orders/${orderId}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) { setOrderError(json.error); }
        else { setOrder(json.data); }
      })
      .catch(() => setOrderError("Gagal memuat data order."))
      .finally(() => setLoadingOrder(false));
  }, [orderId]);

  /* Baca method dari query param yang dikirim checkout, fallback ke pay_method order */
  const methodFromQuery = (searchParams.get("method") ?? order?.pay_method ?? "bank_transfer") as MethodKey;
  const validKeys = METHODS.map(m => m.key);
  const initialKey: MethodKey = validKeys.includes(methodFromQuery) ? methodFromQuery : "bank_transfer";

  const [activeKey, setActiveKey] = useState<MethodKey>(initialKey);
  const [status, setStatus] = useState<PayStatus>(
    order?.pay_status === "success" ? "success" : "pending"
  );
  const [showInstructions, setShowInstructions] = useState(true);
  const [simLoading, setSimLoading] = useState(false);

  /* Sync status when order loads */
  useEffect(() => {
    if (order?.pay_status === "success") setStatus("success");
  }, [order]);

  /* Sync activeKey when order loads */
  useEffect(() => {
    if (order?.pay_method) {
      const k = order.pay_method as MethodKey;
      if (validKeys.includes(k)) setActiveKey(k);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.pay_method]);

  /* Expiry = 24h after order creation */
  const expiredAt = order
    ? new Date(order.created_at).getTime() + 24 * 60 * 60 * 1000
    : Date.now() + 24 * 60 * 60 * 1000;

  const method = METHODS.find(m => m.key === activeKey)!;
  const countdown = useCountdown(expiredAt);

  const card: React.CSSProperties = {
    background: dark ? "rgba(255,255,255,.04)" : "#fff",
    border: `1px solid ${dark ? "rgba(255,255,255,.08)" : "rgba(99,102,241,.14)"}`,
    borderRadius: 20,
    boxShadow: dark ? "0 4px 24px rgba(0,0,0,.3)" : "0 4px 24px rgba(99,102,241,.08)",
  };

  /* Konfirmasi pembayaran manual — update pay_status = success di DB */
  const checkPayment = async () => {
    if (!orderId) return;
    setSimLoading(true);
    setStatus("checking");
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid", pay_status: "success" }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setOrder(json.data);
        setStatus("success");
      } else {
        alert(json.error || "Gagal mengkonfirmasi pembayaran");
        setStatus("pending");
      }
    } catch {
      alert("Terjadi kesalahan. Coba lagi.");
      setStatus("pending");
    } finally {
      setSimLoading(false);
    }
  };

  /* ── LOADING STATE ── */
  if (loadingOrder) return (
    <div className="flex-1 flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: "#6366f1" }} />
        <p className="text-sm font-semibold" style={{ color: "var(--text2)" }}>Memuat data pesanan...</p>
      </div>
    </div>
  );

  /* ── ERROR STATE ── */
  if (orderError || !order) return (
    <div className="flex-1 flex items-center justify-center py-24 px-4">
      <div className="text-center max-w-sm">
        <p className="text-lg font-black mb-2" style={{ color: "var(--text)" }}>Order Tidak Ditemukan</p>
        <p className="text-sm mb-6" style={{ color: "var(--text2)" }}>{orderError ?? "Data pesanan tidak tersedia."}</p>
        <Link href="/" className="px-6 py-3 rounded-2xl text-white text-sm font-bold"
          style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
          Kembali ke Toko
        </Link>
      </div>
    </div>
  );

  /* ── GLOBAL STYLES ── */
  const globalCss = `
    @keyframes pyFade   { from{opacity:0} to{opacity:1} }
    @keyframes pyUp     { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pyBounce {
      0%{opacity:0;transform:scale(0.4)}
      55%{transform:scale(1.12)}
      75%{transform:scale(0.94)}
      100%{opacity:1;transform:scale(1)}
    }
    @keyframes pyPulse  { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.5)} 50%{box-shadow:0 0 0 18px rgba(16,185,129,0)} }
    @keyframes pyBlink  { 0%,100%{opacity:1} 50%{opacity:.55} }
    .py-fade   { animation: pyFade   0.4s ease both; }
    .py-up     { animation: pyUp     0.5s cubic-bezier(0.22,1,0.36,1) both; }
    .py-bounce { animation: pyBounce 0.65s cubic-bezier(0.22,1,0.36,1) both; }
    .py-card   { animation: pyUp     0.5s cubic-bezier(0.22,1,0.36,1) both; }
    .py-success-ring { animation: pyBounce 0.65s cubic-bezier(0.22,1,0.36,1) both, pyPulse 2s ease-in-out 0.8s 3; }
    .py-method { transition: all 0.18s cubic-bezier(0.22,1,0.36,1); }
    .py-method:hover { transform: translateX(3px); }
    .py-method.active { transform: translateX(5px) scale(1.01); }
    .py-cta { transition: all 0.2s cubic-bezier(0.22,1,0.36,1); }
    .py-cta:not(:disabled):hover { transform:translateY(-2px); box-shadow:0 12px 36px rgba(99,102,241,0.45)!important; }
    .py-cta:not(:disabled):active { transform:scale(0.97); }
    .py-urgent { animation: pyBlink 1s ease-in-out infinite; }
  `;

  /* ── SUCCESS ── */
  if (status === "success") return (
    <div className="flex-1 flex items-center justify-center px-4 py-24">
      <style>{globalCss}</style>
      <div className="flex flex-col items-center gap-6 text-center max-w-sm w-full">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center py-success-ring"
          style={{ background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 16px 48px rgba(16,185,129,.35)" }}
        >
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <div className="py-up" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-2xl font-black mb-2" style={{ color: "var(--text)" }}>Pembayaran Berhasil!</h2>
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            Pesanan <span className="font-bold" style={{ color: "#6366f1" }}>{order.order_number}</span> sedang diproses.
            Estimasi pengiriman 2–3 hari kerja.
          </p>
        </div>
        <div className="w-full p-4 rounded-2xl py-up" style={{ ...card, animationDelay: "0.3s" } as React.CSSProperties}>
          <div className="flex justify-between text-sm mb-2">
            <span style={{ color: "var(--text2)" }}>Total Dibayar</span>
            <span className="font-black" style={{ color: "#10b981" }}>{formatRupiah(order.total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text2)" }}>Metode</span>
            <span className="font-bold" style={{ color: "var(--text)" }}>{method.label}</span>
          </div>
        </div>
        <Link href="/"
          className="w-full py-3.5 rounded-2xl text-white text-sm font-black text-center py-up py-cta"
          style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow: "0 4px 20px rgba(99,102,241,.4)", animationDelay: "0.4s" } as React.CSSProperties}
        >
          Kembali ke Toko
        </Link>
      </div>
    </div>
  );

  /* ── EXPIRED ── */
  if (countdown.expired) return (
    <div className="flex-1 flex items-center justify-center px-4 py-24">
      <style>{globalCss}</style>
      <div className="flex flex-col items-center gap-6 text-center max-w-sm py-fade">
        <div className="w-24 h-24 rounded-full flex items-center justify-center py-bounce"
          style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "0 16px 48px rgba(245,158,11,.35)" }}>
          <Clock className="w-12 h-12 text-white" />
        </div>
        <div className="py-up" style={{ animationDelay: "0.15s" }}>
          <h2 className="text-2xl font-black mb-2" style={{ color: "var(--text)" }}>Pembayaran Kedaluwarsa</h2>
          <p className="text-sm" style={{ color: "var(--text2)" }}>Batas waktu pembayaran telah habis. Silakan buat pesanan baru.</p>
        </div>
        <Link href="/customer/cart"
          className="w-full py-3.5 rounded-2xl text-white text-sm font-black text-center py-up py-cta"
          style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow: "0 4px 20px rgba(99,102,241,.4)", animationDelay: "0.25s" } as React.CSSProperties}>
          Kembali ke Keranjang
        </Link>
      </div>
    </div>
  );

  /* ── MAIN ── */
  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10 py-fade">
      <style>{globalCss}</style>

      {/* Back */}
      <Link href="/customer/checkout"
        className="inline-flex items-center gap-2 text-sm font-semibold mb-6 hover:gap-3 transition-all py-up"
        style={{ color: "var(--text2)" }}>
        <ArrowLeft className="w-4 h-4" /> Kembali ke Checkout
      </Link>

      {/* Title */}
      <div className="mb-6 py-up" style={{ animationDelay: "0.05s" }}>
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <h1 className="text-xl sm:text-2xl font-black" style={{ color: "var(--text)" }}>
            Selesaikan Pembayaran
          </h1>
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full text-white"
            style={{ background: "linear-gradient(135deg,#003cff,#0066ff)", boxShadow: "0 2px 8px rgba(0,60,255,.3)" }}>
            🔒 Aman & Terenkripsi
          </span>
        </div>
        <p className="text-sm" style={{ color: "var(--text2)" }}>
          Order <span className="font-bold" style={{ color: "#6366f1" }}>{order.order_number}</span>
          {" · "}{order.customer_name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

        {/* ── LEFT ── */}
        <div className="flex flex-col gap-4">

          {/* Countdown */}
          <div
            className="flex items-center justify-between px-4 py-3 rounded-2xl py-card"
            style={{
              animationDelay: "0.10s",
              background: dark ? "rgba(245,158,11,.08)" : "rgba(255,252,235,.95)",
              border: `1px solid ${dark ? "rgba(245,158,11,.25)" : "rgba(245,158,11,.35)"}`,
            } as React.CSSProperties}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold" style={{ color: dark ? "#fde68a" : "#92400e" }}>
                Batas waktu pembayaran
              </span>
            </div>
            <span
              className={`text-sm font-black tabular-nums ${countdown.h === 0 && countdown.m < 10 ? "py-urgent" : ""}`}
              style={{ color: countdown.h === 0 && countdown.m < 10 ? "#ef4444" : "#d97706" }}
            >
              {String(countdown.h).padStart(2, "0")}:{String(countdown.m).padStart(2, "0")}:{String(countdown.s).padStart(2, "0")}
            </span>
          </div>

          {/* Method selector */}
          <div style={{ ...card, animationDelay: "0.15s" } as React.CSSProperties} className="p-4 py-card">
            <p className="text-xs font-black uppercase tracking-widest mb-3"
              style={{ color: dark ? "rgba(255,255,255,.4)" : "rgba(99,102,241,.7)" }}>
              Pilih Metode Pembayaran
            </p>
            <div className="flex flex-col gap-2">
              {METHODS.map((m) => {
                const Icon = m.icon;
                const active = activeKey === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setActiveKey(m.key)}
                    className={`py-method flex items-center gap-3 px-4 py-3 rounded-2xl text-left w-full ${active ? "active" : ""}`}
                    style={{
                      background: active ? (dark ? `${m.color}22` : `${m.color}14`) : "transparent",
                      border: `1.5px solid ${active ? m.color : dark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.07)"}`,
                      cursor: "pointer",
                    }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${m.color}20`, border: `1px solid ${m.color}35` }}>
                      <Icon className="w-4 h-4" style={{ color: m.color }} />
                    </div>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold" style={{ color: "var(--text)" }}>{m.label}</span>
                      <span className="block text-[11px]" style={{ color: "var(--text3)" }}>{m.sub}</span>
                    </span>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: active ? m.color : dark ? "rgba(255,255,255,.2)" : "rgba(0,0,0,.2)" }}>
                      {active && <div className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment detail */}
          <div style={{ ...card, animationDelay: "0.2s" } as React.CSSProperties} className="p-4 py-card">
            <p className="text-xs font-black uppercase tracking-widest mb-4"
              style={{ color: dark ? "rgba(255,255,255,.4)" : "rgba(99,102,241,.7)" }}>
              Detail Pembayaran
            </p>

            {/* Bank Transfer: VA hanya angka, format grup 4 */}
            {method.key === "bank_transfer" && method.vaNumber && (
              <NumberBox
                label={`Nomor Virtual Account ${method.bank}`}
                number={formatVA(method.vaNumber)}
                dark={dark}
              />
            )}

            {/* E-Wallet: nomor HP format 0812-3456-7890 */}
            {method.key === "ewallet" && method.ewalletPhone && (
              <NumberBox
                label="Nomor Tujuan Transfer"
                number={formatPhone(method.ewalletPhone)}
                dark={dark}
              />
            )}

            {/* QRIS */}
            {method.key === "qris" && method.qrUrl && (
              <div className="flex flex-col items-center gap-3 mb-5">
                <p className="text-xs font-semibold self-start" style={{ color: "var(--text2)" }}>
                  Scan QR Code ini
                </p>
                <div className="p-3 rounded-2xl bg-white" style={{ boxShadow: "0 4px 24px rgba(0,0,0,.12)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={method.qrUrl} alt="QRIS QR Code" className="w-44 h-44" />
                </div>
                <p className="text-[10px] font-semibold text-center" style={{ color: "var(--text3)" }}>
                  QR ini berlaku hingga batas waktu pembayaran
                </p>
              </div>
            )}

            {/* Credit card */}
            {method.key === "credit_card" && (
              <div className="mb-5">
                <button
                  type="button"
                  onClick={() => alert("TODO: POST /api/payment/create → snap_token → window.snap.pay(token)")}
                  className="w-full py-cta flex items-center justify-center gap-2 py-4 rounded-2xl text-white text-sm font-black"
                  style={{
                    background: "linear-gradient(135deg,#6366f1,#7c3aed)",
                    boxShadow: "0 4px 20px rgba(99,102,241,.45)",
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Bayar dengan Kartu — Lanjut ke Midtrans
                </button>
                <p className="text-[10px] text-center mt-2 font-semibold" style={{ color: "var(--text3)" }}>
                  Anda akan diarahkan ke halaman pembayaran aman Midtrans
                </p>
              </div>
            )}

            {/* Instructions */}
            <div>
              <button
                type="button"
                onClick={() => setShowInstructions(p => !p)}
                className="flex items-center justify-between w-full text-left mb-3"
              >
                <p className="text-xs font-black uppercase tracking-widest"
                  style={{ color: dark ? "rgba(255,255,255,.4)" : "rgba(99,102,241,.7)" }}>
                  Cara Pembayaran
                </p>
                {showInstructions
                  ? <ChevronUp className="w-4 h-4" style={{ color: "var(--text3)" }} />
                  : <ChevronDown className="w-4 h-4" style={{ color: "var(--text3)" }} />
                }
              </button>
              {showInstructions && (
                <ol className="flex flex-col gap-2.5">
                  {method.instructions.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black text-white mt-0.5"
                        style={{ background: method.color }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-xs leading-relaxed" style={{ color: "var(--text2)" }}>{step}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          {/* Cek status (bukan credit_card) */}
          {method.key !== "credit_card" && (
            <button
              type="button"
              onClick={checkPayment}
              disabled={simLoading}
              className="py-cta flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-black text-white py-card"
              style={{
                animationDelay: "0.25s",
                background: simLoading ? "rgba(99,102,241,.5)" : "linear-gradient(135deg,#6366f1,#7c3aed)",
                boxShadow: simLoading ? "none" : "0 4px 20px rgba(99,102,241,.45)",
                cursor: simLoading ? "not-allowed" : "pointer",
              } as React.CSSProperties}
            >
              <RefreshCw className={`w-4 h-4 ${simLoading ? "animate-spin" : ""}`} />
              {simLoading ? "Mengkonfirmasi..." : "Konfirmasi Pembayaran"}
            </button>
          )}

        </div>

        {/* ── RIGHT ── */}
        <div className="flex flex-col gap-4">

          {/* Order summary */}
          <div style={{ ...card, animationDelay: "0.3s" } as React.CSSProperties} className="p-4 py-card">
            <p className="text-xs font-black uppercase tracking-widest mb-3"
              style={{ color: dark ? "rgba(255,255,255,.4)" : "rgba(99,102,241,.7)" }}>
              Ringkasan Pesanan
            </p>
            <div className="flex flex-col gap-3 mb-4">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold" style={{ color: "var(--text)" }}>{item.name}</p>
                    <p className="text-[11px]" style={{ color: "var(--text3)" }}>× {item.quantity}</p>
                  </div>
                  <p className="text-xs font-black tabular-nums flex-shrink-0" style={{ color: "var(--text)" }}>
                    {formatRupiah(item.subtotal)}
                  </p>
                </div>
              ))}
            </div>
            <div className="pt-3 flex items-center justify-between"
              style={{ borderTop: `1px solid ${dark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)"}` }}>
              <span className="text-sm font-bold" style={{ color: "var(--text2)" }}>Total</span>
              <span className="text-base font-black" style={{ color: "#6366f1" }}>{formatRupiah(order.total)}</span>
            </div>
          </div>

          {/* Security */}
          <div style={{ ...card, animationDelay: "0.35s" } as React.CSSProperties} className="p-4 py-card">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-black" style={{ color: "var(--text)" }}>Transaksi Aman</span>
            </div>
            {[
              "Diproses oleh Midtrans (PCI DSS compliant)",
              "Data kartu terenkripsi & tidak disimpan",
              "Pembayaran dijamin terlindungi",
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-[11px]" style={{ color: "var(--text2)" }}>{t}</span>
              </div>
            ))}
          </div>

          {/* Dev note */}
          <div className="px-4 py-3 rounded-2xl py-card" style={{
            animationDelay: "0.4s",
            background: dark ? "rgba(99,102,241,.08)" : "rgba(99,102,241,.06)",
            border: `1px solid ${dark ? "rgba(99,102,241,.25)" : "rgba(99,102,241,.20)"}`,
          } as React.CSSProperties}>
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#818cf8" }}>
                Info Pembayaran
              </span>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: "var(--text3)" }}>
              Setelah melakukan transfer, klik{" "}
              <strong style={{ color: "#a5b4fc" }}>Konfirmasi Pembayaran</strong> di bawah
              agar pesanan Anda segera diproses.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ─── Page export ─── */
export default function PaymentPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar />
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin" style={{ color: "#6366f1" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--text2)" }}>Memuat halaman pembayaran...</p>
          </div>
        </div>
      }>
        <PaymentInner />
      </Suspense>
      <Footer />
    </div>
  );
}
