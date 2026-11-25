/**
 * Modo demo: la tienda funciona sin Supabase, con datos de ejemplo en memoria.
 * Se activa con NEXT_PUBLIC_DEMO_MODE=1 o automáticamente si no hay URL de Supabase.
 * Pensado para mostrar el proyecto (ej. en un portfolio) sin depender de una base real.
 */
export const isDemo =
  process.env.NEXT_PUBLIC_DEMO_MODE === "1" || !process.env.NEXT_PUBLIC_SUPABASE_URL;

/** Credenciales del administrador de la demo (se muestran en la pantalla de login). */
export const DEMO_ADMIN = {
  email: "admin@demo.com",
  password: "demo1234",
} as const;

export const DEMO_SID_COOKIE = "demo_sid";
export const DEMO_USER_COOKIE = "demo_user";
export const DEMO_ORDERS_COOKIE = "demo_orders";
