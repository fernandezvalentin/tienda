import { ProductForm } from "@/components/admin/ProductForm";
import { getSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export default async function NewProductPage() {
  const supabase = await createClient();
  const [{ data: categories }, settings] = await Promise.all([
    supabase.from("categories").select("*").order("position"),
    getSettings(),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nuevo producto</h1>
      <ProductForm categories={(categories ?? []) as Category[]} currency={settings.currency} />
    </div>
  );
}
