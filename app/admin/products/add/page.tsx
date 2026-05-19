"use client";
import { useState, useRef, memo, useCallback } from "react";
import { ArrowLeft, CheckCircle, ImageIcon, Upload, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { categories } from "@/data/products";

// ── Field component hoisted & memoized — no re-mount on each keystroke ──
const F = memo(function F({ field, label, type = "text", placeholder = "", required = false, value, onChange, error }: {
  field: string; label: string; type?: string; placeholder?: string; required?: boolean;
  value: string; onChange: (field: string, val: string) => void; error?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(field, e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all bg-gray-50 dark:bg-white/[0.04] text-gray-900 dark:text-gray-100 ${
          error ? "border-red-400 focus:ring-2 focus:ring-red-300" : "border-black/[0.08] dark:border-white/[0.08] focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400"
        }`} />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
});

export default function AddProductPage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saved,     setSaved]     = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [apiErr,    setApiErr]    = useState("");
  const [form, setForm] = useState({
    name: "", price: "", originalPrice: "", category: "food",
    description: "", stock: "", badge: "", image: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState("");

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())        e.name        = "Wajib diisi";
    if (!form.price)              e.price       = "Wajib diisi";
    if (Number(form.price) <= 0)  e.price       = "Harga harus > 0";
    if (!form.description.trim()) e.description = "Wajib diisi";
    if (!form.stock)              e.stock       = "Wajib diisi";
    if (Number(form.stock) < 0)   e.stock       = "Stok tidak boleh negatif";
    return e;
  };

  // Stable callback — tidak recreate tiap render
  const handleChange = useCallback((field: string, val: string) => {
    setForm(p => ({ ...p, [field]: val }));
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  }, []);

  const handleImageUpload = async (file: File) => {
    setUploading(true); setApiErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setApiErr(data.error || "Upload gagal"); return; }
      setForm(p => ({ ...p, image: data.url }));
      setPreview(data.url);
    } catch { setApiErr("Upload gagal. Coba lagi."); }
    finally  { setUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setApiErr("");
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:           form.name.trim(),
          price:          Number(form.price),
          original_price: form.originalPrice ? Number(form.originalPrice) : null,
          category:       form.category,
          image_url:      form.image || null,
          description:    form.description.trim(),
          stock:          Number(form.stock),
          badge:          form.badge.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setApiErr(data.error || "Gagal menyimpan"); setLoading(false); return; }
      setSaved(true);
      setTimeout(() => router.push("/admin/products"), 1500);
    } catch { setApiErr("Terjadi kesalahan. Coba lagi."); setLoading(false); }
  };

  return (
    <div className="p-4 sm:p-6 w-full max-w-full">
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-500 mb-5 transition-colors group">
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform"/>Back
      </Link>
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-1.5 h-5 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-full"/>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white" style={{fontFamily:"Syne,sans-serif"}}>Add Product</h1>
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl mb-5 border border-emerald-200 dark:border-emerald-500/20">
          <CheckCircle className="w-4 h-4 flex-shrink-0"/><span className="text-sm font-semibold">Produk berhasil disimpan! Mengalihkan...</span>
        </div>
      )}
      {apiErr && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-5 border border-red-200 dark:border-red-500/20">
          <X className="w-4 h-4 flex-shrink-0"/><span className="text-sm">{apiErr}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-[var(--surface)] rounded-2xl p-4 sm:p-5 border border-black/[0.06] dark:border-white/[0.06] space-y-4">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Info Dasar</h2>
              <F field="name" label="Nama Produk" placeholder="e.g. Premium Coffee" required
                value={form.name} onChange={handleChange} error={errors.name} />
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  Deskripsi <span className="text-red-400">*</span>
                </label>
                <textarea rows={3} value={form.description}
                  onChange={e => handleChange("description", e.target.value)}
                  placeholder="Deskripsikan produk..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all bg-gray-50 dark:bg-white/[0.04] text-gray-900 dark:text-gray-100 resize-none ${
                    errors.description ? "border-red-400" : "border-black/[0.08] dark:border-white/[0.08] focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400"
                  }`}/>
                {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
              </div>
            </div>
            <div className="bg-[var(--surface)] rounded-2xl p-4 sm:p-5 border border-black/[0.06] dark:border-white/[0.06]">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Harga & Stok</h2>
              <div className="grid grid-cols-3 gap-3">
                <F field="price" label="Harga (Rp)" type="number" placeholder="50000" required
                  value={form.price} onChange={handleChange} error={errors.price} />
                <F field="originalPrice" label="Harga Asli" type="number" placeholder="75000"
                  value={form.originalPrice} onChange={handleChange} />
                <F field="stock" label="Stok" type="number" placeholder="100" required
                  value={form.stock} onChange={handleChange} error={errors.stock} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[var(--surface)] rounded-2xl p-4 sm:p-5 border border-black/[0.06] dark:border-white/[0.06]">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Gambar Produk</h2>
              {preview ? (
                <div className="relative mb-3">
                  <img src={preview} alt="Preview" className="w-full aspect-square object-cover rounded-xl"/>
                  <button type="button" onClick={() => { setPreview(""); setForm(p => ({ ...p, image: "" })); }}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center">
                    <X className="w-3.5 h-3.5 text-white"/>
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-full aspect-square border-2 border-dashed border-black/[0.1] dark:border-white/[0.1] rounded-xl flex flex-col items-center justify-center gap-2 hover:border-indigo-400 transition-colors mb-3">
                  {uploading
                    ? <Loader2 className="w-8 h-8 text-indigo-400 animate-spin"/>
                    : <><ImageIcon className="w-8 h-8 text-gray-400"/><p className="text-xs text-gray-400">Klik untuk upload</p><p className="text-[10px] text-gray-300">JPG, PNG, WEBP — maks 5MB</p></>
                  }
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}/>
              <p className="text-xs text-gray-400 mb-1.5">Atau masukkan URL gambar:</p>
              <input type="url" value={form.image}
                onChange={e => { setForm(p => ({ ...p, image: e.target.value })); setPreview(e.target.value); }}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500/50"/>
              {uploading && <div className="flex items-center gap-2 mt-2"><Upload className="w-3.5 h-3.5 text-indigo-400 animate-pulse"/><p className="text-xs text-indigo-400">Mengupload...</p></div>}
            </div>

            <div className="bg-[var(--surface)] rounded-2xl p-4 sm:p-5 border border-black/[0.06] dark:border-white/[0.06] space-y-3">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Detail Lainnya</h2>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Kategori</label>
                <select value={form.category} onChange={e => handleChange("category", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500/50">
                  {categories.filter(c => c.id !== "all").map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Badge (opsional)</label>
                <select value={form.badge} onChange={e => handleChange("badge", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500/50">
                  <option value="">Tidak ada</option>
                  <option value="Best Seller">Best Seller</option>
                  <option value="Sale">Sale</option>
                  <option value="New">New</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading || uploading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin"/>Menyimpan...</> : "Simpan Produk"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
