"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveCategory, type ActionResult } from "@/app/admin/actions";
import type { Category } from "@/lib/types";

export function CategoryForm({ category, onDone }: { category?: Category; onDone?: () => void }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveCategory, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      if (!category) formRef.current?.reset();
      onDone?.();
    }
  }, [state, category, onDone]);

  return (
    <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-2">
      {category && <input type="hidden" name="id" value={category.id} />}
      <div>
        <label className="label">Nombre</label>
        <input name="name" defaultValue={category?.name} className="input" required />
      </div>
      <div>
        <label className="label">Slug (URL)</label>
        <input name="slug" defaultValue={category?.slug} className="input" placeholder="Automático" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Descripción</label>
        <input name="description" defaultValue={category?.description ?? ""} className="input" />
      </div>
      <div>
        <label className="label">URL de imagen</label>
        <input name="image_url" type="url" defaultValue={category?.image_url ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Orden</label>
        <input name="position" type="number" defaultValue={category?.position ?? 0} className="input" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={category?.active ?? true} className="size-4 accent-[var(--brand)]" />
        Visible
      </label>
      <div className="flex items-center justify-end gap-3 sm:col-span-2">
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button className="btn-primary" disabled={pending}>
          {pending ? "Guardando…" : category ? "Guardar" : "Crear categoría"}
        </button>
      </div>
    </form>
  );
}
