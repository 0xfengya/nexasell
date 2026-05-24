"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Zap, Lock, Mail, ArrowRight, CheckCircle2, Receipt, Clock, TrendingUp } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/lib/supabase/types";

export default function CashierLoginPage() {
  const router   = useRouter();
  const supabase = createClient();
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [form,    setForm]    = useState({ email: "", password: "" });
  const [err,     setErr]     = useState("");
  const [focused, setFocused] = useState<string | null>(null);

  const ACCENT = "#10b981";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(), password: form.password,
      });
      if (error) { setErr(error.message); setLoading(false); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single() as { data: Pick<ProfileRow, "role"> | null };
      if (!profile || !["cashier","admin"].includes(profile.role)) {
        await supabase.auth.signOut();
        setErr("Akun ini tidak memiliki akses kasir.");
        setLoading(false); return;
      }
      setDone(true);
      setTimeout(() => router.push("/cashier"), 1200);
    } catch { setErr("Terjadi kesalahan. Coba lagi."); setLoading(false); }
  };

  const features = [
    { icon: Receipt,   label: "Proses Transaksi",   desc: "Kelola penjualan dengan cepat" },
    { icon: TrendingUp,label: "Riwayat Shift",       desc: "Pantau performa harian" },
    { icon: Clock,     label: "Real-time Update",    desc: "Stok otomatis terupdate" },
  ];

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background:"var(--bg)", fontFamily:"Outfit,sans-serif" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.88)}to{opacity:1;transform:scale(1)}}
        @keyframes checkPop{0%{transform:scale(0) rotate(-15deg);opacity:0}60%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}
        @keyframes slideLeft{from{opacity:0;transform:translateX(-32px)}to{opacity:1;transform:translateX(0)}}
        @keyframes slideRight{from{opacity:0;transform:translateX(32px)}to{opacity:1;transform:translateX(0)}}
        .panel-l{animation:slideLeft 0.7s cubic-bezier(0.16,1,0.3,1) both}
        .panel-r{animation:slideRight 0.7s cubic-bezier(0.16,1,0.3,1) 0.08s both}
        .btn-main{transition:transform 0.15s ease,box-shadow 0.15s ease}
        .btn-main:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 32px rgba(16,185,129,0.5)!important}
        .f1{animation:fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both}
        .f2{animation:fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.07s both}
        .f3{animation:fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.13s both}
        .f4{animation:fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.18s both}
        .f5{animation:fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.22s both}
        .eye-btn{transition:color 0.2s}.eye-btn:hover{color:#10b981!important}
        .feat-card{transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1)}.feat-card:hover{transform:translateY(-3px)}
      `}</style>

      {/* LEFT */}
      <div className="hidden lg:flex flex-col w-[48%] relative overflow-hidden panel-l"
        style={{background:"linear-gradient(145deg,#030d09 0%,#051a0f 50%,#030a06 100%)"}}>
        <div className="absolute inset-0 pointer-events-none">
          <div style={{position:"absolute",top:"-10%",left:"-5%",width:480,height:480,borderRadius:"50%",
            background:"radial-gradient(circle,rgba(16,185,129,0.2) 0%,transparent 65%)",animation:"float 8s ease-in-out infinite"}}/>
          <div style={{position:"absolute",bottom:"-5%",right:"-5%",width:360,height:360,borderRadius:"50%",
            background:"radial-gradient(circle,rgba(5,150,105,0.15) 0%,transparent 65%)",animation:"float 11s ease-in-out infinite reverse"}}/>
          <div style={{position:"absolute",inset:0,opacity:0.03,
            backgroundImage:"linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
            backgroundSize:"48px 48px"}}/>
        </div>
        <div className="relative z-10 flex flex-col h-full p-12">
          <Link href="/" className="inline-flex items-center gap-3 w-fit">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{background:"linear-gradient(135deg,#10b981,#059669)",boxShadow:"0 4px 20px rgba(16,185,129,0.5)"}}>
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5}/>
            </div>
            <span className="font-black text-2xl text-white">Nexa<span style={{color:"#34d399"}}>Sell</span></span>
          </Link>
          <div className="mt-14 flex-1 flex flex-col justify-center">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5 w-fit text-[10px] font-bold tracking-widest uppercase"
              style={{background:"rgba(16,185,129,0.15)",border:"1px solid rgba(16,185,129,0.3)",color:"rgba(255,255,255,0.7)"}}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{animation:"float 2s ease-in-out infinite"}}/>
              Cashier Station
            </span>
            <h2 className="font-black text-4xl leading-tight text-white mb-4">
              Layani Pelanggan<br/>
              <span style={{color:"#34d399"}}>Dengan Cepat.</span>
            </h2>
            <p className="text-sm text-white/40 leading-relaxed max-w-sm mb-10">
              Panel kasir NexaSell — proses transaksi, pantau stok, dan kelola shift dengan antarmuka yang intuitif.
            </p>
            <div className="space-y-3">
              {features.map(({icon:Icon,label,desc})=>(
                <div key={label} className="feat-card flex items-center gap-4 p-4 rounded-2xl"
                  style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)"}}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{background:"rgba(16,185,129,0.15)",border:"1px solid rgba(16,185,129,0.2)"}}>
                    <Icon className="w-4 h-4" style={{color:"#34d399"}}/>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{label}</p>
                    <p className="text-xs text-white/40">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-white/18">© 2026 NexaSell · Cashier Station</p>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-12 panel-r">
        <div className="w-full max-w-md">
          <Link href="/" className="flex lg:hidden items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{background:"linear-gradient(135deg,#10b981,#059669)"}}>
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5}/>
            </div>
            <span className="font-black text-xl" style={{color:"var(--text)"}}>Nexa<span style={{color:"#10b981"}}>Sell</span></span>
          </Link>

          {done ? (
            <div className="text-center" style={{animation:"scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both"}}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{background:"rgba(16,185,129,0.1)",border:"2px solid rgba(16,185,129,0.3)"}}>
                <CheckCircle2 className="w-10 h-10" style={{color:"#10b981",animation:"checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both"}}/>
              </div>
              <p className="font-black text-xl mb-1" style={{color:"var(--text)"}}>Selamat datang!</p>
              <p className="text-sm" style={{color:"var(--text2)"}}>Mengalihkan ke kasir...</p>
            </div>
          ) : (<>
            <div className="mb-7 f1">
              <h1 className="font-black text-2xl sm:text-3xl mb-1.5" style={{color:"var(--text)"}}>Selamat Datang 👋</h1>
              <p className="text-sm" style={{color:"var(--text2)"}}>Masuk ke Cashier Station NexaSell</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="f2">
                <label className="block text-xs font-bold mb-2" style={{color:"var(--text2)"}}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{color:focused==="email"?ACCENT:"var(--text3)"}}/>
                  <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                    placeholder="kasir@email.com" required
                    className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-medium outline-none"
                    style={{background:"var(--surface2)",border:`1.5px solid ${focused==="email"?ACCENT:"var(--border)"}`,color:"var(--text)",
                      transition:"border-color 0.2s,box-shadow 0.2s",
                      boxShadow:focused==="email"?`0 0 0 3px rgba(16,185,129,0.12)`:"none"}}
                    onFocus={()=>setFocused("email")} onBlur={()=>setFocused(null)}/>
                </div>
              </div>
              <div className="f3">
                <label className="block text-xs font-bold mb-2" style={{color:"var(--text2)"}}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{color:focused==="pass"?ACCENT:"var(--text3)"}}/>
                  <input type={show?"text":"password"} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                    placeholder="Password" required
                    className="w-full pl-11 pr-12 py-3 rounded-2xl text-sm font-medium outline-none"
                    style={{background:"var(--surface2)",border:`1.5px solid ${focused==="pass"?ACCENT:"var(--border)"}`,color:"var(--text)",
                      transition:"border-color 0.2s,box-shadow 0.2s",
                      boxShadow:focused==="pass"?`0 0 0 3px rgba(16,185,129,0.12)`:"none"}}
                    onFocus={()=>setFocused("pass")} onBlur={()=>setFocused(null)}/>
                  <button type="button" onClick={()=>setShow(s=>!s)}
                    className="eye-btn absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg" style={{color:"var(--text3)"}}>
                    {show?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                  </button>
                </div>
              </div>
              {err&&(
                <div className="p-3.5 rounded-2xl text-xs"
                  style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444"}}>
                  ⚠ {err}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-main f4 w-full py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2"
                style={{background:`linear-gradient(135deg,${ACCENT},#059669)`,boxShadow:`0 4px 20px rgba(16,185,129,0.4)`,opacity:loading?0.85:1}}>
                {loading
                  ?<><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white" style={{animation:"spin 0.7s linear infinite"}}/>Memproses...</>
                  :<>Masuk ke Kasir <ArrowRight className="w-4 h-4"/></>
                }
              </button>
            </form>
            <div className="mt-6 text-center f5">
              <Link href="/admin/login" className="text-xs font-semibold transition-colors hover:text-indigo-500" style={{color:"var(--text3)"}}>
                Pergi ke Admin Panel →
              </Link>
            </div>
          </>)}
        </div>
      </div>
    </div>
  );
}
