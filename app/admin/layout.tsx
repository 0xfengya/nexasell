"use client";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { SidebarProvider, useSidebar } from "@/lib/SidebarContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function AdminContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Skip auth check on login page
    if (pathname === "/admin/login") { setChecking(false); return; }

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user }, error }) => {
      if (error || !user) { router.replace("/admin/login"); return; }

      // Fetch role from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        // Not an admin — redirect to cashier area
        router.replace("/cashier");
        return;
      }
      setChecking(false);
    });
  }, [pathname, router]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-2xl animate-pulse" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--text3)" }}>Memeriksa akses...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <AdminSidebar />
      <div
        className="pt-16 lg:pt-0 w-full max-w-full overflow-x-hidden"
        style={{ paddingLeft: 0 }}
      >
        <div className="lg:transition-[padding] lg:duration-300" style={{ paddingLeft: `var(--sidebar-offset, 0)` }}>
          <style>{`
            @media (min-width: 1024px) {
              :root { --sidebar-offset: ${collapsed ? "68px" : "256px"}; }
            }
            @media (max-width: 1023px) {
              :root { --sidebar-offset: 0px; }
            }
          `}</style>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AdminContent>{children}</AdminContent>
    </SidebarProvider>
  );
}
