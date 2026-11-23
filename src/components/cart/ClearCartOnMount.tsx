"use client";

import { useEffect } from "react";
import { useCart } from "./CartProvider";

/** Vacía el carrito al llegar a la confirmación de un pedido nuevo. */
export function ClearCartOnMount() {
  const { clear, ready } = useCart();
  useEffect(() => {
    if (ready) clear();
  }, [ready, clear]);
  return null;
}
