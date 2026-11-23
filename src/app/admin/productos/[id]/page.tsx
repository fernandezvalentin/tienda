import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProduct } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ProductForm } from "@/components/admin/ProductForm";
import { getSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type { Category, ProductWithVariants } from "@/lib/types";

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/productos/[id]">) {
  const { id } = await params;
  const { creado } = await searchParams;
  const supabase = await createClient();
  const [{ data: product }, { data: categories }, settings] = await Promise.all([
    supabase.from("products").select("*, product_variants(*)").eq("id", id).maybeSingle(),
    supabase.from("categories").select("*").order("position"),
    getSettings(),
  ]);
  if (!product) notFound();

  const p = product as ProductWithVariants;
  p.product_variants.sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{p.name}</h1>
        <div className="flex gap-2">
          {p.active && (
            <Link href={`/productos/${p.slug}`} target="_blank" className="btn-secondary">Ver en tienda ↗</Link>
          )}
          <form action={deleteProduct}>
            <input type="hidden" name="id" value={p.id} />
            <ConfirmButton className="btn-danger" message="¿Eliminar este producto? No se puede deshacer.">Eliminar</ConfirmButton>
          </form>
        </div>
      </div>
      {creado && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Producto creado ✓</p>}
      <ProductForm product={p} categories={(categories ?? []) as Category[]} currency={settings.currency} />
    </div>
  );
}
