import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { getCategories, getProducts, PAGE_SIZE, type ProductSort } from "@/lib/data";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Productos" };

const SORTS: { value: ProductSort; label: string }[] = [
  { value: "recientes", label: "Más recientes" },
  { value: "precio-asc", label: "Menor precio" },
  { value: "precio-desc", label: "Mayor precio" },
  { value: "nombre", label: "Nombre (A-Z)" },
];

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ProductsPage({ searchParams }: PageProps<"/productos">) {
  const sp = await searchParams;
  const category = first(sp.categoria);
  const q = first(sp.q)?.trim();
  const sortParam = first(sp.orden);
  const sort = SORTS.some((s) => s.value === sortParam) ? (sortParam as ProductSort) : "recientes";
  const page = Math.max(1, Number(first(sp.pagina)) || 1);

  const [settings, categories, { products, total }] = await Promise.all([
    getSettings(),
    getCategories(),
    getProducts({ category, q, sort, page }),
  ]);

  const current = categories.find((c) => c.slug === category);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (category) params.set("categoria", category);
    if (q) params.set("q", q);
    if (sort !== "recientes") params.set("orden", sort);
    if (p > 1) params.set("pagina", String(p));
    const s = params.toString();
    return `/productos${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {q ? `Resultados para “${q}”` : (current?.name ?? "Todos los productos")}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} {total === 1 ? "producto" : "productos"}
          </p>
        </div>
        <Form action="/productos" className="flex flex-wrap items-center gap-2">
          {q && <input type="hidden" name="q" value={q} />}
          <select name="categoria" defaultValue={category ?? ""} className="input w-auto">
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="orden" defaultValue={sort} className="input w-auto">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button className="btn-secondary">Aplicar</button>
        </Form>
      </div>

      {products.length === 0 ? (
        <div className="py-20 text-center text-zinc-500">
          <p>No encontramos productos.</p>
          <Link href="/productos" className="mt-2 inline-block text-brand hover:underline">
            Ver todos los productos
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} settings={settings} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Paginación">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="btn-secondary">
              ← Anterior
            </Link>
          )}
          <span className="px-3 text-sm text-zinc-600">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <Link href={pageHref(page + 1)} className="btn-secondary">
              Siguiente →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
