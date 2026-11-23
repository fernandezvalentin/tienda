import { SettingsForm } from "@/components/admin/SettingsForm";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";
import { getSettings } from "@/lib/settings";

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Configuración de la tienda</h1>
      <SettingsForm settings={settings} mpConfigured={isMercadoPagoConfigured()} />
    </div>
  );
}
