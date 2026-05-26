import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // ─── Halaman login — kalau sudah login, redirect ke dashboard ──
  if (pathname === "/admin/login" || pathname === "/admin/login/") {
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role === "admin") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    }
    // Belum login → boleh akses halaman login, lanjut
    return supabaseResponse;
  }

  if (pathname === "/cashier/login" || pathname === "/cashier/login/") {
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role === "cashier" || profile?.role === "admin") {
        return NextResponse.redirect(new URL("/cashier", request.url));
      }
    }
    return supabaseResponse;
  }

  // ─── Proteksi halaman /admin/* (kecuali /admin/login) ──────────
  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || profile.role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // ─── Proteksi halaman /cashier/* (kecuali /cashier/login) ──────
  if (pathname.startsWith("/cashier") && !pathname.startsWith("/cashier/login")) {
    if (!user) {
      return NextResponse.redirect(new URL("/cashier/login", request.url));
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["cashier", "admin"].includes(profile.role)) {
      return NextResponse.redirect(new URL("/cashier/login", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/cashier/:path*",
  ],
};
