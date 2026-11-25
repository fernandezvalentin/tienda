import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isDemo } from "@/lib/demo/config";
import { createDemoClient } from "@/lib/demo/db";

/** Cliente de Supabase para Server Components, Server Actions y Route Handlers. */
export async function createClient() {
  const cookieStore = await cookies();

  if (isDemo) {
    // Modo demo: datos de ejemplo en memoria, misma interfaz que el cliente real.
    return createDemoClient(cookieStore) as unknown as SupabaseClient;
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Llamado desde un Server Component: se ignora, el proxy refresca la sesión.
          }
        },
      },
    },
  );
}
