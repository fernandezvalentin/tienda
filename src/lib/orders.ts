import "server-only";
import { createClient } from "./supabase/server";
import type { OrderWithItems } from "./types";

/** Pedido por id (vía RPC security definer: sirve también para invitados). */
export async function getOrderById(id: string): Promise<OrderWithItems | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_order", { order_id: id });
  if (error || !data) return null;
  return data as OrderWithItems;
}
