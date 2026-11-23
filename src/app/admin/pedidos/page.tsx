import Form from "next/form";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { formatDate, formatPrice, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type { Order, OrderStatus } from "@/lib/types";

const PAGE_SIZE = 25;

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/pedidos">) {
  const sp = await searchParams;
  const estado = typeof sp.estado === "string" && sp.estado in ORDER_STATUS_LABEL ? (sp.estado as OrderStatus) : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(1, Number(sp.pagina) || 1);

  const supabase = await createClient();
  let query = supabase.from("orders").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (estado) query = query.eq("status", estado);
  if (q) {
    const term = q.replace(/[%,()]/g, " ");
    query = /^\d+$/.test(q)
      ? query.eq("number", Number(q))
      : query.or(`customer_name.ilike.%${term}%,customer_email.ilike.%${term}%`);
  }
  const from = (page - 1) * PAGE_SIZE;
  const [settings, { data, count }] = await Promise.all([getSettings(), query.range(from, from + PAGE_SIZE - 1)]);
  const orders = (data ?? []) as Order[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const href = (p: number) => {
    const params = new URLSearchParams();
    if (estado) params.set("estado", estado);
    if (q) params.set("q", q);
    if (p > 1) params.set("pagina", String(p));
    return `/admin/pedidos?${params}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <Form action="/admin/pedidos" className="flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="N°, nombre o email" className="input w-52" />
          <select name="estado" defaultValue={estado ?? ""} className="input w-auto">
            <option value="">Todos los estados</option>
            {Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button className="btn-secondary">Filtrar</button>
        </Form>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 text-left text-zinc-500">
            <tr>
              <th className="p-3 font-medium">N°</th>
              <th className="p-3 font-medium">Fecha</th>
              <th className="p-3 font-medium">Cliente</th>
              <th className="p-3 font-medium">Pago</th>
              <th className="p-3 font-medium">Entrega</th>
              <th className="p-3 font-medium">Total</th>
              <th className="p-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {orders.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-zinc-500">No hay pedidos.</td></tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-zinc-50">
                <td className="p-3">
                  <Link href={`/admin/pedidos/${o.id}`} className="font-medium text-brand hover:underline">#{o.number}</Link>
                </td>
                <td className="p-3 whitespace-nowrap text-zinc-600">{formatDate(o.created_at, settings.locale)}</td>
                <td className="p-3">
                  <p>{o.customer_name}</p>
                  <p className="text-xs text-zinc-500">{o.customer_email}</p>
                </td>
                <td className="p-3 text-zinc-600">{PAYMENT_METHOD_LABEL[o.payment_method]}</td>
                <td className="p-3 text-zinc-600">{o.shipping_method === "pickup" ? "Retiro" : "Envío"}</td>
                <td className="p-3 font-medium tabular-nums">{formatPrice(o.total, settings)}</td>
                <td className="p-3"><OrderStatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2">
          {page > 1 && <Link href={href(page - 1)} className="btn-secondary">← Anterior</Link>}
          <span className="text-sm text-zinc-600">Página {page} de {totalPages}</span>
          {page < totalPages && <Link href={href(page + 1)} className="btn-secondary">Siguiente →</Link>}
        </nav>
      )}
    </div>
  );
}
