"use client";

import { useState, useTransition } from "react";
import { saveProduct, type ProductInput } from "@/app/admin/actions";
import type { Category, ProductWithVariants } from "@/lib/types";
import { ImageUploader } from "./ImageUploader";

interface VariantRow {
  key: string;
  id?: string;
  name: string;
  options: Record<string, string>;
  price: string;
  stock: string;
  sku: string;
  active: boolean;
}

interface OptionAxis {
  name: string;
  values: string;
}

const uid = () => Math.random().toString(36).slice(2);

function toRows(p?: ProductWithVariants): VariantRow[] {
  if (!p?.product_variants.length) {
    return [{ key: uid(), name: "Única", options: {}, price: "", stock: "0", sku: "", active: true }];
  }
  return p.product_variants.map((v) => ({
    key: v.id,
    id: v.id,
    name: v.name,
    options: v.options ?? {},
    price: v.price === null ? "" : String(v.price),
    stock: String(v.stock),
    sku: v.sku ?? "",
    active: v.active,
  }));
}

function toAxes(p?: ProductWithVariants): OptionAxis[] {
  const axes = new Map<string, string[]>();
  for (const v of p?.product_variants ?? []) {
    for (const [k, val] of Object.entries(v.options ?? {})) {
      const list = axes.get(k) ?? [];
      if (!list.includes(val)) list.push(val);
      axes.set(k, list);
    }
  }
  return [...axes.entries()].map(([name, values]) => ({ name, values: values.join(", ") }));
}

function cartesian(axes: { name: string; values: string[] }[]): Record<string, string>[] {
  return axes.reduce<Record<string, string>[]>(
    (acc, axis) => acc.flatMap((combo) => axis.values.map((v) => ({ ...combo, [axis.name]: v }))),
    [{}],
  );
}

export function ProductForm({
  product,
  categories,
  currency,
}: {
  product?: ProductWithVariants;
  categories: Category[];
  currency: string;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [basePrice, setBasePrice] = useState(product ? String(product.base_price) : "");
  const [comparePrice, setComparePrice] = useState(
    product?.compare_at_price != null ? String(product.compare_at_price) : "",
  );
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [active, setActive] = useState(product?.active ?? true);
  const [axes, setAxes] = useState<OptionAxis[]>(toAxes(product));
  const [rows, setRows] = useState<VariantRow[]>(toRows(product));

  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null);

  function updateRow(key: string, patch: Partial<VariantRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  /** Genera las combinaciones de opciones conservando precio/stock de las variantes existentes. */
  function generateVariants() {
    const clean = axes
      .map((a) => ({
        name: a.name.trim(),
        values: a.values.split(",").map((v) => v.trim()).filter(Boolean),
      }))
      .filter((a) => a.name && a.values.length);

    if (!clean.length) {
      setRows((rs) => [rs.find((r) => !Object.keys(r.options).length) ?? { ...rs[0], name: "Única", options: {} }]);
      return;
    }

    const combos = cartesian(clean);
    setRows((prev) =>
      combos.map((options) => {
        const match = prev.find(
          (r) =>
            Object.keys(r.options).length === Object.keys(options).length &&
            Object.entries(options).every(([k, v]) => r.options[k] === v),
        );
        const name = Object.values(options).join(" / ");
        return match
          ? { ...match, name, options }
          : { key: uid(), name, options, price: "", stock: "0", sku: "", active: true };
      }),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    const payload: ProductInput = {
      id: product?.id,
      name,
      slug,
      description,
      category_id: categoryId || null,
      images,
      base_price: basePrice,
      compare_at_price: comparePrice,
      featured,
      active,
      variants: rows.map((r) => ({
        id: r.id,
        name: r.name,
        options: r.options,
        price: r.price,
        stock: r.stock,
        sku: r.sku,
        active: r.active,
      })),
    };
    startTransition(async () => {
      const res = await saveProduct(payload);
      if (res?.variantIds) {
        const ids = res.variantIds;
        setRows((rs) => rs.map((r, i) => ({ ...r, id: ids[i] ?? r.id })));
      }
      setResult(res ?? { ok: true });
    });
  }

  const totalStock = rows.filter((r) => r.active).reduce((a, r) => a + (Number(r.stock) || 0), 0);

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section className="card space-y-4 p-5">
          <div>
            <label className="label" htmlFor="name">Nombre</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="slug">URL (slug)</label>
            <input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="input"
              placeholder="Se genera a partir del nombre"
            />
          </div>
          <div>
            <label className="label" htmlFor="description">Descripción</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="input"
            />
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-semibold">Imágenes</h2>
          <ImageUploader images={images} onChange={setImages} />
        </section>

        <section className="card space-y-4 p-5">
          <div>
            <h2 className="font-semibold">Variantes</h2>
            <p className="text-sm text-zinc-500">
              Definí opciones como Talle o Color (valores separados por coma) y generá las combinaciones.
              Si el producto no tiene opciones, dejalo con una sola variante “Única”.
            </p>
          </div>

          <div className="space-y-2">
            {axes.map((axis, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={axis.name}
                  onChange={(e) => setAxes((a) => a.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))}
                  placeholder="Opción (ej: Talle)"
                  className="input w-40"
                />
                <input
                  value={axis.values}
                  onChange={(e) => setAxes((a) => a.map((x, k) => (k === i ? { ...x, values: e.target.value } : x)))}
                  placeholder="Valores (ej: S, M, L, XL)"
                  className="input"
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAxes((a) => a.filter((_, k) => k !== i))}
                  aria-label="Quitar opción"
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {axes.length < 3 && (
                <button type="button" className="btn-secondary" onClick={() => setAxes((a) => [...a, { name: "", values: "" }])}>
                  + Agregar opción
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={generateVariants}>
                ↻ Generar variantes
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-zinc-500">
                <tr>
                  <th className="py-2 pr-2 font-medium">Variante</th>
                  <th className="py-2 pr-2 font-medium">Precio ({currency})</th>
                  <th className="py-2 pr-2 font-medium">Stock</th>
                  <th className="py-2 pr-2 font-medium">SKU</th>
                  <th className="py-2 font-medium">Activa</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-t border-zinc-100">
                    <td className="py-2 pr-2 font-medium whitespace-nowrap">{r.name}</td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={r.price}
                        onChange={(e) => updateRow(r.key, { price: e.target.value })}
                        placeholder={basePrice || "Base"}
                        className="input w-28"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        step="1"
                        value={r.stock}
                        onChange={(e) => updateRow(r.key, { stock: e.target.value })}
                        className="input w-20"
                        required
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input value={r.sku} onChange={(e) => updateRow(r.key, { sku: e.target.value })} className="input w-28" />
                    </td>
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={r.active}
                        onChange={(e) => updateRow(r.key, { active: e.target.checked })}
                        className="size-4 accent-[var(--brand)]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-zinc-500">
              Precio vacío = usa el precio base. Stock total: {totalStock}
            </p>
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="card space-y-4 p-5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-[var(--brand)]" />
            Visible en la tienda
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-4 accent-[var(--brand)]" />
            Destacado en la portada
          </label>
          <div>
            <label className="label" htmlFor="category">Categoría</label>
            <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="base_price">Precio base ({currency})</label>
            <input
              id="base_price"
              type="number"
              min={0}
              step="0.01"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="compare">Precio anterior (tachado)</label>
            <input
              id="compare"
              type="number"
              min={0}
              step="0.01"
              value={comparePrice}
              onChange={(e) => setComparePrice(e.target.value)}
              className="input"
              placeholder="Opcional"
            />
          </div>
        </section>

        {result?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{result.error}</p>}
        {result?.ok && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Cambios guardados ✓</p>}

        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Guardando…" : product ? "Guardar cambios" : "Crear producto"}
        </button>
      </aside>
    </form>
  );
}
