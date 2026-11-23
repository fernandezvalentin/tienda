import Link from "next/link";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { formatDate, formatPrice } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [settings, pendingRes, monthRes, recentRes, lowStockRes, productsRes] = await Promise.all([
    getSettings(),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("orders")
      .select("total")
      .in("status", ["paid", "preparing", "shipped", "delivered"])
      .gte("created_at", monthStart.toISOString()),
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(8),
    supabase
      .from("product_variants")
      .select("id, name, stock, products(id, name)")
      .eq("active", true)
      .lte("stock", 3)
      .order("stock")
      .limit(10),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("active", true),
  ]);

  const monthSales = (monthRes.data ?? []).reduce((acc, o) => acc + Number(o.total), 0);
  const recent = (recentRes.data ?? []) as Order[];
  const lowStock = (lowStockRes.data ?? []) as unknown as {
    id: string;
    name: string;
    stock: number;
    products: { id: string; name: string } | null;
  }[];

  const stats = [
    { label: "Ventas del mes", value: formatPrice(monthSales, settings) },
    { label: "Pedidos del mes", value: String(monthRes.data?.length ?? 0) },
    { label: "Pendientes de pago", value: String(pendingRes.count ?? 0), href: "/admin/pedidos?estado=pending" },
    { label: "Productos activos", value: String(productsRes.count ?? 0), href: "/admin/productos" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Resumen</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const content = (
            <>
              <p className="text-sm text-zinc-500">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="card p-5 hover:border-brand">{content}</Link>
          ) : (
            <div key={s.label} className="card p-5">{content}</div>
          );
        })}
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
        <section className="card">
          <div className="flex items-center justify-between border-b border-zinc-200 p-4">
            <h2 className="font-semibold">Últimos pedidos</h2>
            <Link href="/admin/pedidos" className="text-sm text-brand hover:underline">Ver todos</Link>
          </div>
          {recent.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">Todavía no hay pedidos.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/pedidos/${o.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-zinc-50">
                    <div>
                      <p className="text-sm font-medium">#{o.number} · {o.customer_name}</p>
                      <p className="text-xs text-zinc-500">{formatDate(o.created_at, settings.locale)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums">{formatPrice(o.total, settings)}</p>
                      <OrderStatusBadge status={o.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card h-fit">
          <h2 className="border-b border-zinc-200 p-4 font-semibold">Stock bajo</h2>
          {lowStock.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">Todo en orden 👌</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {lowStock.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/admin/productos/${v.products?.id}`}
                    className="flex items-center justify-between gap-4 p-4 text-sm hover:bg-zinc-50"
                  >
                    <span>
                      {v.products?.name}
                      {v.name !== "Única" && <span className="text-zinc-500"> · {v.name}</span>}
                    </span>
                    <span className={`font-medium ${v.stock === 0 ? "text-red-600" : "text-amber-600"}`}>
                      {v.stock}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
