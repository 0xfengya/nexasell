"use client";
import NotificationBell from "@/components/NotificationBell";

interface Props {
  title:    string;
  subtitle?: string;
}

export default function AdminHeader({ title, subtitle }: Props) {
  return (
    <div className="flex items-center justify-between mb-7">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: "var(--text3)" }}>
          Admin Panel
        </p>
        <h1 className="font-black text-2xl" style={{ color: "var(--text)", fontFamily: "Outfit,sans-serif" }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: "var(--text2)" }}>{subtitle}</p>
        )}
      </div>
      <NotificationBell role="admin" accentColor="#6366f1" apiBase="/api/admin" />
    </div>
  );
}
