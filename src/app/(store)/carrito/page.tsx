import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Carrito" };

export default async function CartPage() {
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Tu carrito</h1>
      <CartView
        money={{ currency: s.currency, locale: s.locale }}
        freeShippingThreshold={s.delivery_enabled ? s.free_shipping_threshold : null}
      />
    </div>
  );
}
