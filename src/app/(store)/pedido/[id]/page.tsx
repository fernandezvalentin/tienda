import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { payOrderWithMercadoPago } from "@/app/(store)/checkout/actions";
import { ClearCartOnMount } from "@/components/cart/ClearCartOnMount";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { formatDate, formatPrice, PAYMENT_METHOD_LABEL, whatsappLink } from "@/lib/format";
import { getOrderById } from "@/lib/orders";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Tu pedido", robots: { index: false } };

export default async function OrderPage({ params, searchParams }: PageProps<"/pedido/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const [order, settings] = await Promise.all([getOrderById(id), getSettings()]);
  if (!order) notFound();

  const isNew = sp.nuevo === "1";
  const payFailed = sp.pago === "fallido" || sp.pago === "error";
  const pending = order.status === "pending";

  const summary = [
    `Hola! Hice el pedido #${order.number} en ${settings.name}.`,
    ...order.items.map(
      (i) => `• ${i.quantity} × ${i.product_name}${i.variant_name ? ` (${i.variant_name})` : ""}`,
    ),
    `Total: ${formatPrice(order.total, settings)}`,
    `Pago: ${PAYMENT_METHOD_LABEL[order.payment_method]}`,
  ].join("\n");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {isNew && <ClearCartOnMount />}

      <div className="text-center">
        {isNew && <p className="text-4xl">🎉</p>}
        <h1 className="mt-2 text-2xl font-semibold">
          {isNew ? "¡Gracias por tu compra!" : `Pedido #${order.number}`}
        </h1>
        <p className="mt-1 text-zinc-600">
          {isNew && <>Tu número de pedido es <strong>#{order.number}</strong>. </>}
          Guardá esta página para consultar el estado.
        </p>
        <div className="mt-3">
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      {payFailed && pending && (
        <p className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          El pago no se completó. Podés intentarlo nuevamente.
        </p>
      )}

      {pending && order.payment_method === "mercadopago" && (
        <form action={payOrderWithMercadoPago} className="card mt-6 p-5 text-center">
          <input type="hidden" name="order_id" value={order.id} />
          <p className="text-sm text-zinc-600">
            Si ya pagaste, el estado se actualizará en unos minutos. Si no, podés pagar ahora:
          </p>
          <button className="btn-primary mt-3">Pagar con Mercado Pago</button>
        </form>
      )}

      {pending && order.payment_method === "transfer" && settings.bank_transfer_info && (
        <div className="card mt-6 p-5">
          <h2 className="font-semibold">Datos para la transferencia</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Transferí <strong>{formatPrice(order.total, settings)}</strong> y envianos el comprobante.
          </p>
          <pre className="mt-3 rounded-lg bg-zinc-50 p-4 font-sans text-sm whitespace-pre-wrap">
            {settings.bank_transfer_info}
          </pre>
        </div>
      )}

      {settings.whatsapp && (
        <div className="mt-6 text-center">
          <a
            href={whatsappLink(settings.whatsapp, summary)}
            target="_blank"
            rel="noreferrer"
            className="btn bg-[#25D366] text-white hover:brightness-105"
          >
            {pending && order.payment_method !== "mercadopago"
              ? "Enviar comprobante / coordinar por WhatsApp"
              : "Consultar por WhatsApp"}
          </a>
        </div>
      )}

      <div className="card mt-8 divide-y divide-zinc-200">
        <ul className="divide-y divide-zinc-100">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 p-4">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                {i.image_url && <Image src={i.image_url} alt="" fill sizes="56px" className="object-cover" />}
              </div>
              <div className="flex-1 text-sm">
                <p className="font-medium">{i.product_name}</p>
                <p className="text-zinc-500">
                  {i.variant_name && `${i.variant_name} · `}
                  {i.quantity} × {formatPrice(i.unit_price, settings)}
                </p>
              </div>
              <p className="text-sm font-medium tabular-nums">{formatPrice(i.unit_price * i.quantity, settings)}</p>
            </li>
          ))}
        </ul>
        <div className="space-y-1 p-4 text-sm">
          <div className="flex justify-between"><span className="text-zinc-600">Subtotal</span><span>{formatPrice(order.subtotal, settings)}</span></div>
          <div className="flex justify-between"><span className="text-zinc-600">Envío</span><span>{order.shipping_cost > 0 ? formatPrice(order.shipping_cost, settings) : "Gratis"}</span></div>
          <div className="flex justify-between pt-1 text-base font-semibold"><span>Total</span><span>{formatPrice(order.total, settings)}</span></div>
        </div>
        <dl className="grid gap-4 p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Fecha</dt>
            <dd>{formatDate(order.created_at, settings.locale)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Medio de pago</dt>
            <dd>{PAYMENT_METHOD_LABEL[order.payment_method]}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Entrega</dt>
            <dd>
              {order.shipping_method === "pickup"
                ? `Retiro en el local${settings.pickup_address ? ` — ${settings.pickup_address}` : ""}`
                : [order.address, order.city, order.province, order.zip].filter(Boolean).join(", ")}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 text-center">
        <Link href="/productos" className="text-sm font-medium text-brand hover:underline">
          Seguir comprando
        </Link>
      </div>
    </div>
  );
}
