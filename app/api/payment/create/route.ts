import { NextRequest, NextResponse } from "next/server";
import type { OrderRow } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/server";

// ─── POST /api/payment/create ─────────────────────────────────
// Menerima order_id, membuat Midtrans Snap token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id } = body;

    if (!order_id) {
      return NextResponse.json({ error: "order_id wajib diisi" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Ambil order beserta items
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", order_id)
      .single() as unknown as Promise<{ data: (OrderRow & { order_items: { name: string; price: number; quantity: number }[] }) | null; error: unknown }>;

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    if (order.pay_status === "success") {
      return NextResponse.json({ error: "Order sudah dibayar" }, { status: 400 });
    }

    // ID unik untuk Midtrans (berbeda dari UUID internal)
    const midtransOrderId = `NXS-${order.order_number}-${Date.now()}`;

    // ─── Midtrans Snap API ────────────────────────────────────
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      return NextResponse.json(
        { error: "MIDTRANS_SERVER_KEY belum dikonfigurasi di .env.local" },
        { status: 500 }
      );
    }

    const isProduction   = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const snapApiUrl     = isProduction
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    const authHeader = Buffer.from(`${serverKey}:`).toString("base64");

    // Payload ke Midtrans
    const snapPayload = {
      transaction_details: {
        order_id:      midtransOrderId,
        gross_amount:  order.total,
      },
      customer_details: {
        first_name: order.customer_name,
        email:      order.customer_email  || undefined,
        phone:      order.customer_phone  || undefined,
        billing_address: order.customer_address
          ? { address: order.customer_address }
          : undefined,
      },
      item_details: order.order_items.map((item: {
        name: string;
        price: number;
        quantity: number;
      }) => ({
        id:       item.name.slice(0, 50),
        price:    item.price,
        quantity: item.quantity,
        name:     item.name.slice(0, 50),
      })),
      callbacks: {
        finish:  `${process.env.NEXT_PUBLIC_APP_URL}/customer/payment?order_id=${order_id}`,
        error:   `${process.env.NEXT_PUBLIC_APP_URL}/customer/payment?order_id=${order_id}&status=error`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/customer/payment?order_id=${order_id}&status=pending`,
      },
    };

    const snapRes = await fetch(snapApiUrl, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Basic ${authHeader}`,
        "Accept":        "application/json",
      },
      body: JSON.stringify(snapPayload),
    });

    if (!snapRes.ok) {
      const errText = await snapRes.text();
      console.error("[Midtrans Error]", errText);
      return NextResponse.json(
        { error: "Midtrans gagal membuat transaksi", detail: errText },
        { status: 502 }
      );
    }

    const snapData = await snapRes.json();
    const snapToken  = snapData.token;
    const paymentUrl = snapData.redirect_url;

    // Simpan snap_token & midtrans_order_id ke order
    await supabase
      .from("orders")
      .update({
        snap_token:         snapToken,
        payment_url:        paymentUrl,
        midtrans_order_id:  midtransOrderId,
      } as never)
      .eq("id", order_id);

    return NextResponse.json({ snap_token: snapToken, payment_url: paymentUrl });
  } catch (err) {
    console.error("[POST /api/payment/create]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
