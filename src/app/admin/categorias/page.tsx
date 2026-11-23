import { CategoryForm } from "@/components/admin/CategoryForm";
import { CategoryRow } from "@/components/admin/CategoryRow";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("position").order("name");
  const categories = (data ?? []) as Category[];

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Categorías</h1>
      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Nueva categoría</h2>
        <CategoryForm />
      </section>
      <ul className="card divide-y divide-zinc-100">
        {categories.length === 0 && <li className="p-4 text-sm text-zinc-500">No hay categorías.</li>}
        {categories.map((c) => (
          <CategoryRow key={c.id} category={c} />
        ))}
      </ul>
    </div>
  );
}
