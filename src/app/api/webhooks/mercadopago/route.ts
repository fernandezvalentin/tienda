import { NextResponse, type NextRequest } from "next/server";
import { getPayment, verifyWebhookSignature } from "@/lib/mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";

/** Webhook de Mercado Pago: marca el pedido como pagado cuando el pago se aprueba. */
export async function POST(request: NextRequest) {
  const url = request.nextUrl;
  const body = (await request.json().catch(() => ({}))) as {
    type?: string;
    action?: string;
    data?: { id?: string | number };
  };

  const type = body.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId = String(body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");

  if (type !== "payment" || !dataId) {
    return NextResponse.json({ ignored: true });
  }

  const valid = verifyWebhookSignature({
    signature: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId,
  });
  if (!valid) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  try {
    const payment = await getPayment(dataId);
    const orderId = payment.external_reference;
    if (!orderId) return NextResponse.json({ ignored: true });

    const supabase = createAdminClient();
    const { data: order } = await supabase
      .from("orders")
      .select("id, status, total")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return NextResponse.json({ ignored: true });

    if (payment.status === "approved" && order.status === "pending") {
      if (payment.transaction_amount + 0.01 < Number(order.total)) {
        console.error(`Pago ${payment.id} por monto menor al pedido ${order.id}`);
        return NextResponse.json({ error: "Monto insuficiente" });
      }
      await supabase
        .from("orders")
        .update({ status: "paid", mp_payment_id: String(payment.id) })
        .eq("id", order.id)
        .eq("status", "pending");
    } else {
      await supabase.from("orders").update({ mp_payment_id: String(payment.id) }).eq("id", order.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error procesando webhook de Mercado Pago:", err);
    // 500 => Mercado Pago reintenta la notificación
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
