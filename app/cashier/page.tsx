"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search, Trash2, Plus, Minus, CreditCard, Banknote,
  X, CheckCircle, ShoppingCart, RefreshCcw, Smartphone,
  Receipt, Loader2, Wifi, QrCode, AlertCircle,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface ApiProduct {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  category: string;
  image_url: string | null;
  description: string | null;
  stock: number;
  sold: number;
  rating: number;
  badge: string | null;
  is_active: boolean;
}

interface POSItem { product: ApiProduct; quantity: number; }
type PayStep = "idle" | "qr-waiting" | "processing" | "success" | "error";

const CATEGORIES = [
  { id: "all",         name: "All",          icon: "🛍️" },
  { id: "food",        name: "Food & Drink",  icon: "🍔" },
  { id: "electronics", name: "Electronics",   icon: "📱" },
  { id: "fashion",     name: "Fashion",       icon: "👕" },
  { id: "beauty",      name: "Beauty",        icon: "💄" },
  { id: "home",        name: "Home",          icon: "🏠" },
  { id: "sports",      name: "Sports",        icon: "⚽" },
];

export default function CashierPOS() {
  const [products, setProducts]               = useState<ApiProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cart, setCart]                       = useState<POSItem[]>([]);
  const [search, setSearch]                   = useState("");
  const [activeCat, setActiveCat]             = useState("all");
  const [cash, setCash]                       = useState("");
  const [payMethod, setPayMethod]             = useState<"cash" | "card" | "ewallet">("cash");
  const [payStep, setPayStep]                 = useState<PayStep>("idle");
  const [lastChange, setLastChange]           = useState(0);
  const [lastTotal, setLastTotal]             = useState(0);
  const [lastOrderNum, setLastOrderNum]       = useState("");
  const [cartOpen, setCartOpen]               = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [submitLoading, setSubmitLoading]     = useState(false);
  const [errorMsg, setErrorMsg]               = useState("");
  const [cashierId, setCashierId]             = useState<string | null>(null);

  // Ambil user session untuk cashier_id
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCashierId(data.user?.id ?? null);
    });
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res  = await fetch("/api/products?active=true&limit=100");
      const json = await res.json();
      if (res.ok) setProducts(json.data ?? []);
    } catch { /* silent */ } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const filtered = useMemo(() => {
    let list = products;
    if (activeCat !== "all") list = list.filter(p => p.category === activeCat);
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [products, search, activeCat]);

  const addToCart = (p: ApiProduct) => {
    if (p.stock <= 0) return;
    setCart(prev => {
      const ex = prev.find(i => i.product.id === p.id);
      if (ex) {
        if (ex.quantity >= p.stock) return prev;
        return prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product: p, quantity: 1 }];
    });
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(i => i.product.id !== id));
    else setCart(prev => prev.map(i =>
      i.product.id === id ? { ...i, quantity: Math.min(qty, i.product.stock) } : i
    ));
  };

  const total     = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cashNum   = parseFloat(cash.replace(/\D/g, "")) || 0;
  const change    = cashNum - total;
  const canPay    = cart.length > 0 && !submitLoading && (payMethod !== "cash" || cashNum >= total);

  const submitOrder = async (): Promise<boolean> => {
    setSubmitLoading(true);
    setErrorMsg("");
    try {
      const payMethodMap: Record<string, string> = { cash: "cash", card: "card", ewallet: "qris" };
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: "Walk-in Customer",
          items: cart.map(i => ({
            product_id: i.product.id,
            name:       i.product.name,
            price:      i.product.price,
            quantity:   i.quantity,
            image_url:  i.product.image_url,
          })),
          pay_method: payMethodMap[payMethod],
          source:     "pos",
          cashier_id: cashierId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal membuat order");
      setLastOrderNum(json.data?.order_number ?? "");
      // Update stok lokal agar grid langsung berubah
      setProducts(prev => prev.map(p => {
        const item = cart.find(i => i.product.id === p.id);
        if (!item) return p;
        return { ...p, stock: Math.max(0, p.stock - item.quantity), sold: p.sold + item.quantity };
      }));
      return true;
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
      return false;
    } finally {
      setSubmitLoading(false);
    }
  };

  const processingDuration: Record<string, number> = { cash: 800, card: 2500, ewallet: 1000 };

  const handlePay = () => {
    if (!canPay) return;
    setLastChange(change);
    setLastTotal(total);
    setCartOpen(false);
    setProcessingProgress(0);
    if (payMethod === "ewallet") setPayStep("qr-waiting");
    else setPayStep("processing");
  };

  const handleQrConfirm = () => { setProcessingProgress(0); setPayStep("processing"); };

  useEffect(() => {
    if (payStep !== "processing") return;
    const duration = processingDuration[payMethod] ?? 1500;
    const interval = 30;
    const steps    = duration / interval;
    let current    = 0;
    const timer = setInterval(async () => {
      current++;
      setProcessingProgress(Math.min((current / steps) * 100, 100));
      if (current >= steps) {
        clearInterval(timer);
        const ok = await submitOrder();
        setTimeout(() => setPayStep(ok ? "success" : "error"), 150);
      }
    }, interval);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payStep]);

  const handleReset = () => {
    setCart([]); setCash(""); setPayStep("idle"); setPayMethod("cash");
    setProcessingProgress(0); setErrorMsg(""); setLastOrderNum("");
  };

  const quickAmounts = [50000, 100000, 150000, 200000];
  const methodLabel: Record<string, string> = {
    cash: "Tunai", card: "Kartu Debit/Kredit", ewallet: "E-Wallet / QRIS",
  };

  const generateQrSvg = (amount: number) => {
    const seed = amount.toString(); const size = 21;
    const cells: boolean[][] = [];
    for (let r = 0; r < size; r++) {
      cells[r] = [];
      for (let c = 0; c < size; c++) {
        const inFinder = (r<7&&c<7)||(r<7&&c>=size-7)||(r>=size-7&&c<7);
        if (inFinder) {
          const tl = r<7&&c<7&&((r===0||r===6||c===0||c===6)||(r>=2&&r<=4&&c>=2&&c<=4));
          const tr = r<7&&c>=size-7&&((r===0||r===6||(c===size-7)||(c===size-1))||(r>=2&&r<=4&&c>=size-5&&c<=size-3));
          const bl = r>=size-7&&c<7&&((r===size-7||r===size-1||c===0||c===6)||(r>=size-5&&r<=size-3&&c>=2&&c<=4));
          cells[r][c] = tl||tr||bl;
        } else {
          const h = (r*31+c*17+parseInt(seed[((r+c)%seed.length)]||"5"))%7;
          cells[r][c] = h<3;
        }
      }
    }
    const cell=8,pad=8,tot=size*cell+pad*2;
    let rects="";
    for(let r=0;r<size;r++) for(let c=0;c<size;c++)
      if(cells[r][c]) rects+=`<rect x="${pad+c*cell}" y="${pad+r*cell}" width="${cell}" height="${cell}" rx="1"/>`;
    return { svg:rects, viewBox:`0 0 ${tot} ${tot}`, size:tot };
  };

  const ProcessingModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
      <div className="bg-[var(--surface)] rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl border border-[var(--border)]">
        <div className="relative w-24 h-24 mx-auto mb-5 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-500/30 animate-ping opacity-40"/>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/40">
            {payMethod==="card" ? <Wifi className="w-8 h-8 text-white"/> : <Loader2 className="w-8 h-8 text-white animate-spin"/>}
          </div>
        </div>
        <p className="text-lg font-black text-[var(--text)] mb-1">{payMethod==="card"?"Tap Kartu":payMethod==="ewallet"?"Memverifikasi...":"Memproses Tunai..."}</p>
        <p className="text-xs text-[var(--text2)] mb-5">{payMethod==="card"?"Dekatkan kartu ke mesin EDC...":payMethod==="ewallet"?"Mengkonfirmasi pembayaran e-wallet":"Mencetak struk pembayaran tunai..."}</p>
        <div className="bg-[var(--surface2)] rounded-2xl p-4 mb-5 border border-[var(--border)]">
          <p className="text-xs text-[var(--text2)] mb-1">Total Pembayaran</p>
          <p className="text-2xl font-black text-[var(--text)]">{formatRupiah(lastTotal)}</p>
        </div>
        <div className="w-full h-2 bg-[var(--surface2)] rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500"
            style={{width:`${processingProgress}%`,transition:"width 0.03s linear"}}/>
        </div>
        <p className="text-[10px] text-[var(--text2)] mt-2">Memproses pembayaran...</p>
      </div>
    </div>
  );

  const QrWaitingModal = () => {
    const qr = generateQrSvg(lastTotal);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
        <div className="bg-[var(--surface)] rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl border border-[var(--border)]">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <QrCode className="w-4 h-4 text-purple-500"/>
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-[var(--text)]">Scan QRIS</p>
              <p className="text-[10px] text-[var(--text2)]">GoPay • OVO • DANA • ShopeePay</p>
            </div>
          </div>
          <div className="relative mx-auto mb-4" style={{width:200,height:200}}>
            <div className="absolute inset-0 rounded-2xl border-2 border-purple-400 animate-pulse opacity-60"/>
            <div className="absolute inset-0 rounded-2xl overflow-hidden bg-white p-2 shadow-inner">
              <svg viewBox={qr.viewBox} xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}
                dangerouslySetInnerHTML={{__html:`<rect width="${qr.size}" height="${qr.size}" fill="white"/><g fill="#1a1a2e">${qr.svg}</g>`}}/>
            </div>
            <div className="absolute top-1 left-1 w-5 h-5 border-t-2 border-l-2 border-purple-500 rounded-tl-lg"/>
            <div className="absolute top-1 right-1 w-5 h-5 border-t-2 border-r-2 border-purple-500 rounded-tr-lg"/>
            <div className="absolute bottom-1 left-1 w-5 h-5 border-b-2 border-l-2 border-purple-500 rounded-bl-lg"/>
            <div className="absolute bottom-1 right-1 w-5 h-5 border-b-2 border-r-2 border-purple-500 rounded-br-lg"/>
          </div>
          <div className="bg-purple-50 dark:bg-purple-500/10 rounded-2xl p-3 mb-4 border border-purple-200 dark:border-purple-500/20">
            <p className="text-[10px] text-purple-500 dark:text-purple-400 mb-0.5">Total yang harus dibayar</p>
            <p className="text-xl font-black text-purple-700 dark:text-purple-300">{formatRupiah(lastTotal)}</p>
          </div>
          <p className="text-[11px] text-[var(--text2)] mb-4">Arahkan kamera ke QR di atas menggunakan aplikasi e-wallet</p>
          <button onClick={handleQrConfirm}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-purple-500/30">
            <CheckCircle className="w-4 h-4"/>Pembayaran Diterima
          </button>
          <p className="text-[9px] text-[var(--text2)] mt-2">Tekan setelah customer berhasil scan &amp; bayar</p>
        </div>
      </div>
    );
  };

  const CartPanel = () => (
    <div className="flex flex-col h-full bg-[var(--surface)]">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-emerald-500"/>
          </div>
          <div>
            <p className="font-black text-sm text-[var(--text)]">Order</p>
            <p className="text-[10px] text-[var(--text2)]">{itemCount} item</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cart.length>0 && (
            <button onClick={()=>setCart([])} className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600 font-bold px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
              <X className="w-3 h-3"/>Hapus
            </button>
          )}
          <button onClick={()=>setCartOpen(false)} className="lg:hidden w-7 h-7 flex items-center justify-center rounded-xl hover:bg-[var(--surface2)] text-[var(--text2)]">
            <X className="w-4 h-4"/>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {cart.length===0 && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--text2)] pb-10">
            <div className="w-16 h-16 rounded-2xl bg-[var(--surface2)] flex items-center justify-center">
              <ShoppingCart className="w-7 h-7 opacity-30"/>
            </div>
            <p className="text-sm font-semibold">Belum ada item</p>
            <p className="text-xs opacity-60">Tap produk untuk menambahkan</p>
          </div>
        )}
        {cart.map(item=>(
          <div key={item.product.id} className="flex items-center gap-3 bg-[var(--surface2)] rounded-2xl p-3 border border-[var(--border)]">
            {item.product.image_url
              ? <img src={item.product.image_url} alt={item.product.name} className="w-11 h-11 object-cover rounded-xl flex-shrink-0"/>
              : <div className="w-11 h-11 rounded-xl flex-shrink-0 bg-gray-200 dark:bg-gray-700"/>
            }
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[var(--text)] line-clamp-1">{item.product.name}</p>
              <p className="text-[11px] font-black text-emerald-500">{formatRupiah(item.product.price)}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={()=>updateQty(item.product.id,item.quantity-1)}
                className="w-6 h-6 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-all active:scale-90">
                <Minus className="w-2.5 h-2.5"/>
              </button>
              <span className="w-5 text-center text-xs font-black text-[var(--text)]">{item.quantity}</span>
              <button onClick={()=>updateQty(item.product.id,item.quantity+1)} disabled={item.quantity>=item.product.stock}
                className="w-6 h-6 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center hover:border-emerald-300 hover:text-emerald-500 transition-all active:scale-90 disabled:opacity-30">
                <Plus className="w-2.5 h-2.5"/>
              </button>
              <button onClick={()=>updateQty(item.product.id,0)}
                className="w-6 h-6 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-[var(--text2)] hover:text-red-500 flex items-center justify-center transition-all">
                <Trash2 className="w-3 h-3"/>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--border)] p-4 space-y-4 flex-shrink-0 bg-[var(--surface2)]">
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0"/>{errorMsg}
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-[var(--text2)]">Subtotal ({itemCount} item)</span>
          <span className="text-lg font-black text-[var(--text)]">{formatRupiah(total)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([["cash","Tunai",Banknote],["card","Kartu",CreditCard],["ewallet","E-Pay",Smartphone]] as const).map(([val,label,Icon])=>(
            <button key={val} onClick={()=>setPayMethod(val)}
              className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold border-2 transition-all ${
                payMethod===val
                  ? val==="cash"    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : val==="card"    ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                    : "border-purple-500 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400"
                  : "border-[var(--border)] text-[var(--text2)] hover:border-[var(--text2)]"
              }`}>
              <Icon className="w-4 h-4"/>{label}
            </button>
          ))}
        </div>

        {payMethod==="cash" && (
          <div className="space-y-2">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text2)]">Rp</span>
              <input type="number" value={cash} onChange={e=>setCash(e.target.value)} placeholder="0"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-black text-[var(--text)] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"/>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {quickAmounts.map(amt=>(
                <button key={amt} onClick={()=>setCash(String(amt))}
                  className="py-2 text-[10px] font-black bg-[var(--surface)] border border-[var(--border)] hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-all text-[var(--text2)]">
                  {amt>=1000?`${amt/1000}K`:amt}
                </button>
              ))}
            </div>
            {cashNum>0&&total>0&&(
              <div className={`flex justify-between items-center p-3 rounded-xl font-bold text-sm ${
                change>=0
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                  : "bg-red-50 dark:bg-red-500/10 text-red-600 border border-red-200 dark:border-red-500/20"
              }`}>
                <span className="text-xs font-semibold">{change>=0?"💰 Kembalian":"⚠ Kurang"}</span>
                <span className="font-black">{formatRupiah(Math.abs(change))}</span>
              </div>
            )}
          </div>
        )}

        {payMethod==="card" && (
          <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20 space-y-1">
            <p className="text-xs text-blue-700 dark:text-blue-400 font-bold flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5"/>Pembayaran Kartu</p>
            <p className="text-[11px] text-blue-600 dark:text-blue-300">Tap, gesek, atau insert kartu ke mesin EDC</p>
            <div className="flex justify-between items-center pt-1 border-t border-blue-200 dark:border-blue-500/20 mt-1">
              <span className="text-[10px] text-blue-500 dark:text-blue-400">Total ditagih</span>
              <span className="text-sm font-black text-blue-700 dark:text-blue-300">{formatRupiah(total)}</span>
            </div>
          </div>
        )}

        {payMethod==="ewallet" && (
          <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl border border-purple-200 dark:border-purple-500/20 space-y-1">
            <p className="text-xs text-purple-700 dark:text-purple-400 font-bold flex items-center gap-1.5"><QrCode className="w-3.5 h-3.5"/>QRIS / E-Wallet</p>
            <p className="text-[11px] text-purple-600 dark:text-purple-300">GoPay, OVO, DANA, ShopeePay, LinkAja</p>
            <div className="flex justify-between items-center pt-1 border-t border-purple-200 dark:border-purple-500/20 mt-1">
              <span className="text-[10px] text-purple-500 dark:text-purple-400">Total ditagih</span>
              <span className="text-sm font-black text-purple-700 dark:text-purple-300">{formatRupiah(total)}</span>
            </div>
          </div>
        )}

        <button onClick={handlePay} disabled={!canPay}
          className={`w-full py-4 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 ${
            payMethod==="card"    ? "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-blue-500/30"
            : payMethod==="ewallet" ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-purple-500/30"
            :                         "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/30"
          }`}>
          {submitLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Receipt className="w-4 h-4"/>}
          {cart.length===0?"Pilih Produk Dulu":payMethod==="card"?`Proses Kartu ${formatRupiah(total)}`:payMethod==="ewallet"?`Buat QR ${formatRupiah(total)}`:`Bayar ${formatRupiah(total)}`}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex overflow-hidden bg-[var(--bg)]" style={{height:"calc(100svh - 0px)"}}>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 space-y-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="hidden lg:block">
              <p className="font-black text-base text-[var(--text)]">POS Terminal</p>
              <p className="text-[11px] text-[var(--text2)]">{new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long"})}</p>
            </div>
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text2)]"/>
              <input type="text" placeholder="Cari produk..." value={search} onChange={e=>setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface2)] text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-[var(--text)] transition-all"/>
            </div>
            <button onClick={fetchProducts} title="Refresh produk"
              className="w-10 h-10 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text2)] hover:bg-[var(--surface2)] transition-all flex-shrink-0">
              <RefreshCcw className={`w-4 h-4 ${loadingProducts?"animate-spin":""}`}/>
            </button>
            <button onClick={()=>setCartOpen(true)} className="lg:hidden relative w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 flex-shrink-0 active:scale-95">
              <ShoppingCart className="w-4 h-4"/>
              {itemCount>0&&(
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">{itemCount}</span>
              )}
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5" style={{scrollbarWidth:"none"}}>
            {CATEGORIES.map(cat=>(
              <button key={cat.id} onClick={()=>setActiveCat(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap flex-shrink-0 transition-all ${
                  activeCat===cat.id
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                    : "bg-[var(--surface2)] text-[var(--text2)] border border-[var(--border)] hover:border-emerald-300 dark:hover:border-emerald-600"
                }`}>
                {cat.icon}<span className="hidden sm:inline">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loadingProducts ? (
            <div className="h-48 flex items-center justify-center gap-2 text-[var(--text2)]">
              <Loader2 className="w-5 h-5 animate-spin"/><span className="text-sm">Memuat produk...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {filtered.map(p=>{
                const inCart = cart.find(i=>i.product.id===p.id);
                const outOfStock = p.stock<=0;
                return (
                  <button key={p.id} onClick={()=>addToCart(p)} disabled={outOfStock}
                    className={`relative text-left bg-[var(--surface)] rounded-2xl border-2 transition-all hover:shadow-lg active:scale-95 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed ${
                      inCart ? "border-emerald-500 shadow-md shadow-emerald-500/20" : "border-transparent shadow-sm hover:border-[var(--text2)]/20"
                    }`}>
                    <div className="aspect-square overflow-hidden bg-[var(--surface2)] relative">
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"/>
                        : <div className="w-full h-full bg-gray-200 dark:bg-gray-700"/>
                      }
                      {p.badge&&(
                        <span className={`absolute top-2 left-2 text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                          p.badge==="Sale"?"bg-red-500 text-white":p.badge==="Best Seller"?"bg-amber-500 text-white":"bg-indigo-500 text-white"
                        }`}>{p.badge}</span>
                      )}
                      {outOfStock&&(
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-[10px] font-black text-white bg-black/60 px-2 py-1 rounded-full">Habis</span>
                        </div>
                      )}
                      {inCart&&!outOfStock&&(
                        <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white text-sm font-black flex items-center justify-center shadow-lg">{inCart.quantity}</div>
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-[11px] font-bold text-[var(--text)] line-clamp-1 mb-0.5">{p.name}</p>
                      <p className="text-xs font-black text-emerald-500">{formatRupiah(p.price)}</p>
                      <p className={`text-[9px] mt-0.5 ${p.stock<=5&&p.stock>0?"text-amber-500":"text-[var(--text2)]"}`}>Stok: {p.stock}</p>
                    </div>
                  </button>
                );
              })}
              {filtered.length===0&&(
                <div className="col-span-full h-48 flex flex-col items-center justify-center gap-2 text-[var(--text2)]">
                  <Search className="w-10 h-10 opacity-20"/><p className="text-sm">Produk tidak ditemukan</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="hidden lg:flex flex-col w-72 xl:w-80 border-l border-[var(--border)] flex-shrink-0 overflow-hidden">
        <CartPanel/>
      </div>

      {cartOpen&&(
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>setCartOpen(false)}/>
          <div className="relative ml-auto w-80 max-w-[90vw] h-full shadow-2xl overflow-hidden"><CartPanel/></div>
        </div>
      )}

      {payStep==="qr-waiting"&&<QrWaitingModal/>}
      {payStep==="processing"&&<ProcessingModal/>}

      {payStep==="error"&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="bg-[var(--surface)] rounded-3xl p-7 max-w-xs w-full text-center shadow-2xl border border-[var(--border)]">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 bg-red-100 dark:bg-red-500/20">
              <AlertCircle className="w-10 h-10 text-red-500"/>
            </div>
            <p className="text-lg font-black text-[var(--text)] mb-1">Transaksi Gagal</p>
            <p className="text-xs text-[var(--text2)] mb-5">{errorMsg||"Terjadi kesalahan, coba lagi."}</p>
            <button onClick={handleReset} className="w-full py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-sm transition-all active:scale-95">Coba Lagi</button>
          </div>
        </div>
      )}

      {payStep==="success"&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="bg-[var(--surface)] rounded-3xl p-7 max-w-xs w-full text-center shadow-2xl border border-[var(--border)]">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl ${
              payMethod==="card"?"bg-gradient-to-br from-blue-400 to-indigo-500 shadow-blue-500/30"
              :payMethod==="ewallet"?"bg-gradient-to-br from-purple-400 to-pink-500 shadow-purple-500/30"
              :"bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/30"
            }`}>
              <CheckCircle className="w-10 h-10 text-white"/>
            </div>
            <p className="text-xl font-black text-[var(--text)] mb-1">Pembayaran Berhasil!</p>
            {lastOrderNum&&<p className="text-[10px] text-[var(--text2)] mb-3 font-mono">{lastOrderNum}</p>}
            <div className="bg-[var(--surface2)] rounded-2xl p-4 mb-5 space-y-2.5 border border-[var(--border)] text-left">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text2)]">Total</span>
                <span className="font-black text-[var(--text)]">{formatRupiah(lastTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text2)]">Metode</span>
                <span className="font-bold text-[var(--text)]">{methodLabel[payMethod]}</span>
              </div>
              {payMethod==="cash"&&(
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text2)]">Dibayar</span>
                    <span className="font-bold text-[var(--text)]">{formatRupiah(lastChange+lastTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-[var(--border)] pt-2.5">
                    <span className="text-[var(--text2)]">Kembalian</span>
                    <span className="font-black text-emerald-500">{formatRupiah(lastChange)}</span>
                  </div>
                </>
              )}
            </div>
            <button onClick={handleReset}
              className={`w-full py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                payMethod==="card"?"bg-gradient-to-r from-blue-500 to-indigo-500"
                :payMethod==="ewallet"?"bg-gradient-to-r from-purple-500 to-pink-500"
                :"bg-gradient-to-r from-emerald-500 to-teal-500"
              }`}>
              <RefreshCcw className="w-4 h-4"/>Transaksi Baru
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
