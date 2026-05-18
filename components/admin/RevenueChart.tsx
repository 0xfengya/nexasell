"use client";
import { useState, useRef, useEffect } from "react";
import { formatRupiah } from "@/lib/utils";
import { TrendingUp, BarChart2 } from "lucide-react";

export interface MonthlyRevenue { month: string; revenue: number; }

interface Props {
  data: MonthlyRevenue[];
  totalRevenue: number;
  totalTransactions?: number;
}

export default function RevenueChart({ data, totalRevenue, totalTransactions = 0 }: Props) {
  const [hov, setHov]         = useState<number | null>(null);
  const [mode, setMode]       = useState<"bar" | "line">("bar");
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div ref={ref} className="rounded-3xl p-5 sm:p-6 h-full flex items-center justify-center"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text3)" }}>Belum ada data revenue</p>
      </div>
    );
  }

  const max    = Math.max(...data.map(d => d.revenue), 1);
  const min    = Math.min(...data.map(d => d.revenue));
  const last   = data[data.length - 1];
  const prev   = data[data.length - 2];
  const growth = prev && prev.revenue > 0
    ? Math.round(((last.revenue - prev.revenue) / prev.revenue) * 100)
    : 0;

  const W = 420, H = 100, PAD = 10;
  const pts = data.map((d, i) => {
    const x = PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2);
    const y = H - PAD - ((d.revenue - min) / (max - min || 1)) * (H - PAD * 2);
    return { x, y, d };
  });
  const smoothPath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const pv  = pts[i - 1];
    const cpx = (pv.x + p.x) / 2;
    return `${acc} C ${cpx} ${pv.y} ${cpx} ${p.y} ${p.x} ${p.y}`;
  }, "");
  const areaPath = `${smoothPath} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;

  return (
    <div ref={ref} className="rounded-3xl p-5 sm:p-6 h-full" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <style>{`
        @keyframes barRise { from{height:0;opacity:0} to{opacity:1} }
        @keyframes pathDraw { from{stroke-dashoffset:1000} to{stroke-dashoffset:0} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .bar-col { transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), filter 0.2s; }
        .bar-col:hover { filter: brightness(1.15); }
        .mode-btn { transition: all 0.2s; }
      `}</style>

      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-1.5" style={{ color: "var(--text3)" }}>Revenue Bulanan</p>
          <p className="font-black text-2xl" style={{ color: "var(--text)", fontFamily: "Outfit,sans-serif" }}>{formatRupiah(totalRevenue)}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black"
              style={{ background: growth >= 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: growth >= 0 ? "#10b981" : "#ef4444", border: `1px solid ${growth >= 0 ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}` }}>
              <TrendingUp className="w-3 h-3" />{growth >= 0 ? "+" : ""}{growth}%
            </span>
            <span className="text-[11px]" style={{ color: "var(--text3)" }}>vs bulan lalu</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex p-0.5 rounded-xl gap-0.5" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            {(["bar", "line"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} className="mode-btn w-7 h-7 rounded-lg flex items-center justify-center"
                style={mode === m
                  ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 2px 8px rgba(99,102,241,0.4)" }
                  : { background: "transparent" }}>
                {m === "bar"
                  ? <BarChart2 className="w-3.5 h-3.5" style={{ color: mode === m ? "#fff" : "var(--text3)" }} />
                  : <TrendingUp className="w-3.5 h-3.5" style={{ color: mode === m ? "#fff" : "var(--text3)" }} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {mode === "bar" ? (
        <div className="flex items-end gap-2 sm:gap-2.5 mb-4" style={{ height: 128 }}>
          {data.map((d, i) => {
            const pct   = max > 0 ? (d.revenue / max) * 100 : 0;
            const isHov = hov === i;
            const isLast = i === data.length - 1;
            const hi = isLast || isHov;
            return (
              <div key={d.month} className="bar-col flex-1 flex flex-col items-center gap-1.5 cursor-default relative"
                style={{ transform: isHov ? "scaleX(0.92)" : "scaleX(1)" }}
                onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[10px] font-black px-2.5 py-1.5 rounded-xl shadow-xl whitespace-nowrap z-20 pointer-events-none"
                  style={{ background: "var(--text)", color: "var(--surface)",
                    opacity: isHov ? 1 : 0, transform: isHov ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(4px)",
                    transition: "opacity 0.15s, transform 0.15s" }}>
                  {formatRupiah(d.revenue)}
                  <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "4px solid var(--text)" }} />
                </div>
                <div className="w-full flex items-end" style={{ height: 96 }}>
                  <div className="w-full rounded-t-xl overflow-hidden relative"
                    style={{
                      height: animated ? `${pct}%` : "0%",
                      minHeight: d.revenue > 0 ? 4 : 0,
                      transition: `height 0.7s cubic-bezier(0.16,1,0.3,1) ${i * 0.04}s`,
                      background: hi ? "linear-gradient(to top,#6366f1,#a78bfa)" : "linear-gradient(to top,rgba(99,102,241,0.25),rgba(99,102,241,0.12))",
                      boxShadow: hi ? "0 -4px 16px rgba(99,102,241,0.4)" : "none",
                    }} />
                </div>
                <span className="text-[10px] font-semibold" style={{ color: hi ? "var(--text)" : "var(--text3)", transition: "color 0.2s" }}>{d.month}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mb-4 relative" style={{ height: 128 }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full overflow-visible" style={{ animation: "fadeIn 0.4s ease both" }}>
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            {[0, 25, 50, 75, 100].map(pct => (
              <line key={pct} x1={PAD} y1={H - PAD - pct * (H - PAD * 2) / 100} x2={W - PAD} y2={H - PAD - pct * (H - PAD * 2) / 100}
                stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4" />
            ))}
            <path d={areaPath} fill="url(#lineGrad)" style={{ animation: "fadeIn 0.6s ease 0.2s both", opacity: 0 }} />
            <path d={smoothPath} fill="none" stroke="url(#lineStroke)" strokeWidth="2.5" strokeLinecap="round"
              style={{ strokeDasharray: 1000, strokeDashoffset: animated ? 0 : 1000, transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
            {pts.map((p, i) => (
              <g key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} style={{ cursor: "default" }}>
                <circle cx={p.x} cy={p.y} r={hov === i ? 6 : 4} fill="#6366f1"
                  style={{ transition: "r 0.2s", filter: hov === i ? "drop-shadow(0 0 6px rgba(99,102,241,0.8))" : "none" }} />
                <circle cx={p.x} cy={p.y} r={hov === i ? 10 : 0} fill="rgba(99,102,241,0.2)" style={{ transition: "r 0.2s" }} />
                {hov === i && (
                  <foreignObject x={p.x - 40} y={p.y - 38} width="80" height="28">
                    <div style={{ background: "var(--text)", color: "var(--surface)", borderRadius: 8, padding: "3px 8px", fontSize: 10, fontWeight: 900, textAlign: "center", whiteSpace: "nowrap" }}>
                      {formatRupiah(p.d.revenue)}
                    </div>
                  </foreignObject>
                )}
              </g>
            ))}
            {pts.map((p, i) => (
              <text key={i} x={p.x} y={H + 2} textAnchor="middle" style={{ fontSize: 10, fontWeight: 600, fill: "var(--text3)", fontFamily: "Outfit,sans-serif" }}>
                {p.d.month}
              </text>
            ))}
          </svg>
        </div>
      )}

      <div className="pt-4 flex items-center justify-between" style={{ borderTop: "1px solid var(--border)" }}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "var(--text3)" }}>Total Transaksi</p>
          <p className="font-black text-lg" style={{ color: "var(--text)", fontFamily: "Outfit,sans-serif" }}>
            {totalTransactions.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="flex items-end gap-1" style={{ height: 36 }}>
          {data.map((d, i) => {
            const mxR  = Math.max(...data.map(x => x.revenue), 1);
            const h    = Math.round((d.revenue / mxR) * 32);
            const isLast = i === data.length - 1;
            return (
              <div key={d.month} className="w-3 rounded-sm" style={{
                height: animated ? h : 0,
                transition: `height 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.04}s`,
                background: isLast || hov === i ? "#10b981" : "rgba(16,185,129,0.3)",
              }} />
            );
          })}
        </div>
      </div>
    </div>
  );
}
