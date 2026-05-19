import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient, getProfileRole } from "@/lib/supabase/server";

const BUCKET = "products";
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// ─── POST /api/upload ─────────────────────────────────────────
// Upload gambar produk ke Supabase Storage
// Form data: field "file" (File)
export async function POST(request: NextRequest) {
  try {
    // Harus admin
    const supabaseUser = await createClient();
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileRole(user.id);

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    // Validasi tipe file
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipe file tidak didukung. Gunakan: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validasi ukuran
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `Ukuran file maksimal ${MAX_SIZE_MB}MB` },
        { status: 400 }
      );
    }

    // Generate nama file unik
    const ext      = file.name.split(".").pop() ?? "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `products/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    const supabase = createAdminClient();

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType:  file.type,
        cacheControl: "3600",
        upsert:       false,
      });

    if (uploadErr) {
      console.error("[Upload] Storage error:", uploadErr);
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    // Dapatkan public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    return NextResponse.json({ error: "Upload gagal" }, { status: 500 });
  }
}
