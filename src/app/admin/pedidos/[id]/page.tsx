import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { formatDate, formatPrice, PAYMENT_METHOD_LABEL, whatsappLink } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type { OrderItem, OrderWithItems } from "@/lib/types";

export default async function AdminOrderPage({ params }: PageProps<"/admin/pedidos/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [settings, { data }] = await Promise.all([
    getSettings(),
    supabase.from("orders").select("*, items:order_items(*)").eq("id", id).maybeSingle(),
  ]);
  if (!data) notFound();
  const order = data as OrderWithItems & { mp_payment_id: string | null };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/pedidos" className="text-sm text-zinc-500 hover:underline">← Pedidos</Link>
        <h1 className="text-2xl font-semibold">Pedido #{order.number}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="card">
            <ul className="divide-y divide-zinc-100">
              {order.items.map((i: OrderItem) => (
                <li key={i.id} className="flex justify-between gap-4 p-4 text-sm">
                  <div>
                    <p className="font-medium">{i.product_name}</p>
                    <p className="text-zinc-500">
                      {i.variant_name && `${i.variant_name} · `}
                      {i.quantity} × {formatPrice(i.unit_price, settings)}
                    </p>
                  </div>
                  <p className="font-medium tabular-nums">{formatPrice(i.unit_price * i.quantity, settings)}</p>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t border-zinc-200 p-4 text-sm">
              <div className="flex justify-between"><span className="text-zinc-600">Subtotal</span><span>{formatPrice(order.subtotal, settings)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-600">Envío</span><span>{formatPrice(order.shipping_cost, settings)}</span></div>
              <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatPrice(order.total, settings)}</span></div>
            </div>
          </section>

          <section className="card grid gap-4 p-5 text-sm sm:grid-cols-2">
            <div>
              <h2 className="mb-2 font-semibold">Cliente</h2>
              <p>{order.customer_name}</p>
              <p><a href={`mailto:${order.customer_email}`} className="text-brand hover:underline">{order.customer_email}</a></p>
              {order.customer_phone && (
                <p>
                  {order.customer_phone}{" "}
                  <a href={whatsappLink(order.customer_phone)} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">
                    (WhatsApp)
                  </a>
                </p>
              )}
            </div>
            <div>
              <h2 className="mb-2 font-semibold">Entrega</h2>
              {order.shipping_method === "pickup" ? (
                <p>Retiro en el local</p>
              ) : (
                <>
                  <p>{order.address}</p>
                  <p>{[order.city, order.province, order.zip].filter(Boolean).join(", ")}</p>
                </>
              )}
            </div>
            {order.notes && (
              <div className="sm:col-span-2">
                <h2 className="mb-1 font-semibold">Notas</h2>
                <p className="whitespace-pre-line text-zinc-700">{order.notes}</p>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card space-y-3 p-5 text-sm">
            <h2 className="font-semibold">Estado</h2>
            <OrderStatusForm id={order.id} status={order.status} />
          </section>
          <section className="card space-y-2 p-5 text-sm">
            <h2 className="font-semibold">Pago</h2>
            <p>{PAYMENT_METHOD_LABEL[order.payment_method]}</p>
            {order.mp_payment_id && <p className="text-zinc-500">ID de pago MP: {order.mp_payment_id}</p>}
            {order.paid_at && <p className="text-zinc-500">Pagado: {formatDate(order.paid_at, settings.locale)}</p>}
            <p className="text-zinc-500">Creado: {formatDate(order.created_at, settings.locale)}</p>
            <Link href={`/pedido/${order.id}`} target="_blank" className="block text-brand hover:underline">
              Ver página del cliente ↗
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
