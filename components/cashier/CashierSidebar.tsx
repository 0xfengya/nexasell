"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingBag, History, X, Menu, Zap, Settings, User, KeyRound, LogOut, ChevronRight, ChevronLeft, Bell, Loader2 } from "lucide-react";
import { useSidebar } from "@/lib/SidebarContext";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const nav = [
  { href:"/cashier",          label:"POS Terminal", icon:ShoppingBag, color:"#10b981", bg:"rgba(16,185,129,0.1)"  },
  { href:"/cashier/history",  label:"History",      icon:History,     color:"#06b6d4", bg:"rgba(6,182,212,0.1)"   },
  { href:"/cashier/settings", label:"Pengaturan",   icon:Settings,    color:"#f59e0b", bg:"rgba(245,158,11,0.1)"  },
];

function UserDropdown() {
  const router   = useRouter();
  const supabase = createClient();
  const [open,        setOpen]        = useState(false);
  const [loggingOut,  setLoggingOut]  = useState(false);
  const [userName,    setUserName]    = useState("Kasir");
  const [userInitial, setUserInitial] = useState("K");
  const ref = useRef<HTMLDivElement>(null);

  // Ambil nama user dari session
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("full_name, role").eq("id", user.id).single()
        .then(({ data }) => {
          const name = data?.full_name || user.email?.split("@")[0] || "Kasir";
          setUserName(name);
          setUserInitial(name[0].toUpperCase());
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/cashier/login");
    router.refresh(); // flush cache agar proxy tidak redirect balik
  };

  const items = [
    { icon:User,     label:"Edit Profil",    href:"/cashier/settings" },
    { icon:KeyRound, label:"Ganti Password", href:"/cashier/settings" },
    { icon:Bell,     label:"Notifikasi",     href:"/cashier/settings" },
    { icon:Settings, label:"Pengaturan",     href:"/cashier/settings" },
  ];

  return (
    <div className="relative" ref={ref}>
      {open && (
        <div className="absolute bottom-full mb-2 left-2 right-2 rounded-2xl overflow-hidden shadow-2xl z-50"
          style={{ background:"var(--surface)",border:"1px solid var(--border2,var(--border))" }}>
          <div className="px-4 py-3" style={{ borderBottom:"1px solid var(--border)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                style={{ background:"linear-gradient(135deg,#10b981,#06b6d4)" }}>{userInitial}</div>
              <div className="min-w-0">
                <p className="text-sm font-black truncate" style={{ color:"var(--text)" }}>{userName}</p>
                <p className="text-[10px]" style={{ color:"var(--text3)" }}>Cashier Station</p>
              </div>
            </div>
          </div>
          <div className="py-1">
            {items.map(({ icon:Icon, label, href }) => (
              <button key={label} onClick={() => { router.push(href); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-left"
                style={{ color:"var(--text2)" }}
                onMouseEnter={e=>(e.currentTarget.style.background="var(--surface2)")}
                onMouseLeave={e=>(e.currentTarget.style.background="")}>
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color:"var(--text3)" }}/>{label}
              </button>
            ))}
          </div>
          <div style={{ borderTop:"1px solid var(--border)" }}>
            <button onClick={handleLogout} disabled={loggingOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold disabled:opacity-60"
              style={{ color:"#ef4444" }}
              onMouseEnter={e=>{ if(!loggingOut) e.currentTarget.style.background="rgba(239,68,68,0.06)"; }}
              onMouseLeave={e=>(e.currentTarget.style.background="")}>
              {loggingOut
                ? <Loader2 className="w-4 h-4 animate-spin"/>
                : <LogOut className="w-4 h-4"/>
              }
              {loggingOut ? "Keluar..." : "Logout"}
            </button>
          </div>
        </div>
      )}
      <button onClick={()=>setOpen(o=>!o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-all text-left"
        onMouseEnter={e=>(e.currentTarget.style.background="var(--surface2)")}
        onMouseLeave={e=>(e.currentTarget.style.background="")}>
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black"
            style={{ background:"linear-gradient(135deg,#10b981,#06b6d4)" }}>{userInitial}</div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
            style={{ background:"#10b981",borderColor:"var(--surface)" }}/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate" style={{ color:"var(--text)" }}>{userName}</p>
          <p className="text-[10px] truncate" style={{ color:"var(--text3)" }}>Cashier Station</p>
        </div>
        <Settings className="w-3.5 h-3.5 flex-shrink-0" style={{ color:"var(--text3)" }}/>
      </button>
    </div>
  );
}

function SidebarContent({ isMobile=false }: { isMobile?:boolean }) {
  const pathname = usePathname();
  const { collapsed, toggle, setMobileOpen } = useSidebar();
  const isCol = collapsed && !isMobile;
  const close = () => isMobile && setMobileOpen(false);

  return (
    <div className="flex flex-col h-full" style={{ background:"var(--surface)",borderRight:"1px solid var(--border)" }}>

      {isCol ? (
        /* COLLAPSED: stacked layout so toggle button never gets clipped */
        <div className="flex flex-col items-center pt-3 pb-2 gap-2 flex-shrink-0" style={{ borderBottom:"1px solid var(--border)" }}>
          <Link href="/" className="block">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{ background:"linear-gradient(135deg,#10b981,#06b6d4)", boxShadow:"0 3px 12px rgba(16,185,129,0.38)" }}>
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5}/>
            </div>
          </Link>
          <button onClick={toggle}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background:"var(--surface2)", border:"1px solid var(--border)", transition:"background 0.15s, transform 0.2s" }}
            title="Expand sidebar"
            onMouseEnter={e=>{ e.currentTarget.style.background="rgba(16,185,129,0.1)"; e.currentTarget.style.transform="scale(1.1)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="var(--surface2)"; e.currentTarget.style.transform="scale(1)"; }}>
            <ChevronRight className="w-3.5 h-3.5" style={{ color:"#10b981" }}/>
          </button>
        </div>
      ) : (
        /* EXPANDED: normal flex row */
        <div className="flex items-center h-16 px-3 gap-2.5 flex-shrink-0" style={{ borderBottom:"1px solid var(--border)" }}>
          <Link href="/" onClick={close} className="flex-shrink-0">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{ background:"linear-gradient(135deg,#10b981,#06b6d4)", boxShadow:"0 3px 12px rgba(16,185,129,0.38)" }}>
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5}/>
            </div>
          </Link>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="font-black text-[15px] leading-none" style={{ color:"var(--text)", fontFamily:"Outfit,sans-serif" }}>
              Nexa<span style={{ color:"#10b981" }}>Sell</span>
            </p>
            <p className="text-[9px] font-bold tracking-[0.16em] uppercase mt-0.5" style={{ color:"var(--text3)" }}>Cashier Station</p>
          </div>
          {!isMobile ? (
            <button onClick={toggle}
              className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background:"var(--surface2)", border:"1px solid var(--border)", transition:"background 0.15s, transform 0.2s" }}
              title="Collapse sidebar"
              onMouseEnter={e=>{ e.currentTarget.style.background="rgba(16,185,129,0.1)"; e.currentTarget.style.transform="scale(1.1)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="var(--surface2)"; e.currentTarget.style.transform="scale(1)"; }}>
              <ChevronLeft className="w-3.5 h-3.5" style={{ color:"#10b981" }}/>
            </button>
          ) : (
            <button onClick={close} className="ml-auto flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background:"var(--surface2)", border:"1px solid var(--border)" }}>
              <X className="w-3.5 h-3.5" style={{ color:"var(--text2)" }}/>
            </button>
          )}
        </div>
      )}

      {!isCol && <p className="text-[9px] font-black uppercase tracking-[0.2em] px-4 pt-5 pb-1.5" style={{ color:"var(--text3)" }}>Navigation</p>}
      {isCol && <div className="h-3"/>}

      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden pb-2">
        {nav.map(item=>{
          const Icon=item.icon;
          const active=pathname===item.href||pathname.startsWith(item.href+"/");
          return(
            <Link key={item.href} href={item.href} onClick={close} title={isCol?item.label:undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all relative"
              style={{ justifyContent:isCol?"center":undefined,background:active?item.bg:undefined,color:active?item.color:"var(--text2)" }}
              onMouseEnter={e=>{ if(!active)e.currentTarget.style.background="var(--surface2)"; }}
              onMouseLeave={e=>{ if(!active)e.currentTarget.style.background=""; }}>
              {active&&!isCol&&<span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full" style={{ background:item.color }}/>}
              <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background:active?item.bg:"var(--surface2)",border:`1px solid ${active?item.color+"33":"var(--border)"}` }}>
                <Icon className="w-4 h-4" style={{ color:active?item.color:"var(--text3)" }}/>
              </span>
              {!isCol&&<span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 pb-3 flex-shrink-0" style={{ borderTop:"1px solid var(--border)",paddingTop:8 }}>
        {!isCol?<UserDropdown/>:(
          <div className="flex justify-center p-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black"
                style={{ background:"linear-gradient(135deg,#10b981,#06b6d4)" }}>S</div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                style={{ background:"#10b981",borderColor:"var(--surface)" }}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CashierSidebar() {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();
  return (
    <>
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen z-30 overflow-hidden"
        style={{ width:collapsed?68:256, transition:"width 0.3s cubic-bezier(0.4,0,0.2,1)" }}>
        <SidebarContent/>
      </aside>
      <button onClick={()=>setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 flex items-center gap-2 px-3 py-2 rounded-xl shadow-sm"
        style={{ background:"var(--surface)",border:"1px solid var(--border)" }}>
        <Menu className="w-4 h-4" style={{ color:"var(--text2)" }}/>
        <span className="text-xs font-bold" style={{ color:"var(--text2)" }}>Menu</span>
      </button>
      {mobileOpen&&(
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0" style={{ background:"rgba(0,0,0,0.55)",backdropFilter:"blur(6px)" }}
            onClick={()=>setMobileOpen(false)}/>
          <aside className="relative flex flex-col shadow-2xl" style={{ width:260 }}>
            <SidebarContent isMobile/>
          </aside>
        </div>
      )}
    </>
  );
}
