"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createPreference, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { getOrderById } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface CheckoutState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

const itemsSchema = z
  .array(z.object({ variant_id: z.uuid(), quantity: z.number().int().min(1).max(999) }))
  .min(1, "El carrito está vacío")
  .max(100);

const schema = z
  .object({
    customer_name: z.string().trim().min(2, "Ingresá tu nombre").max(120),
    customer_email: z.email("Email inválido").max(200),
    customer_phone: z.string().trim().min(6, "Ingresá un teléfono").max(40),
    shipping_method: z.enum(["delivery", "pickup"], { error: "Elegí un método de entrega" }),
    address: z.string().trim().max(200).optional(),
    city: z.string().trim().max(100).optional(),
    province: z.string().trim().max(100).optional(),
    zip: z.string().trim().max(20).optional(),
    notes: z.string().trim().max(1000).optional(),
    payment_method: z.enum(["transfer", "cash", "mercadopago"], { error: "Elegí un medio de pago" }),
  })
  .superRefine((d, ctx) => {
    if (d.shipping_method === "delivery") {
      if (!d.address) ctx.addIssue({ code: "custom", path: ["address"], message: "Ingresá la dirección" });
      if (!d.city) ctx.addIssue({ code: "custom", path: ["city"], message: "Ingresá la ciudad" });
    }
  });

export async function createOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const raw = Object.fromEntries(
    [...formData.entries()].filter(([k]) => k !== "items").map(([k, v]) => [k, String(v)]),
  );
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Revisá los datos del formulario.", fieldErrors };
  }

  let items: z.infer<typeof itemsSchema>;
  try {
    items = itemsSchema.parse(JSON.parse(String(formData.get("items") ?? "[]")));
  } catch {
    return { error: "El carrito está vacío o es inválido." };
  }

  if (parsed.data.payment_method === "mercadopago" && !isMercadoPagoConfigured()) {
    return { error: "Mercado Pago no está configurado. Elegí otro medio de pago." };
  }

  const supabase = await createClient();
  const { data: orderId, error } = await supabase.rpc("create_order", {
    payload: { ...parsed.data, items },
  });

  if (error || !orderId) {
    console.error("create_order:", error);
    // P0001 = excepciones propias de create_order (mensajes pensados para el cliente)
    return {
      error: error?.code === "P0001" ? error.message : "No pudimos crear el pedido. Intentá nuevamente.",
    };
  }

  if (parsed.data.payment_method === "mercadopago") {
    const url = await startMercadoPagoPayment(orderId as string);
    if (url) redirect(url);
  }

  redirect(`/pedido/${orderId}?nuevo=1`);
}

/** Crea la preferencia de MP para un pedido pendiente y devuelve la URL de pago. */
async function startMercadoPagoPayment(orderId: string): Promise<string | null> {
  const [order, settings] = await Promise.all([getOrderById(orderId), getSettings()]);
  if (!order || order.status !== "pending" || order.payment_method !== "mercadopago") return null;
  try {
    const { preferenceId, initPoint } = await createPreference(order, settings);
    if (process.env.SUPABASE_SECRET_KEY) {
      await createAdminClient().from("orders").update({ mp_preference_id: preferenceId }).eq("id", orderId);
    }
    return initPoint;
  } catch (err) {
    console.error("Mercado Pago:", err);
    return null;
  }
}

/** Botón "Pagar con Mercado Pago" en la página del pedido (reintentos). */
export async function payOrderWithMercadoPago(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "");
  const url = await startMercadoPagoPayment(orderId);
  redirect(url ?? `/pedido/${orderId}?pago=error`);
}
