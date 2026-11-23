import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/(store)/login/actions";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { requireUser } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";
import { updateProfile } from "./actions";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function AccountPage() {
  const { user, profile } = await requireUser();
  const supabase = await createClient();
  const [settings, { data: orders }] = await Promise.all([
    getSettings(),
    supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .returns<Order[]>(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mi cuenta</h1>
        <form action={signOut}>
          <button className="btn-secondary">Cerrar sesión</button>
        </form>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[320px_1fr]">
        <form action={updateProfile} className="card h-fit space-y-4 p-5">
          <h2 className="font-semibold">Mis datos</h2>
          <div>
            <p className="label">Email</p>
            <p className="text-sm text-zinc-600">{user.email}</p>
          </div>
          <div>
            <label className="label" htmlFor="full_name">Nombre</label>
            <input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Teléfono</label>
            <input id="phone" name="phone" defaultValue={profile?.phone ?? ""} className="input" />
          </div>
          <button className="btn-primary w-full">Guardar</button>
        </form>

        <section>
          <h2 className="font-semibold">Mis pedidos</h2>
          {!orders?.length ? (
            <p className="mt-4 text-sm text-zinc-500">
              Todavía no hiciste pedidos.{" "}
              <Link href="/productos" className="text-brand hover:underline">Ver productos</Link>
            </p>
          ) : (
            <ul className="card mt-4 divide-y divide-zinc-200">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/pedido/${o.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-zinc-50">
                    <div>
                      <p className="font-medium">Pedido #{o.number}</p>
                      <p className="text-sm text-zinc-500">{formatDate(o.created_at, settings.locale)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium tabular-nums">{formatPrice(o.total, settings)}</p>
                      <OrderStatusBadge status={o.status} />
                    </div>
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
