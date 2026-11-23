import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { StoreSettings } from "./types";

const DEFAULT_SETTINGS: StoreSettings = {
  id: 1,
  name: "Mi Tienda",
  tagline: null,
  description: null,
  logo_url: null,
  hero_image_url: null,
  primary_color: "#4f46e5",
  currency: "ARS",
  locale: "es-AR",
  whatsapp: null,
  email: null,
  instagram: null,
  address: null,
  bank_transfer_info: null,
  shipping_cost: 0,
  free_shipping_threshold: null,
  delivery_enabled: true,
  pickup_enabled: true,
  pickup_address: null,
  transfer_enabled: true,
  cash_enabled: true,
  mp_enabled: false,
};

/** Configuración de la tienda (memoizada por request). */
export const getSettings = cache(async (): Promise<StoreSettings> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("store_settings").select("*").eq("id", 1).single();
  if (error || !data) {
    console.error("No se pudo leer store_settings:", error?.message);
    return DEFAULT_SETTINGS;
  }
  return {
    ...data,
    shipping_cost: Number(data.shipping_cost),
    free_shipping_threshold:
      data.free_shipping_threshold === null ? null : Number(data.free_shipping_threshold),
  } as StoreSettings;
});
