"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { formatPrice } from "@/lib/format";
import type { ProductWithVariants, StoreSettings } from "@/lib/types";

type Money = Pick<StoreSettings, "currency" | "locale">;

/** Ejes de opciones, ej: { Talle: ["S","M"], Color: ["Blanco","Negro"] } en el orden de aparición. */
function buildAxes(product: ProductWithVariants) {
  const axes = new Map<string, string[]>();
  for (const v of product.product_variants) {
    for (const [key, value] of Object.entries(v.options ?? {})) {
      const list = axes.get(key) ?? [];
      if (!list.includes(value)) list.push(value);
      axes.set(key, list);
    }
  }
  return axes;
}

export function AddToCart({ product, money }: { product: ProductWithVariants; money: Money }) {
  const { addItem, items } = useCart();
  const variants = product.product_variants;
  const axes = useMemo(() => buildAxes(product), [product]);
  const usesOptions = axes.size > 0;

  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [selected, setSelected] = useState<Record<string, string>>(firstAvailable?.options ?? {});
  const [variantId, setVariantId] = useState<string | undefined>(firstAvailable?.id);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = usesOptions
    ? variants.find((v) => [...axes.keys()].every((k) => v.options?.[k] === selected[k]))
    : variants.find((v) => v.id === variantId);

  const price = variant ? (variant.price ?? product.base_price) : product.base_price;
  const inCart = items.find((i) => i.variantId === variant?.id)?.quantity ?? 0;
  const available = variant ? Math.max(0, variant.stock - inCart) : 0;

  /** ¿Hay alguna variante con stock compatible con esta opción + el resto de la selección? */
  const optionAvailable = (axis: string, value: string) =>
    variants.some(
      (v) =>
        v.stock > 0 &&
        v.options?.[axis] === value &&
        [...axes.keys()].every((k) => k === axis || !selected[k] || v.options?.[k] === selected[k]),
    );

  function handleAdd() {
    if (!variant || available <= 0) return;
    addItem({
      variantId: variant.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      variantName: variant.name === "Única" ? null : variant.name,
      price,
      image: product.images[0] ?? null,
      quantity: Math.min(quantity, available),
      maxStock: variant.stock,
    });
    setQuantity(1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-semibold">{formatPrice(price, money)}</span>
        {product.compare_at_price && product.compare_at_price > price && (
          <span className="text-lg text-zinc-400 line-through">
            {formatPrice(product.compare_at_price, money)}
          </span>
        )}
      </div>

      {usesOptions &&
        [...axes.entries()].map(([axis, values]) => (
          <fieldset key={axis}>
            <legend className="label">
              {axis}: <span className="font-normal text-zinc-500">{selected[axis] ?? "Elegí una opción"}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {values.map((value) => {
                const isSelected = selected[axis] === value;
                const ok = optionAvailable(axis, value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelected((s) => ({ ...s, [axis]: value }))}
                    className={`min-w-12 rounded-lg border px-3 py-2 text-sm transition ${
                      isSelected
                        ? "border-brand bg-brand text-white"
                        : "border-zinc-300 bg-white hover:border-zinc-500"
                    } ${ok ? "" : "opacity-40 line-through"}`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

      {!usesOptions && variants.length > 1 && (
        <fieldset>
          <legend className="label">Opción</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVariantId(v.id)}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  v.id === variantId ? "border-brand bg-brand text-white" : "border-zinc-300 hover:border-zinc-500"
                } ${v.stock > 0 ? "" : "opacity-40 line-through"}`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <p className="text-sm">
        {!variant ? (
          <span className="text-zinc-500">Esta combinación no está disponible.</span>
        ) : variant.stock === 0 ? (
          <span className="font-medium text-red-600">Sin stock</span>
        ) : variant.stock <= 5 ? (
          <span className="font-medium text-amber-600">¡Últimas {variant.stock} unidades!</span>
        ) : (
          <span className="text-emerald-700">En stock</span>
        )}
      </p>

      <div className="flex gap-3">
        <div className="flex items-center rounded-lg border border-zinc-300">
          <button
            type="button"
            className="px-3 py-2.5 text-lg leading-none disabled:opacity-30"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Restar"
          >
            −
          </button>
          <span className="w-8 text-center text-sm tabular-nums">{quantity}</span>
          <button
            type="button"
            className="px-3 py-2.5 text-lg leading-none disabled:opacity-30"
            onClick={() => setQuantity((q) => Math.min(available || 1, q + 1))}
            disabled={quantity >= available}
            aria-label="Sumar"
          >
            +
          </button>
        </div>
        <button type="button" onClick={handleAdd} disabled={!variant || available <= 0} className="btn-primary flex-1">
          {variant && variant.stock > 0 && available <= 0 ? "Ya tenés todo el stock en el carrito" : "Agregar al carrito"}
        </button>
      </div>

      {added && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>✓ Producto agregado</span>
          <Link href="/carrito" className="font-medium underline">
            Ver carrito
          </Link>
        </div>
      )}
    </div>
  );
}
