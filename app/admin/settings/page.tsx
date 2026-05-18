"use client";
import { useState, useEffect, useCallback } from "react";
import { User, Lock, Bell, Shield, Camera, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { id:"profile",  label:"Profil",         icon:User   },
  { id:"password", label:"Ganti Password", icon:Lock   },
  { id:"notif",    label:"Notifikasi",     icon:Bell   },
  { id:"security", label:"Keamanan",       icon:Shield },
];

const NOTIF_KEYS = [
  { key:"new_order",  label:"Pesanan Baru",   desc:"Notifikasi setiap ada pesanan masuk",       default:true  },
  { key:"low_stock",  label:"Stok Menipis",   desc:"Alert ketika stok produk di bawah 10 unit", default:true  },
  { key:"daily_rep",  label:"Laporan Harian", desc:"Ringkasan penjualan harian",                default:false },
  { key:"sys_update", label:"Update Sistem",  desc:"Info update dan maintenance aplikasi",       default:false },
];

const ACCENT = "#6366f1";

function Field({ label, value, onChange, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold mb-2" style={{ color:"var(--text2)" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none transition-all"
        style={{ background:"var(--surface2)", border:"1.5px solid var(--border)", color:"var(--text)" }}
        onFocus={e => (e.target.style.borderColor = ACCENT)}
        onBlur={e  => (e.target.style.borderColor = "var(--border)")} />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="w-11 h-6 rounded-full transition-all relative flex-shrink-0"
      style={{ background: checked ? ACCENT : "var(--surface3,#e5e7eb)" }}>
      <div className="w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-all"
        style={{ left: checked ? "calc(100% - 22px)" : "2px" }} />
    </button>
  );
}

function formatLastLogin(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)   return "Baru saja";
  if (diffMin < 60)  return `${diffMin} menit lalu`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)   return `${diffHr} jam lalu`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Kemarin";
  if (diffDay < 7)   return `${diffDay} hari lalu`;
  return d.toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric" });
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [saved,     setSaved]     = useState(false);
  const [saveErr,   setSaveErr]   = useState("");
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [profile,   setProfile]   = useState({ name:"", username:"", phone:"" });
  const [role,      setRole]      = useState("admin");
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [pwForm,    setPwForm]    = useState({ newPw:"", confirm:"" });
  const [pwErr,     setPwErr]     = useState("");
  const [pwSaving,  setPwSaving]  = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifs, setNotifs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_KEYS.map(n => [n.key, n.default]))
  );

  const loadProfile = useCallback(async () => {
    try {
      // Load profile + last_sign_in_at dari API
      const res = await fetch("/api/admin/profile");
      const json = await res.json();
      if (json.data) {
        setProfile({
          name:     json.data.full_name ?? "",
          username: json.data.username  ?? "",
          phone:    json.data.phone     ?? "",
        });
        setRole(json.data.role ?? "admin");
        setLastLogin(json.data.last_sign_in_at ?? null);

        // Merge saved notif prefs dari DB dengan defaults
        if (json.data.notif_preferences && typeof json.data.notif_preferences === "object") {
          setNotifs(prev => ({ ...prev, ...json.data.notif_preferences }));
        }
      }

      // Session count dari supabase client
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      setSessionCount(sessionData?.session ? 1 : 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSaveErr("");
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: profile.name, username: profile.username, phone: profile.phone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan");
      showSaved();
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const handlePwSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) { setPwErr("Password tidak cocok"); return; }
    if (pwForm.newPw.length < 8)         { setPwErr("Minimal 8 karakter");   return; }
    setPwErr(""); setPwSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
      if (error) throw error;
      setPwForm({ newPw:"", confirm:"" });
      showSaved();
    } catch (err: unknown) {
      setPwErr(err instanceof Error ? err.message : "Gagal ganti password");
    } finally {
      setPwSaving(false);
    }
  };

  const handleNotifSave = async () => {
    setNotifSaving(true); setSaveErr("");
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notif_preferences: notifs }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan");
      showSaved();
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setNotifSaving(false);
    }
  };

  const initials = (profile.name || profile.username || "A").charAt(0).toUpperCase();

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-full" style={{ background:"var(--bg)", minHeight:"100vh" }}>
      <div className="mb-7">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color:"var(--text3)" }}>Account</p>
        <h1 className="font-black text-2xl" style={{ color:"var(--text)", fontFamily:"Outfit,sans-serif" }}>Pengaturan</h1>
        <p className="text-sm mt-0.5" style={{ color:"var(--text2)" }}>Kelola profil dan keamanan akun admin</p>
      </div>

      {saved && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-5"
          style={{ background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.25)", color:"#10b981" }}>
          <Check className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-semibold">Perubahan berhasil disimpan!</span>
        </div>
      )}
      {saveErr && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-5"
          style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", color:"#ef4444" }}>
          <span className="text-sm font-semibold">{saveErr}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">

        {/* Sidebar nav */}
        <div className="rounded-3xl p-3 h-fit" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
          <div className="flex flex-col items-center p-4 mb-1">
            <div className="relative mb-3">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-2xl font-black shadow-xl"
                style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)" }}>{initials}</div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl flex items-center justify-center shadow-md"
                style={{ background:"var(--surface)", border:"2px solid var(--bg)" }}>
                <Camera className="w-3.5 h-3.5" style={{ color:"var(--text2)" }} />
              </button>
            </div>
            <p className="font-black text-sm" style={{ color:"var(--text)" }}>{profile.name || "—"}</p>
            <p className="text-[10px]" style={{ color:"var(--text3)" }}>@{profile.username || "—"}</p>
            <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full"
              style={{ background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.2)" }}>
              <Shield className="w-3 h-3" style={{ color:ACCENT }} />
              <span className="text-[10px] font-bold capitalize" style={{ color:ACCENT }}>{role}</span>
            </div>
          </div>
          <div className="space-y-0.5">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all text-left"
                style={activeTab === t.id ? { background:`${ACCENT}15`, color:ACCENT } : { color:"var(--text2)" }}
                onMouseEnter={e => { if (activeTab !== t.id) e.currentTarget.style.background = "var(--surface2)"; }}
                onMouseLeave={e => { if (activeTab !== t.id) e.currentTarget.style.background = ""; }}>
                <t.icon className="w-4 h-4 flex-shrink-0" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content panel */}
        <div className="rounded-3xl p-6" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>

          {/* ── Profile ── */}
          {activeTab === "profile" && (
            loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Memuat profil...</span>
              </div>
            ) : (
              <form onSubmit={handleProfileSave} className="space-y-5">
                <div>
                  <h2 className="font-black text-lg mb-1" style={{ color:"var(--text)", fontFamily:"Outfit,sans-serif" }}>Edit Profil</h2>
                  <p className="text-sm" style={{ color:"var(--text2)" }}>Update informasi akun admin Anda</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nama Lengkap" value={profile.name}     onChange={v => setProfile(p => ({ ...p, name:v }))} />
                  <Field label="Username"     value={profile.username} onChange={v => setProfile(p => ({ ...p, username:v }))} />
                  <Field label="No. Telepon"  value={profile.phone}    onChange={v => setProfile(p => ({ ...p, phone:v }))} type="tel" />
                </div>
                <button type="submit" disabled={saving}
                  className="px-8 py-3 rounded-2xl text-white font-black text-sm flex items-center gap-2 disabled:opacity-60"
                  style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow:"0 4px 16px rgba(99,102,241,0.35)" }}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </form>
            )
          )}

          {/* ── Password ── */}
          {activeTab === "password" && (
            <form onSubmit={handlePwSave} className="space-y-5">
              <div>
                <h2 className="font-black text-lg mb-1" style={{ color:"var(--text)", fontFamily:"Outfit,sans-serif" }}>Ganti Password</h2>
                <p className="text-sm" style={{ color:"var(--text2)" }}>Minimal 8 karakter</p>
              </div>
              <div className="max-w-md space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-2" style={{ color:"var(--text2)" }}>Password Baru</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color:"var(--text3)" }} />
                    <input type={showNew ? "text" : "password"} value={pwForm.newPw}
                      onChange={e => setPwForm(f => ({ ...f, newPw:e.target.value }))} required
                      className="w-full pl-11 pr-12 py-3 rounded-2xl text-sm font-medium outline-none transition-all"
                      style={{ background:"var(--surface2)", border:"1.5px solid var(--border)", color:"var(--text)" }}
                      onFocus={e => (e.target.style.borderColor = ACCENT)}
                      onBlur={e  => (e.target.style.borderColor = "var(--border)")} />
                    <button type="button" onClick={() => setShowNew(s => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color:"var(--text3)" }}>
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-2" style={{ color:"var(--text2)" }}>Konfirmasi Password Baru</label>
                  <input type="password" value={pwForm.confirm}
                    onChange={e => setPwForm(f => ({ ...f, confirm:e.target.value }))} required
                    className="w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none transition-all"
                    style={{ background:"var(--surface2)", border:`1.5px solid ${pwErr ? "#ef4444" : "var(--border)"}`, color:"var(--text)" }}
                    onFocus={e => (e.target.style.borderColor = ACCENT)}
                    onBlur={e  => (e.target.style.borderColor = pwErr ? "#ef4444" : "var(--border)")} />
                  {pwErr && <p className="text-xs text-red-500 mt-1">{pwErr}</p>}
                </div>
              </div>
              <button type="submit" disabled={pwSaving}
                className="px-8 py-3 rounded-2xl text-white font-black text-sm flex items-center gap-2 disabled:opacity-60"
                style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow:"0 4px 16px rgba(99,102,241,0.35)" }}>
                {pwSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {pwSaving ? "Menyimpan..." : "Update Password"}
              </button>
            </form>
          )}

          {/* ── Notifikasi ── */}
          {activeTab === "notif" && (
            <div>
              <div className="mb-5">
                <h2 className="font-black text-lg mb-1" style={{ color:"var(--text)", fontFamily:"Outfit,sans-serif" }}>Notifikasi</h2>
                <p className="text-sm" style={{ color:"var(--text2)" }}>Preferensi tersimpan ke akun Anda</p>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Memuat preferensi...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-0">
                    {NOTIF_KEYS.map((n, i) => (
                      <div key={n.key} className="flex items-center justify-between py-4"
                        style={{ borderBottom: i < NOTIF_KEYS.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div>
                          <p className="text-sm font-bold" style={{ color:"var(--text)" }}>{n.label}</p>
                          <p className="text-xs mt-0.5" style={{ color:"var(--text3)" }}>{n.desc}</p>
                        </div>
                        <Toggle checked={!!notifs[n.key]} onChange={v => setNotifs(prev => ({ ...prev, [n.key]:v }))} />
                      </div>
                    ))}
                  </div>
                  <div className="pt-4">
                    <button onClick={handleNotifSave} disabled={notifSaving}
                      className="px-8 py-3 rounded-2xl text-white font-black text-sm flex items-center gap-2 disabled:opacity-60"
                      style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow:"0 4px 16px rgba(99,102,241,0.35)" }}>
                      {notifSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      {notifSaving ? "Menyimpan..." : "Simpan Preferensi"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Keamanan ── */}
          {activeTab === "security" && (
            <div className="space-y-5">
              <div>
                <h2 className="font-black text-lg mb-1" style={{ color:"var(--text)", fontFamily:"Outfit,sans-serif" }}>Keamanan</h2>
                <p className="text-sm" style={{ color:"var(--text2)" }}>Informasi keamanan akun Anda</p>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Memuat data...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    {
                      t: "Session Aktif",
                      d: sessionCount !== null
                        ? `Login dari ${sessionCount} perangkat`
                        : "Mengambil data session...",
                      badge: sessionCount !== null ? `${sessionCount} sesi` : "—",
                      col: "#10b981",
                    },
                    {
                      t: "Login Terakhir",
                      d: lastLogin
                        ? new Date(lastLogin).toLocaleString("id-ID", { dateStyle:"medium", timeStyle:"short" })
                        : "Tidak tersedia",
                      badge: formatLastLogin(lastLogin),
                      col: ACCENT,
                    },
                    {
                      t: "Hak Akses",
                      d: `Role: ${role === "admin" ? "Administrator — akses penuh" : role}`,
                      badge: role.charAt(0).toUpperCase() + role.slice(1),
                      col: "#8b5cf6",
                    },
                  ].map(item => (
                    <div key={item.t} className="flex items-center justify-between p-4 rounded-2xl"
                      style={{ background:"var(--surface2)", border:"1px solid var(--border)" }}>
                      <div>
                        <p className="text-sm font-bold" style={{ color:"var(--text)" }}>{item.t}</p>
                        <p className="text-xs mt-0.5" style={{ color:"var(--text3)" }}>{item.d}</p>
                      </div>
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full"
                        style={{ background:`${item.col}15`, color:item.col, border:`1px solid ${item.col}25` }}>
                        {item.badge}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
