"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, CheckCircle, Clock, AlertCircle, Receipt, TrendingUp, RefreshCcw, Loader2 } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface OrderItem { name: string; quantity: number; }
interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  status: string;
  pay_status: string;
  pay_method: string | null;
  source: string;
  created_at: string;
  order_items: OrderItem[];
}

interface Stats {
  todayRevenue: number;
  todayCount: number;
  todayCompleted: number;
  pendingCount: number;
  totalCount: number;
}

export default function CashierHistory() {
  const [orders, setOrders]           = useState<Order[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stats, setStats]             = useState<Stats>({ todayRevenue:0, todayCount:0, todayCompleted:0, pendingCount:0, totalCount:0 });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/orders?source=pos&limit=100");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const data: Order[] = json.data ?? [];
      setOrders(data);

      // Hitung stats
      const today  = new Date().toISOString().slice(0, 10);
      const todayOrders = data.filter(o => o.created_at.startsWith(today));
      setStats({
        todayRevenue:   todayOrders.filter(o=>o.pay_status==="success").reduce((s,o)=>s+o.total, 0),
        todayCount:     todayOrders.length,
        todayCompleted: todayOrders.filter(o=>o.status==="paid").length,
        pendingCount:   data.filter(o=>o.status==="pending").length,
        totalCount:     data.length,
      });
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = orders.filter(o => {
    const matchS  = o.customer_name.toLowerCase().includes(search.toLowerCase())
                 || o.order_number.toLowerCase().includes(search.toLowerCase());
    const matchSt = statusFilter === "all" || o.status === statusFilter;
    return matchS && matchSt;
  });

  const statCards = [
    { label:"Pendapatan Hari Ini", value:formatRupiah(stats.todayRevenue), sub:`dari ${stats.todayCount} transaksi`, icon:TrendingUp, color:"text-emerald-600 dark:text-emerald-400", bg:"bg-emerald-50 dark:bg-emerald-500/10", border:"border-emerald-100 dark:border-emerald-500/20" },
    { label:"Selesai",             value:String(stats.todayCompleted),      sub:"transaksi paid",                     icon:CheckCircle, color:"text-blue-500",   bg:"bg-blue-50 dark:bg-blue-500/10",   border:"border-blue-100 dark:border-blue-500/20" },
    { label:"Menunggu",            value:String(stats.pendingCount),         sub:"transaksi pending",                  icon:Clock,       color:"text-amber-500",  bg:"bg-amber-50 dark:bg-amber-500/10", border:"border-amber-100 dark:border-amber-500/20" },
    { label:"Total Transaksi",     value:String(stats.totalCount),           sub:"semua waktu",                        icon:Receipt,     color:"text-violet-500", bg:"bg-violet-50 dark:bg-violet-500/10", border:"border-violet-100 dark:border-violet-500/20" },
  ];

  const statusLabel: Record<string, string> = { pending:"pending", paid:"paid", cancelled:"cancelled", refunded:"refunded" };

  return (
    <div className="p-4 sm:p-6 w-full max-w-full">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"/>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">Riwayat Transaksi</h1>
          </div>
          <p className="text-sm text-gray-400 ml-3.5">Transaksi POS kasir ini</p>
        </div>
        <button onClick={fetchOrders} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all disabled:opacity-50">
          <RefreshCcw className={`w-3.5 h-3.5 ${loading?"animate-spin":""}`}/>Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {statCards.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`bg-[var(--surface)] rounded-2xl p-4 border ${s.border} hover:shadow-md dark:hover:shadow-black/20 transition-all`}>
              <div className={`${s.bg} p-2.5 rounded-xl w-fit mb-3`}><Icon className={`w-4 h-4 ${s.color}`}/></div>
              <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-none mb-1 truncate">{s.value}</p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{s.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-black/[0.06] dark:border-white/[0.06] overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-black/[0.06] dark:border-white/[0.06] flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
            <input type="text" placeholder="Cari nama / nomor order..." value={search} onChange={e=>setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 text-gray-900 dark:text-gray-100"/>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["all","pending","paid","cancelled"].map(s=>(
              <button key={s} onClick={()=>setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                  statusFilter===s ? "bg-emerald-500 text-white shadow-sm" : "bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.1]"
                }`}>
                {s==="all"?"Semua":statusLabel[s]??s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin"/><span className="text-sm">Memuat data...</span>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-black/[0.04] dark:border-white/[0.04]">
                  <th className="text-left px-4 sm:px-5 py-3">No. Order</th>
                  <th className="text-left px-4 sm:px-5 py-3">Pelanggan</th>
                  <th className="text-left px-4 sm:px-5 py-3 hidden sm:table-cell">Item</th>
                  <th className="text-left px-4 sm:px-5 py-3">Total</th>
                  <th className="text-left px-4 sm:px-5 py-3 hidden md:table-cell">Waktu</th>
                  <th className="text-left px-4 sm:px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o=>(
                  <tr key={o.id} className="border-b border-black/[0.03] dark:border-white/[0.03] hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors last:border-0">
                    <td className="px-4 sm:px-5 py-3.5 text-[11px] font-mono font-bold text-gray-400">{o.order_number}</td>
                    <td className="px-4 sm:px-5 py-3.5 text-sm font-semibold text-gray-900 dark:text-gray-100">{o.customer_name}</td>
                    <td className="px-4 sm:px-5 py-3.5 text-xs text-gray-400 hidden sm:table-cell">{o.order_items?.length ?? 0} item</td>
                    <td className="px-4 sm:px-5 py-3.5 text-sm font-black text-gray-900 dark:text-white whitespace-nowrap">{formatRupiah(o.total)}</td>
                    <td className="px-4 sm:px-5 py-3.5 text-xs text-gray-400 hidden md:table-cell">
                      {new Date(o.created_at).toLocaleString("id-ID",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full whitespace-nowrap ${
                        o.status==="paid"      ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : o.status==="pending" ? "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        :                        "bg-red-100 dark:bg-red-500/15 text-red-600"
                      }`}>
                        {o.status==="paid" ? <CheckCircle className="w-2.5 h-2.5"/> : o.status==="pending" ? <Clock className="w-2.5 h-2.5"/> : <AlertCircle className="w-2.5 h-2.5"/>}
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length===0&&(
              <div className="flex flex-col items-center justify-center py-14 gap-2">
                <Receipt className="w-10 h-10 text-gray-200 dark:text-gray-700"/>
                <p className="text-sm text-gray-400">Tidak ada transaksi</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
