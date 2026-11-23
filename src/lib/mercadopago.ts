import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { OrderWithItems, StoreSettings } from "./types";

const MP_API = "https://api.mercadopago.com";

export function isMercadoPagoConfigured() {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

async function mpFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Mercado Pago ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

/** Crea una preferencia de Checkout Pro y devuelve la URL de pago. */
export async function createPreference(order: OrderWithItems, settings: StoreSettings) {
  const base = siteUrl();
  const orderUrl = `${base}/pedido/${order.id}`;

  const items = order.items.map((i) => ({
    id: i.variant_id ?? i.id,
    title: i.variant_name ? `${i.product_name} (${i.variant_name})` : i.product_name,
    quantity: i.quantity,
    unit_price: Number(i.unit_price),
    currency_id: settings.currency,
  }));
  if (Number(order.shipping_cost) > 0) {
    items.push({
      id: "envio",
      title: "Envío",
      quantity: 1,
      unit_price: Number(order.shipping_cost),
      currency_id: settings.currency,
    });
  }

  const isHttps = base.startsWith("https://");
  const pref = await mpFetch<{ id: string; init_point: string; sandbox_init_point: string }>(
    "/checkout/preferences",
    {
      method: "POST",
      headers: { "X-Idempotency-Key": `order-${order.id}-${Date.now()}` },
      body: JSON.stringify({
        items,
        payer: { name: order.customer_name, email: order.customer_email },
        external_reference: order.id,
        statement_descriptor: settings.name.slice(0, 22),
        back_urls: {
          success: `${orderUrl}?nuevo=1`,
          pending: `${orderUrl}?nuevo=1`,
          failure: `${orderUrl}?pago=fallido`,
        },
        // auto_return solo funciona con URLs https (no en localhost)
        ...(isHttps ? { auto_return: "approved" } : {}),
        // El webhook necesita una URL pública (en local usá un túnel tipo ngrok)
        ...(isHttps ? { notification_url: `${base}/api/webhooks/mercadopago` } : {}),
      }),
    },
  );

  return { preferenceId: pref.id, initPoint: pref.init_point };
}

export interface MpPayment {
  id: number;
  status: "approved" | "pending" | "in_process" | "rejected" | "cancelled" | "refunded" | "charged_back" | string;
  external_reference: string | null;
  transaction_amount: number;
  currency_id: string;
}

export function getPayment(id: string) {
  return mpFetch<MpPayment>(`/v1/payments/${encodeURIComponent(id)}`);
}

/**
 * Verifica la firma `x-signature` de las notificaciones de Mercado Pago.
 * https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 */
export function verifyWebhookSignature(opts: {
  signature: string | null;
  requestId: string | null;
  dataId: string;
}) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // Sin secreto configurado no se valida (no recomendado en producción)
  if (!opts.signature) return false;

  const parts = Object.fromEntries(
    opts.signature.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const id = /^[a-z0-9]+$/i.test(opts.dataId) ? opts.dataId.toLowerCase() : opts.dataId;
  let manifest = `id:${id};`;
  if (opts.requestId) manifest += `request-id:${opts.requestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
