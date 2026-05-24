import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { OrderRow } from "@/lib/supabase/types";
import { createHash } from "crypto";

// ─── POST /api/payment/notification ──────────────────────────
// Midtrans webhook — dipanggil otomatis setelah pembayaran
// Daftarkan URL ini di Midtrans Dashboard → Configuration → Payment Notification URL
// URL: https://yourdomain.com/api/payment/notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      order_id:          midtransOrderId,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = body;

    // ─── Verifikasi signature ─────────────────────────────────
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      console.error("[Webhook] MIDTRANS_SERVER_KEY tidak dikonfigurasi");
      return NextResponse.json({ error: "Server config error" }, { status: 500 });
    }

    const expectedSignature = createHash("sha512")
      .update(`${midtransOrderId}${status_code}${gross_amount}${serverKey}`)
      .digest("hex");

    if (signature_key !== expectedSignature) {
      console.warn("[Webhook] Signature tidak valid", { midtransOrderId });
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // ─── Cari order di DB ─────────────────────────────────────
    const supabase = createAdminClient();
    const { data: order, error: orderErr } = await (supabase
      .from("orders")
      .select("id, status, pay_status")
      .eq("midtrans_order_id", midtransOrderId)
      .single() as unknown as Promise<{ data: Pick<OrderRow, "id" | "status" | "pay_status"> | null; error: unknown }>);

    if (orderErr || !order) {
      console.warn("[Webhook] Order tidak ditemukan:", midtransOrderId);
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    // Jika sudah paid, skip (idempotent)
    if (order.pay_status === "success") {
      return NextResponse.json({ message: "Already processed" });
    }

    // ─── Map status Midtrans → status internal ────────────────
    let payStatus: "pending" | "success" | "failed" | "expired" = "pending";
    let orderStatus: "pending" | "paid" | "cancelled" | "refunded" = order.status as "pending" | "paid" | "cancelled" | "refunded";

    if (transaction_status === "capture") {
      if (fraud_status === "accept") {
        payStatus   = "success";
        orderStatus = "paid";
      } else if (fraud_status === "challenge") {
        payStatus = "pending"; // Menunggu review manual
      }
    } else if (transaction_status === "settlement") {
      payStatus   = "success";
      orderStatus = "paid";
    } else if (["deny", "cancel", "failure"].includes(transaction_status)) {
      payStatus   = "failed";
      orderStatus = "cancelled";
    } else if (transaction_status === "expire") {
      payStatus   = "expired";
      orderStatus = "cancelled";
    } else if (transaction_status === "pending") {
      payStatus = "pending";
    }

    // ─── Update order ─────────────────────────────────────────
    const { error: updateErr } = await supabase
      .from("orders")
      .update({ pay_status: payStatus, status: orderStatus } as never)
      .eq("id", order.id);

    if (updateErr) {
      console.error("[Webhook] Gagal update order:", updateErr);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }

    console.log(`[Webhook] Order ${midtransOrderId} → ${payStatus}`);
    return NextResponse.json({ message: "OK" });
  } catch (err) {
    console.error("[POST /api/payment/notification]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
