"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export function CartButton() {
  const { count, ready } = useCart();
  return (
    <Link
      href="/carrito"
      className="relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100"
      aria-label={`Carrito (${count} productos)`}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="20" r="1.3" />
        <circle cx="17" cy="20" r="1.3" />
      </svg>
      <span className="hidden sm:inline">Carrito</span>
      {ready && count > 0 && (
        <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
