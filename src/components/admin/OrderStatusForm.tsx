"use client";

import { useActionState } from "react";
import { updateOrderStatus, type ActionResult } from "@/app/admin/actions";
import { ORDER_STATUS_LABEL } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

export function OrderStatusForm({ id, status }: { id: string; status: OrderStatus }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(updateOrderStatus, {});
  const cancelled = status === "cancelled";

  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(e) => {
        const next = new FormData(e.currentTarget).get("status");
        if (next === "cancelled" && !confirm("¿Cancelar el pedido? El stock se va a devolver.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <select name="status" defaultValue={status} className="input" disabled={cancelled}>
        {Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      {!cancelled && (
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Guardando…" : "Actualizar estado"}
        </button>
      )}
      {cancelled && <p className="text-xs text-zinc-500">Los pedidos cancelados no pueden reactivarse.</p>}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-700">Estado actualizado ✓</p>}
    </form>
  );
}
