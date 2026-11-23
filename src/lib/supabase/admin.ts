import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la clave secreta (saltea RLS). Usar SOLO en el servidor y solo
 * para procesos de sistema (ej. webhook de Mercado Pago).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Falta la variable de entorno SUPABASE_SECRET_KEY");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
