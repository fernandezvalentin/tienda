import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type { ProductWithVariants } from "@/lib/types";

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/productos">) {
  const { q } = await searchParams;
  const term = typeof q === "string" ? q.trim() : "";
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("*, product_variants(id, stock, active), categories(name, slug)")
    .order("created_at", { ascending: false });
  if (term) query = query.ilike("name", `%${term.replace(/[%,]/g, " ")}%`);

  const [settings, { data }] = await Promise.all([getSettings(), query]);
  const products = (data ?? []) as ProductWithVariants[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <div className="flex gap-2">
          <Form action="/admin/productos">
            <input name="q" defaultValue={term} placeholder="Buscar…" className="input w-48" />
          </Form>
          <Link href="/admin/productos/nuevo" className="btn-primary">+ Nuevo producto</Link>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 text-left text-zinc-500">
            <tr>
              <th className="p-3 font-medium">Producto</th>
              <th className="p-3 font-medium">Categoría</th>
              <th className="p-3 font-medium">Precio</th>
              <th className="p-3 font-medium">Stock</th>
              <th className="p-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-zinc-500">No hay productos.</td>
              </tr>
            )}
            {products.map((p) => {
              const stock = p.product_variants.filter((v) => v.active).reduce((a, v) => a + v.stock, 0);
              return (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="p-3">
                    <Link href={`/admin/productos/${p.id}`} className="flex items-center gap-3">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                        {p.images[0] && <Image src={p.images[0]} alt="" fill sizes="40px" className="object-cover" />}
                      </div>
                      <span className="font-medium hover:underline">{p.name}</span>
                      {p.featured && <span title="Destacado">⭐</span>}
                    </Link>
                  </td>
                  <td className="p-3 text-zinc-600">{p.categories?.name ?? "—"}</td>
                  <td className="p-3 tabular-nums">{formatPrice(p.base_price, settings)}</td>
                  <td className={`p-3 tabular-nums ${stock === 0 ? "text-red-600" : ""}`}>
                    {stock}
                    <span className="text-zinc-400"> · {p.product_variants.length} var.</span>
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${p.active ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"}`}>
                      {p.active ? "Activo" : "Oculto"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
