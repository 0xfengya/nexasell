"use client";
import CashierSidebar from "@/components/cashier/CashierSidebar";
import { SidebarProvider, useSidebar } from "@/lib/SidebarContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function CashierContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (pathname === "/cashier/login") { setChecking(false); return; }
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user }, error }) => {
      if (error || !user) { router.replace("/cashier/login"); return; }
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();
      if (!profile || profile.role !== "cashier") { router.replace("/admin"); return; }
      setChecking(false);
    });
  }, [pathname, router]);

  if (pathname === "/cashier/login") return <>{children}</>;

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-2xl animate-pulse" style={{ background: "linear-gradient(135deg,#10b981,#06b6d4)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--text3)" }}>Memeriksa akses...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <CashierSidebar />

      <div className="pt-16 lg:pt-0 w-full max-w-full overflow-x-hidden">
        <div className="lg:transition-[padding] lg:duration-300" style={{ paddingLeft: `var(--cashier-sidebar-offset, 0)` }}>
          <style>{`
            @media (min-width: 1024px) {
              :root { --cashier-sidebar-offset: ${collapsed ? "68px" : "256px"}; }
            }
            @media (max-width: 1023px) {
              :root { --cashier-sidebar-offset: 0px; }
            }
          `}</style>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function CashierLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <CashierContent>{children}</CashierContent>
    </SidebarProvider>
  );
}
