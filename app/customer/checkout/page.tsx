"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ArrowLeft, CreditCard, Banknote, Wallet, Smartphone, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/lib/CartContext";
import { formatRupiah } from "@/lib/utils";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";

/* ─── Metode pembayaran — key HARUS SAMA dengan payment/page.tsx ─── */
const payMethods = [
  { value: "bank_transfer", label: "Bank Transfer", icon: Banknote, sub: "BCA Virtual Account" },
  { value: "ewallet",       label: "E-Wallet",      icon: Wallet,    sub: "GoPay / OVO / DANA" },
  { value: "qris",          label: "QRIS",           icon: Smartphone, sub: "Semua e-wallet" },
  { value: "credit_card",   label: "Kartu Kredit",   icon: CreditCard, sub: "Visa / Mastercard" },
];

/* ─── Field component di LUAR CheckoutPage ────────────────────────────────────
   Kalau diletakkan di dalam, React re-create tiap render → input kehilangan
   fokus → karakter masuk satu-satu. Solusi: letakkan di luar scope.
────────────────────────────────────────────────────────────────────────────── */
interface FieldProps {
  field: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  value: string;
  error?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function Field({ field, label, placeholder = "", type = "text", required = false, value, error, onChange }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        name={field}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all bg-gray-50 dark:bg-white/[0.04] text-gray-900 dark:text-gray-100 ${
          error
            ? "border-red-400 focus:ring-2 focus:ring-red-300/50"
            : "border-black/[0.08] dark:border-white/[0.08] focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
        }`}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const router = useRouter();
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderName, setOrderName] = useState("");
  const [savedPayMethod, setSavedPayMethod] = useState("bank_transfer");
  const [form, setForm] = useState({
    name: "", phone: "", address: "", city: "", notes: "",
    payment: "bank_transfer",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())    e.name    = "Wajib diisi";
    if (!form.phone.trim())   e.phone   = "Wajib diisi";
    if (!form.address.trim()) e.address = "Wajib diisi";
    if (!form.city.trim())    e.city    = "Wajib diisi";
    return e;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(er => { const n = { ...er }; delete n[name]; return n; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!items.length) return;
    setLoading(true);
    setOrderName(form.name);
    setSavedPayMethod(form.payment);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name:    form.name.trim(),
          customer_phone:   form.phone.trim(),
          customer_address: `${form.address.trim()}, ${form.city.trim()}`,
          notes:            form.notes.trim() || null,
          pay_method:       form.payment,
          source:           "online",
          items: items.map(i => ({
            product_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(i.product.id) ? i.product.id : null,
            name:       i.product.name,
            price:      i.product.price,
            quantity:   i.quantity,
            image_url:  i.product.image,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Gagal membuat order"); setLoading(false); return; }
      clearCart();
      router.push(`/customer/payment?orderId=${data.data.id}&method=${form.payment}`);
    } catch { alert("Terjadi kesalahan. Coba lagi."); setLoading(false); }
  };

  /* ── Success state ── */
  if (success) return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 text-center py-16 co-fade">
        <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/30 co-bounce">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <div className="co-up" style={{ animationDelay: "0.15s" }}>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2" style={{ fontFamily: "Syne, sans-serif" }}>Pesanan Berhasil! 🎉</h1>
          <p className="text-sm text-gray-400 max-w-sm">Terima kasih, <span className="font-bold text-gray-700 dark:text-gray-300">{orderName}</span>! Pesananmu sedang diproses.</p>
        </div>
        <div className="bg-white dark:bg-[var(--surface)] rounded-2xl p-5 border border-black/[0.06] dark:border-white/[0.06] w-full max-w-xs space-y-3 co-up" style={{ animationDelay: "0.25s" }}>
          <div className="flex justify-between text-sm"><span className="text-gray-400">Order ID</span><span className="font-mono font-bold text-gray-900 dark:text-white">#ORD{Date.now().toString().slice(-6)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-400">Pembayaran</span><span className="font-semibold capitalize text-gray-700 dark:text-gray-300">{payMethods.find(m => m.value === savedPayMethod)?.label}</span></div>
          <div className="flex justify-between font-black border-t border-black/[0.06] dark:border-white/[0.06] pt-3" style={{ fontFamily: "Syne, sans-serif" }}>
            <span className="text-gray-400 font-normal text-sm">Total</span>
            <span className="text-indigo-500">{formatRupiah(total)}</span>
          </div>
        </div>
        <Link href="/" className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white px-8 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/25 hover:scale-105 active:scale-95 co-up" style={{ animationDelay: "0.35s" }}>
          Lanjut Belanja
        </Link>
      </div>
      <Footer />
    </div>
  );

  if (items.length === 0) return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center gap-4 co-fade">
        <p className="text-gray-400">Tidak ada item untuk di-checkout.</p>
        <Link href="/" className="text-indigo-500 hover:underline text-sm font-medium">← Belanja Dulu</Link>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <style>{`
        @keyframes coFade  { from{opacity:0} to{opacity:1} }
        @keyframes coUp    { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes coBounce{
          0%{opacity:0;transform:scale(0.4)}
          55%{transform:scale(1.12)}
          75%{transform:scale(0.94)}
          100%{opacity:1;transform:scale(1)}
        }
        @keyframes coPulse {
          0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.4)}
          50%{box-shadow:0 0 0 8px rgba(99,102,241,0)}
        }
        .co-fade   { animation: coFade   0.4s ease both; }
        .co-up     { animation: coUp     0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .co-bounce { animation: coBounce 0.65s cubic-bezier(0.22,1,0.36,1) both; }
        .co-card   { animation: coUp     0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .pay-pill  { transition: all 0.2s cubic-bezier(0.22,1,0.36,1); }
        .pay-pill:hover { transform: translateY(-2px); }
        .pay-pill.is-active { transform: scale(1.04); }
        .submit-btn { transition: all 0.2s cubic-bezier(0.22,1,0.36,1); }
        .submit-btn:not(:disabled):hover { transform:translateY(-2px); box-shadow:0 12px 36px rgba(99,102,241,0.45)!important; }
        .submit-btn:not(:disabled):active { transform:scale(0.97); }
        .is-loading { animation: coPulse 1.5s infinite; }
      `}</style>

      <Navbar />
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 co-fade">
        <Link href="/customer/cart" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-500 mb-5 group transition-colors">
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />Kembali ke Keranjang
        </Link>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-6 co-up" style={{ fontFamily: "Syne, sans-serif" }}>Checkout</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-4">

              {/* ── 1. Info Pengiriman ── */}
              <div className="bg-white dark:bg-[var(--surface)] rounded-2xl p-5 border border-black/[0.06] dark:border-white/[0.06] co-card" style={{ animationDelay: "0.05s" }}>
                <h2 className="font-black text-sm text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-black flex items-center justify-center">1</span>
                  Info Pengiriman
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field field="name"    label="Nama Lengkap"     placeholder="Budi Santoso"     required value={form.name}    error={errors.name}    onChange={handleChange} />
                  <Field field="phone"   label="No. Telepon"      placeholder="08123456789"  type="tel" required value={form.phone}   error={errors.phone}   onChange={handleChange} />
                  <div className="sm:col-span-2">
                    <Field field="address" label="Alamat Lengkap" placeholder="Jl. Contoh No. 1, RT 01/RW 02" required value={form.address} error={errors.address} onChange={handleChange} />
                  </div>
                  <Field field="city"  label="Kota / Kabupaten" placeholder="Surabaya"  required value={form.city}  error={errors.city}  onChange={handleChange} />
                  <Field field="notes" label="Catatan (opsional)" placeholder="Taruh di depan pintu..." value={form.notes} onChange={handleChange} />
                </div>
              </div>

              {/* ── 2. Metode Pembayaran ── */}
              <div className="bg-white dark:bg-[var(--surface)] rounded-2xl p-5 border border-black/[0.06] dark:border-white/[0.06] co-card" style={{ animationDelay: "0.10s" }}>
                <h2 className="font-black text-sm text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-black flex items-center justify-center">2</span>
                  Metode Pembayaran
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                  {payMethods.map(({ value, label, sub, icon: Icon }) => {
                    const active = form.payment === value;
                    return (
                      <label
                        key={value}
                        className={`pay-pill flex items-center gap-3 px-4 py-3 rounded-2xl border-2 cursor-pointer ${
                          active
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 is-active"
                            : "border-black/[0.06] dark:border-white/[0.08] hover:border-indigo-300 dark:hover:border-white/[0.2]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          value={value}
                          checked={active}
                          onChange={() => setForm(f => ({ ...f, payment: value }))}
                          className="sr-only"
                        />
                        {/* Icon wrapper */}
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                          active ? "bg-indigo-100 dark:bg-indigo-500/20" : "bg-gray-100 dark:bg-white/[0.06]"
                        }`}>
                          <Icon className={`w-4 h-4 transition-colors ${active ? "text-indigo-500" : "text-gray-400"}`} />
                        </span>
                        {/* Label */}
                        <span className="flex-1 min-w-0">
                          <span className={`block text-sm font-bold leading-tight transition-colors ${active ? "text-indigo-700 dark:text-indigo-300" : "text-gray-700 dark:text-gray-300"}`}>{label}</span>
                          <span className="block text-[11px] text-gray-400 mt-0.5">{sub}</span>
                        </span>
                        {/* Radio indicator */}
                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          active ? "border-indigo-500" : "border-gray-300 dark:border-white/20"
                        }`}>
                          {active && <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ── Submit ── */}
              <button
                type="submit"
                disabled={loading}
                className={`submit-btn w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 disabled:opacity-70 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 co-card ${loading ? "is-loading" : ""}`}
                style={{ animationDelay: "0.15s" }}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Memproses pesanan...</>
                ) : (
                  <>Buat Pesanan — {formatRupiah(total)}</>
                )}
              </button>
            </div>

            {/* ── Order Summary ── */}
            <div className="co-card" style={{ animationDelay: "0.20s" }}>
              <div className="bg-white dark:bg-[var(--surface)] rounded-2xl p-5 border border-black/[0.06] dark:border-white/[0.06] sticky top-20">
                <h2 className="font-black text-sm text-gray-900 dark:text-white mb-4">Pesanan ({items.length})</h2>
                <div className="space-y-3 max-h-52 overflow-y-auto">
                  {items.map((item, i) => (
                    <div key={item.product.id} className="flex gap-3 co-up" style={{ animationDelay: `${0.05 + i * 0.05}s` }}>
                      <img src={item.product.image} alt={item.product.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">{item.product.name}</p>
                        <p className="text-[11px] text-gray-400">×{item.quantity}</p>
                      </div>
                      <p className="text-xs font-black text-gray-900 dark:text-white flex-shrink-0">{formatRupiah(item.product.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-black/[0.06] dark:border-white/[0.06] mt-4 pt-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-400"><span>Subtotal</span><span>{formatRupiah(total)}</span></div>
                  <div className="flex justify-between text-xs text-gray-400"><span>Ongkir</span><span className="text-emerald-500 font-semibold">Gratis</span></div>
                  <div className="flex justify-between font-black text-base pt-2 border-t border-black/[0.06] dark:border-white/[0.06]" style={{ fontFamily: "Syne,sans-serif" }}>
                    <span className="text-gray-400 font-normal text-sm">Total</span>
                    <span className="text-indigo-500">{formatRupiah(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
