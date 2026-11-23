"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createOrder, type CheckoutState } from "@/app/(store)/checkout/actions";
import { useCart } from "@/components/cart/CartProvider";
import { formatPrice, PAYMENT_METHOD_LABEL } from "@/lib/format";
import type { PaymentMethod, ShippingMethod, StoreSettings } from "@/lib/types";

interface Props {
  settings: StoreSettings;
  mpAvailable: boolean;
  defaults: { name: string; email: string; phone: string };
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs text-red-600">{msg}</p> : null;
}

export function CheckoutForm({ settings, mpAvailable, defaults }: Props) {
  const { items, subtotal, ready } = useCart();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(createOrder, {});

  const shippingOptions: ShippingMethod[] = [
    ...(settings.delivery_enabled ? (["delivery"] as const) : []),
    ...(settings.pickup_enabled ? (["pickup"] as const) : []),
  ];
  const paymentOptions: PaymentMethod[] = [
    ...(mpAvailable ? (["mercadopago"] as const) : []),
    ...(settings.transfer_enabled ? (["transfer"] as const) : []),
    ...(settings.cash_enabled ? (["cash"] as const) : []),
  ];

  const [shipping, setShipping] = useState<ShippingMethod | undefined>(shippingOptions[0]);
  const [payment, setPayment] = useState<PaymentMethod | undefined>(paymentOptions[0]);

  const shippingCost =
    shipping === "delivery"
      ? settings.free_shipping_threshold !== null && subtotal >= settings.free_shipping_threshold
        ? 0
        : settings.shipping_cost
      : 0;
  const total = subtotal + shippingCost;
  const fe = state.fieldErrors ?? {};

  if (!ready) return <div className="mt-8 h-64 animate-pulse rounded-xl bg-zinc-100" />;

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-zinc-500">Tu carrito está vacío.</p>
        <Link href="/productos" className="btn-primary mt-4">
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })))}
      />

      <div className="space-y-8">
        <section className="card space-y-4 p-5">
          <h2 className="font-semibold">Tus datos</h2>
          <div>
            <label className="label" htmlFor="customer_name">Nombre y apellido</label>
            <input id="customer_name" name="customer_name" defaultValue={defaults.name} className="input" required autoComplete="name" />
            <FieldError msg={fe.customer_name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="customer_email">Email</label>
              <input id="customer_email" name="customer_email" type="email" defaultValue={defaults.email} className="input" required autoComplete="email" />
              <FieldError msg={fe.customer_email} />
            </div>
            <div>
              <label className="label" htmlFor="customer_phone">Teléfono</label>
              <input id="customer_phone" name="customer_phone" type="tel" defaultValue={defaults.phone} className="input" required autoComplete="tel" />
              <FieldError msg={fe.customer_phone} />
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-semibold">Entrega</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {shippingOptions.map((opt) => (
              <label
                key={opt}
                className={`cursor-pointer rounded-lg border p-4 text-sm transition ${
                  shipping === opt ? "border-brand ring-2 ring-brand/20" : "border-zinc-300"
                }`}
              >
                <input
                  type="radio"
                  name="shipping_method"
                  value={opt}
                  checked={shipping === opt}
                  onChange={() => setShipping(opt)}
                  className="sr-only"
                />
                <span className="block font-medium">
                  {opt === "delivery" ? "Envío a domicilio" : "Retiro en el local"}
                </span>
                <span className="text-zinc-500">
                  {opt === "delivery"
                    ? shippingCost === 0 && shipping === "delivery"
                      ? "Gratis"
                      : formatPrice(settings.shipping_cost, settings)
                    : (settings.pickup_address ?? "Sin cargo")}
                </span>
              </label>
            ))}
          </div>
          <FieldError msg={fe.shipping_method} />

          {shipping === "delivery" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="address">Dirección (calle, número, piso/depto)</label>
                <input id="address" name="address" className="input" autoComplete="street-address" />
                <FieldError msg={fe.address} />
              </div>
              <div>
                <label className="label" htmlFor="city">Ciudad</label>
                <input id="city" name="city" className="input" autoComplete="address-level2" />
                <FieldError msg={fe.city} />
              </div>
              <div>
                <label className="label" htmlFor="province">Provincia</label>
                <input id="province" name="province" className="input" autoComplete="address-level1" />
              </div>
              <div>
                <label className="label" htmlFor="zip">Código postal</label>
                <input id="zip" name="zip" className="input" autoComplete="postal-code" />
              </div>
            </div>
          )}

          <div>
            <label className="label" htmlFor="notes">Notas (opcional)</label>
            <textarea id="notes" name="notes" rows={3} className="input" placeholder="Horarios de entrega, aclaraciones, etc." />
          </div>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Medio de pago</h2>
          {paymentOptions.length === 0 && (
            <p className="text-sm text-red-600">No hay medios de pago habilitados.</p>
          )}
          {paymentOptions.map((opt) => (
            <label
              key={opt}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-sm transition ${
                payment === opt ? "border-brand ring-2 ring-brand/20" : "border-zinc-300"
              }`}
            >
              <input
                type="radio"
                name="payment_method"
                value={opt}
                checked={payment === opt}
                onChange={() => setPayment(opt)}
                className="mt-0.5 accent-[var(--brand)]"
              />
              <span>
                <span className="block font-medium">{PAYMENT_METHOD_LABEL[opt]}</span>
                <span className="text-zinc-500">
                  {opt === "mercadopago" && "Tarjetas de crédito, débito y dinero en cuenta."}
                  {opt === "transfer" && "Te mostramos los datos bancarios al confirmar el pedido."}
                  {opt === "cash" && "Pagás al retirar o coordinamos por WhatsApp."}
                </span>
              </span>
            </label>
          ))}
          <FieldError msg={fe.payment_method} />
        </section>
      </div>

      <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-32">
        <h2 className="font-semibold">Resumen</h2>
        <ul className="space-y-2 text-sm">
          {items.map((i) => (
            <li key={i.variantId} className="flex justify-between gap-4">
              <span className="text-zinc-700">
                {i.quantity} × {i.name}
                {i.variantName && <span className="text-zinc-500"> ({i.variantName})</span>}
              </span>
              <span className="tabular-nums">{formatPrice(i.price * i.quantity, settings)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-zinc-200 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-600">Subtotal</span>
            <span className="tabular-nums">{formatPrice(subtotal, settings)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Envío</span>
            <span className="tabular-nums">{shippingCost === 0 ? "Gratis" : formatPrice(shippingCost, settings)}</span>
          </div>
          <div className="flex justify-between pt-2 text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatPrice(total, settings)}</span>
          </div>
        </div>

        {state.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={pending || paymentOptions.length === 0}>
          {pending ? "Procesando…" : payment === "mercadopago" ? "Ir a pagar" : "Confirmar pedido"}
        </button>
        <p className="text-xs text-zinc-500">Los precios y el stock se confirman al crear el pedido.</p>
      </aside>
    </form>
  );
}
