"use client";

import { useCallback, useState } from "react";
import { deleteCategory } from "@/app/admin/actions";
import type { Category } from "@/lib/types";
import { CategoryForm } from "./CategoryForm";
import { ConfirmButton } from "./ConfirmButton";

export function CategoryRow({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const close = useCallback(() => setEditing(false), []);

  return (
    <li className="p-4">
      {editing ? (
        <div className="space-y-3">
          <CategoryForm category={category} onDone={close} />
          <button type="button" onClick={close} className="text-sm text-zinc-500 hover:underline">Cancelar</button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">
              {category.name}{" "}
              {!category.active && <span className="text-xs font-normal text-zinc-500">(oculta)</span>}
            </p>
            <p className="text-xs text-zinc-500">/{category.slug} · orden {category.position}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>Editar</button>
            <form action={deleteCategory}>
              <input type="hidden" name="id" value={category.id} />
              <ConfirmButton
                className="btn-secondary text-red-600"
                message="¿Eliminar la categoría? Los productos quedarán sin categoría."
              >
                Eliminar
              </ConfirmButton>
            </form>
          </div>
        </div>
      )}
    </li>
  );
}
