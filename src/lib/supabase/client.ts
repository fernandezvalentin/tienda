import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isDemo } from "@/lib/demo/config";

const DEMO_UPLOAD_ERROR = "En la demo no se pueden subir archivos: pegá la URL de una imagen.";

/** Cliente de Supabase para Client Components. */
export function createClient() {
  if (isDemo) {
    // Modo demo: no hay Storage. Solo lo usa el ImageUploader del admin.
    return {
      storage: {
        from: () => ({
          upload: async () => ({ data: null, error: { message: DEMO_UPLOAD_ERROR } }),
          getPublicUrl: () => ({ data: { publicUrl: "" } }),
        }),
      },
    } as unknown as SupabaseClient;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
