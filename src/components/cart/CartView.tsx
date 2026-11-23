"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { StoreSettings } from "@/lib/types";
import { useCart } from "./CartProvider";

type Money = Pick<StoreSettings, "currency" | "locale">;

export function CartView({
  money,
  freeShippingThreshold,
}: {
  money: Money;
  freeShippingThreshold: number | null;
}) {
  const { items, subtotal, updateQuantity, removeItem, ready } = useCart();

  if (!ready) return <div className="mt-8 h-40 animate-pulse rounded-xl bg-zinc-100" />;

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-zinc-500">Tu carrito está vacío.</p>
        <Link href="/productos" className="btn-primary mt-4">
          Ver productos
        </Link>
      </div>
    );
  }

  const missing = freeShippingThreshold !== null ? freeShippingThreshold - subtotal : null;

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
      <ul className="divide-y divide-zinc-200 border-y border-zinc-200">
        {items.map((item) => (
          <li key={item.variantId} className="flex gap-4 py-4">
            <Link href={`/productos/${item.slug}`} className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
              {item.image && <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />}
            </Link>
            <div className="flex flex-1 flex-col">
              <div className="flex justify-between gap-4">
                <div>
                  <Link href={`/productos/${item.slug}`} className="font-medium hover:underline">
                    {item.name}
                  </Link>
                  {item.variantName && <p className="text-sm text-zinc-500">{item.variantName}</p>}
                </div>
                <p className="font-medium tabular-nums">{formatPrice(item.price * item.quantity, money)}</p>
              </div>
              <div className="mt-auto flex items-center justify-between pt-2">
                <div className="flex items-center rounded-lg border border-zinc-300 text-sm">
                  <button
                    type="button"
                    className="px-3 py-1"
                    onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                    aria-label="Restar"
                  >
                    −
                  </button>
                  <span className="w-8 text-center tabular-nums">{item.quantity}</span>
                  <button
                    type="button"
                    className="px-3 py-1 disabled:opacity-30"
                    onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                    disabled={item.quantity >= item.maxStock}
                    aria-label="Sumar"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="text-sm text-zinc-500 hover:text-red-600"
                  onClick={() => removeItem(item.variantId)}
                >
                  Quitar
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="card h-fit space-y-4 p-5">
        <div className="flex justify-between">
          <span className="text-zinc-600">Subtotal</span>
          <span className="font-semibold tabular-nums">{formatPrice(subtotal, money)}</span>
        </div>
        {missing !== null &&
          (missing > 0 ? (
            <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">
              Te faltan <strong>{formatPrice(missing, money)}</strong> para el envío gratis.
            </p>
          ) : (
            <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">🎉 ¡Tenés envío gratis!</p>
          ))}
        <p className="text-xs text-zinc-500">El costo de envío se calcula en el checkout.</p>
        <Link href="/checkout" className="btn-primary w-full">
          Finalizar compra
        </Link>
        <Link href="/productos" className="block text-center text-sm text-zinc-600 hover:underline">
          Seguir comprando
        </Link>
      </aside>
    </div>
  );
}
