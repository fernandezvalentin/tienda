import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getCurrentUser } from "@/lib/auth";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Finalizar compra" };

export default async function CheckoutPage() {
  const [settings, current] = await Promise.all([getSettings(), getCurrentUser()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Finalizar compra</h1>
      <CheckoutForm
        settings={settings}
        mpAvailable={settings.mp_enabled && isMercadoPagoConfigured()}
        defaults={{
          name: current?.profile?.full_name ?? "",
          email: current?.user.email ?? "",
          phone: current?.profile?.phone ?? "",
        }}
      />
    </div>
  );
}
