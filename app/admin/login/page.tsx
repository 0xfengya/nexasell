"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Zap, Lock, Mail, ArrowRight, BarChart2, Package, TrendingUp, Users, CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router   = useRouter();
  const supabase = createClient();
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [tab,     setTab]     = useState<"login" | "register">("login");
  const [form,    setForm]    = useState({ name: "", email: "", password: "", confirm: "" });
  const [err,     setErr]     = useState("");
  const [focused, setFocused] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (tab === "register") {
      if (form.password !== form.confirm) { setErr("Password tidak cocok"); return; }
      if (form.password.length < 8)       { setErr("Password minimal 8 karakter"); return; }
    }
    setLoading(true);
    try {
      if (tab === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) { setErr(error.message); setLoading(false); return; }
        // Cek role via server-side API (bypass RLS pakai service role)
        const res = await fetch("/api/admin/profile");
        if (!res.ok) {
          await supabase.auth.signOut();
          setErr("Akun ini bukan admin. Gunakan Cashier Login.");
          setLoading(false); return;
        }
        setDone(true);
        setTimeout(() => router.push("/admin"), 1200);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(), password: form.password,
          options: { data: { full_name: form.name.trim() } },
        });
        if (error) { setErr(error.message); setLoading(false); return; }
        if (data.user) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from("profiles").upsert({ id: data.user.id, role: "admin", full_name: form.name.trim() || null });
        }
        setDone(true);
        setTimeout(() => router.push("/admin"), 1200);
      }
    } catch { setErr("Terjadi kesalahan. Coba lagi."); setLoading(false); }
  };

  const stats = [
    { icon: BarChart2,  label: "Revenue",  value: "Rp 141M", color: "#818cf8" },
    { icon: Package,    label: "Produk",    value: "16+",     color: "#34d399" },
    { icon: TrendingUp, label: "Transaksi", value: "1.6K",    color: "#f472b6" },
    { icon: Users,      label: "Pelanggan", value: "1.2K",    color: "#fbbf24" },
  ];

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: "var(--bg)", fontFamily: "Outfit, sans-serif" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.88)}to{opacity:1;transform:scale(1)}}
        @keyframes checkPop{0%{transform:scale(0) rotate(-15deg);opacity:0}60%{transform:scale(1.2)}100%{transform:scale(1) rotate(0);opacity:1}}
        @keyframes shimmer{from{background-position:-200% center}to{background-position:200% center}}
        @keyframes slideLeft{from{opacity:0;transform:translateX(-32px)}to{opacity:1;transform:translateX(0)}}
        @keyframes slideRight{from{opacity:0;transform:translateX(32px)}to{opacity:1;transform:translateX(0)}}
        .stat-card{transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1)}.stat-card:hover{transform:translateY(-4px) scale(1.02)}
        .btn-primary{transition:transform 0.15s ease,box-shadow 0.15s ease}
        .btn-primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 32px rgba(99,102,241,0.55)!important}
        .tab-btn{transition:all 0.25s cubic-bezier(0.4,0,0.2,1)}
        .panel-l{animation:slideLeft 0.7s cubic-bezier(0.16,1,0.3,1) both}
        .panel-r{animation:slideRight 0.7s cubic-bezier(0.16,1,0.3,1) 0.08s both}
        .f1{animation:fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both}
        .f2{animation:fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.07s both}
        .f3{animation:fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.13s both}
        .f4{animation:fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.18s both}
        .f5{animation:fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.22s both}
        .f6{animation:fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.27s both}
        .eye-btn{transition:color 0.2s}.eye-btn:hover{color:#6366f1!important}
        .link-go{transition:color 0.2s}.link-go:hover{color:#34d399!important}
      `}</style>

      {/* LEFT */}
      <div className="hidden lg:flex flex-col w-[52%] relative overflow-hidden panel-l"
        style={{ background:"linear-gradient(145deg,#06040f 0%,#0d0826 45%,#060e1c 100%)" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div style={{position:"absolute",top:"-15%",left:"-8%",width:520,height:520,borderRadius:"50%",
            background:"radial-gradient(circle,rgba(99,102,241,0.25) 0%,transparent 65%)",animation:"float 8s ease-in-out infinite"}}/>
          <div style={{position:"absolute",bottom:"-10%",right:"-5%",width:400,height:400,borderRadius:"50%",
            background:"radial-gradient(circle,rgba(139,92,246,0.2) 0%,transparent 65%)",animation:"float 10s ease-in-out infinite reverse"}}/>
          <div style={{position:"absolute",inset:0,opacity:0.035,
            backgroundImage:"linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
            backgroundSize:"56px 56px"}}/>
        </div>
        <div className="relative z-10 flex flex-col h-full p-14">
          <Link href="/" className="inline-flex items-center gap-3 w-fit">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",boxShadow:"0 4px 24px rgba(99,102,241,0.6)"}}>
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5}/>
            </div>
            <span className="font-black text-2xl text-white tracking-tight">Nexa<span style={{color:"#818cf8"}}>Sell</span></span>
          </Link>
          <div className="mt-14 flex-1 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-6 w-fit"
              style={{background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.3)"}}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{animation:"pulse 2s ease-in-out infinite"}}/>
              <ShieldCheck className="w-3 h-3" style={{color:"rgba(255,255,255,0.6)"}}/>
              <span className="text-[10px] font-bold tracking-widest uppercase" style={{color:"rgba(255,255,255,0.7)"}}>Admin Portal</span>
            </div>
            <h2 className="font-black leading-tight mb-4" style={{fontSize:"clamp(28px,3.5vw,42px)",color:"#fff"}}>
              Kelola Bisnis<br/>
              <span style={{background:"linear-gradient(90deg,#a5b4fc,#c084fc,#818cf8)",backgroundSize:"200%",
                WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 4s linear infinite"}}>
                Lebih Efisien.
              </span>
            </h2>
            <p className="text-sm leading-relaxed max-w-xs mb-10" style={{color:"rgba(255,255,255,0.4)"}}>
              Dashboard lengkap untuk memantau penjualan, mengelola produk, dan menganalisis performa toko.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {stats.map(({icon:Icon,label,value,color})=>(
                <div key={label} className="stat-card p-4 rounded-2xl"
                  style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)"}}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                    style={{background:`${color}18`,border:`1px solid ${color}28`}}>
                    <Icon className="w-4 h-4" style={{color}}/>
                  </div>
                  <p className="font-black text-xl text-white leading-none">{value}</p>
                  <p className="text-[10px] mt-1 font-semibold" style={{color:"rgba(255,255,255,0.35)"}}>{label}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px]" style={{color:"rgba(255,255,255,0.18)"}}>© 2026 NexaSell · Admin Portal v1.0</p>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-12 panel-r">
        <div className="w-full max-w-md">
          <Link href="/" className="flex lg:hidden items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5}/>
            </div>
            <span className="font-black text-xl" style={{color:"var(--text)"}}>Nexa<span style={{color:"#6366f1"}}>Sell</span></span>
          </Link>

          {done ? (
            <div className="text-center" style={{animation:"scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both"}}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{background:"rgba(16,185,129,0.1)",border:"2px solid rgba(16,185,129,0.3)"}}>
                <CheckCircle2 className="w-10 h-10" style={{color:"#10b981"}}/>
              </div>
              <p className="font-black text-xl mb-1" style={{color:"var(--text)"}}>Berhasil masuk!</p>
              <p className="text-sm" style={{color:"var(--text2)"}}>Mengalihkan ke dashboard...</p>
            </div>
          ) : (<>
            <div className="mb-7 f1">
              <h1 className="font-black text-2xl sm:text-3xl mb-1.5" style={{color:"var(--text)"}}>
                {tab==="login"?"Selamat Datang 👋":"Buat Akun Baru"}
              </h1>
              <p className="text-sm" style={{color:"var(--text2)"}}>
                {tab==="login"?"Masuk ke Admin Panel NexaSell":"Daftar sebagai Admin baru"}
              </p>
            </div>
            <div className="flex p-1 rounded-2xl mb-6 f2" style={{background:"var(--surface2)",border:"1px solid var(--border)"}}>
              {(["login","register"] as const).map(t=>(
                <button key={t} onClick={()=>{setTab(t);setErr("");}} className="tab-btn flex-1 py-2.5 rounded-xl text-sm font-bold"
                  style={tab===t?{background:"linear-gradient(135deg,#6366f1,#7c3aed)",color:"#fff",boxShadow:"0 2px 12px rgba(99,102,241,0.4)"}
                    :{color:"var(--text2)",background:"transparent"}}>
                  {t==="login"?"Masuk":"Daftar"}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {tab==="register"&&(
                <div className="f3">
                  <label className="block text-xs font-bold mb-2" style={{color:"var(--text2)"}}>Nama Lengkap</label>
                  <input type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                    placeholder="John Doe" required
                    className="w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none"
                    style={{background:"var(--surface2)",border:`1.5px solid ${focused==="name"?"#6366f1":"var(--border)"}`,color:"var(--text)",
                      transition:"border-color 0.2s,box-shadow 0.2s",boxShadow:focused==="name"?"0 0 0 3px rgba(99,102,241,0.12)":"none"}}
                    onFocus={()=>setFocused("name")} onBlur={()=>setFocused(null)}/>
                </div>
              )}
              <div className="f3">
                <label className="block text-xs font-bold mb-2" style={{color:"var(--text2)"}}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{color:focused==="email"?"#6366f1":"var(--text3)"}}/>
                  <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                    placeholder="admin@email.com" required
                    className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-medium outline-none"
                    style={{background:"var(--surface2)",border:`1.5px solid ${focused==="email"?"#6366f1":"var(--border)"}`,color:"var(--text)",
                      transition:"border-color 0.2s,box-shadow 0.2s",boxShadow:focused==="email"?"0 0 0 3px rgba(99,102,241,0.12)":"none"}}
                    onFocus={()=>setFocused("email")} onBlur={()=>setFocused(null)}/>
                </div>
              </div>
              <div className="f4">
                <label className="block text-xs font-bold mb-2" style={{color:"var(--text2)"}}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{color:focused==="pass"?"#6366f1":"var(--text3)"}}/>
                  <input type={show?"text":"password"} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                    placeholder="Minimal 8 karakter" required
                    className="w-full pl-11 pr-12 py-3 rounded-2xl text-sm font-medium outline-none"
                    style={{background:"var(--surface2)",border:`1.5px solid ${focused==="pass"?"#6366f1":"var(--border)"}`,color:"var(--text)",
                      transition:"border-color 0.2s,box-shadow 0.2s",boxShadow:focused==="pass"?"0 0 0 3px rgba(99,102,241,0.12)":"none"}}
                    onFocus={()=>setFocused("pass")} onBlur={()=>setFocused(null)}/>
                  <button type="button" onClick={()=>setShow(s=>!s)}
                    className="eye-btn absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg" style={{color:"var(--text3)"}}>
                    {show?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                  </button>
                </div>
              </div>
              {tab==="register"&&(
                <div className="f4">
                  <label className="block text-xs font-bold mb-2" style={{color:"var(--text2)"}}>Konfirmasi Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{color:"var(--text3)"}}/>
                    <input type={show?"text":"password"} value={form.confirm} onChange={e=>setForm(f=>({...f,confirm:e.target.value}))}
                      placeholder="Ulangi password" required
                      className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-medium outline-none"
                      style={{background:"var(--surface2)",border:`1.5px solid ${err?"#ef4444":"var(--border)"}`,color:"var(--text)",transition:"border-color 0.2s"}}
                      onFocus={()=>setFocused("conf")} onBlur={()=>setFocused(null)}/>
                  </div>
                </div>
              )}
              {err&&(
                <div className="p-3.5 rounded-2xl text-xs" style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444"}}>
                  ⚠ {err}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary f5 w-full py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2"
                style={{background:"linear-gradient(135deg,#6366f1,#7c3aed)",boxShadow:"0 4px 20px rgba(99,102,241,0.4)",opacity:loading?0.85:1}}>
                {loading
                  ?<><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white" style={{animation:"spin 0.7s linear infinite"}}/>Memproses...</>
                  :<>{tab==="login"?"Masuk ke Admin Panel":"Buat Akun"}<ArrowRight className="w-4 h-4"/></>
                }
              </button>
            </form>
            <div className="mt-6 text-center f6">
              <Link href="/cashier/login" className="link-go text-xs font-semibold" style={{color:"#10b981"}}>
                Pergi ke Cashier Station →
              </Link>
            </div>
          </>)}
        </div>
      </div>
    </div>
  );
}
