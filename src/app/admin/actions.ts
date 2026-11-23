"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

export interface SaveProductResult extends ActionResult {
  /** ids de las variantes guardadas, en el mismo orden en que se enviaron */
  variantIds?: string[];
}

const optionalNumber = z
  .union([z.number(), z.string(), z.null()])
  .transform((v) => (v === "" || v === null ? null : Number(v)))
  .refine((v) => v === null || (Number.isFinite(v) && v >= 0), "Número inválido");

function revalidateStore() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------
//  Productos
// ---------------------------------------------------------------------
const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  options: z.record(z.string(), z.string()),
  price: optionalNumber,
  stock: z.coerce.number().int().min(0),
  sku: z.string().trim().max(80).nullable().optional(),
  active: z.boolean(),
});

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "El nombre es obligatorio").max(200),
  slug: z.string().trim().max(200).optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  category_id: z.string().nullable().optional(),
  images: z.array(z.url()).max(20),
  base_price: z.coerce.number().min(0, "Precio inválido"),
  compare_at_price: optionalNumber,
  featured: z.boolean(),
  active: z.boolean(),
  variants: z.array(variantSchema).min(1, "Tiene que haber al menos una variante"),
});

export type ProductInput = z.input<typeof productSchema>;

export async function saveProduct(input: ProductInput): Promise<SaveProductResult> {
  await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { id, variants, ...data } = parsed.data;
  const supabase = await createClient();

  const row = {
    ...data,
    slug: slugify(data.slug || data.name),
    category_id: data.category_id || null,
    description: data.description || null,
  };

  let productId = id;
  if (productId) {
    const { error } = await supabase.from("products").update(row).eq("id", productId);
    if (error) return { error: error.code === "23505" ? "Ya existe un producto con ese slug" : error.message };
  } else {
    const { data: created, error } = await supabase.from("products").insert(row).select("id").single();
    if (error) return { error: error.code === "23505" ? "Ya existe un producto con ese slug" : error.message };
    productId = created.id as string;
  }

  // Sincronizar variantes
  const { data: existing } = await supabase.from("product_variants").select("id").eq("product_id", productId);
  const keepIds = new Set(variants.filter((v) => v.id).map((v) => v.id!));
  const toDelete = (existing ?? []).map((v) => v.id as string).filter((vid) => !keepIds.has(vid));
  if (toDelete.length) {
    const { error } = await supabase.from("product_variants").delete().in("id", toDelete);
    if (error) return { error: error.message };
  }

  const variantIds: string[] = [];
  for (const [position, v] of variants.entries()) {
    const vrow = {
      product_id: productId,
      name: v.name,
      options: v.options,
      price: v.price,
      stock: v.stock,
      sku: v.sku || null,
      active: v.active,
      position,
    };
    if (v.id) {
      const { error } = await supabase.from("product_variants").update(vrow).eq("id", v.id);
      if (error) return { error: error.message };
      variantIds.push(v.id);
    } else {
      const { data: inserted, error } = await supabase
        .from("product_variants")
        .insert(vrow)
        .select("id")
        .single();
      if (error) return { error: error.message };
      variantIds.push(inserted.id as string);
    }
  }

  revalidateStore();
  revalidatePath("/admin/productos");
  if (!id) redirect(`/admin/productos/${productId}?creado=1`);
  return { ok: true, variantIds };
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("products").delete().eq("id", id);
  revalidateStore();
  redirect("/admin/productos");
}

// ---------------------------------------------------------------------
//  Categorías
// ---------------------------------------------------------------------
const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "El nombre es obligatorio").max(100),
  slug: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional(),
  image_url: z.union([z.url(), z.literal("")]).optional(),
  position: z.coerce.number().int().default(0),
  active: z.boolean(),
});

export async function saveCategory(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = categorySchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    slug: formData.get("slug") || undefined,
    description: formData.get("description") || undefined,
    image_url: formData.get("image_url") || undefined,
    position: formData.get("position") || 0,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { id, ...data } = parsed.data;
  const row = {
    ...data,
    slug: slugify(data.slug || data.name),
    description: data.description || null,
    image_url: data.image_url || null,
  };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("categories").update(row).eq("id", id)
    : await supabase.from("categories").insert(row);
  if (error) return { error: error.code === "23505" ? "Ya existe una categoría con ese slug" : error.message };

  revalidateStore();
  return { ok: true };
}

export async function deleteCategory(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("categories").delete().eq("id", String(formData.get("id")));
  revalidateStore();
}

// ---------------------------------------------------------------------
//  Pedidos
// ---------------------------------------------------------------------
const statusSchema = z.enum(["pending", "paid", "preparing", "shipped", "delivered", "cancelled"]);

export async function updateOrderStatus(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const status = statusSchema.safeParse(formData.get("status"));
  if (!status.success) return { error: "Estado inválido" };

  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ status: status.data }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${id}`);
  revalidatePath(`/pedido/${id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------
//  Configuración de la tienda
// ---------------------------------------------------------------------
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const settingsSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  tagline: text(200),
  description: text(1000),
  logo_url: text(500),
  hero_image_url: text(500),
  primary_color: z.string().regex(/^#[0-9a-f]{6}$/i, "Color inválido"),
  currency: z.string().trim().length(3, "Moneda inválida (código ISO, ej: ARS)").toUpperCase(),
  locale: z.string().trim().min(2).max(10),
  whatsapp: text(30).transform((v) => (v ? v.replace(/\D/g, "") : null)),
  email: text(200),
  instagram: text(100),
  address: text(300),
  bank_transfer_info: text(1000),
  shipping_cost: z.coerce.number().min(0),
  free_shipping_threshold: optionalNumber,
  pickup_address: text(300),
  delivery_enabled: z.boolean(),
  pickup_enabled: z.boolean(),
  transfer_enabled: z.boolean(),
  cash_enabled: z.boolean(),
  mp_enabled: z.boolean(),
});

const BOOL_FIELDS = ["delivery_enabled", "pickup_enabled", "transfer_enabled", "cash_enabled", "mp_enabled"];

export async function saveSettings(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const raw: Record<string, unknown> = {};
  for (const key of Object.keys(settingsSchema.shape)) {
    raw[key] = BOOL_FIELDS.includes(key) ? formData.get(key) === "on" : String(formData.get(key) ?? "");
  }
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("store_settings").update(parsed.data).eq("id", 1);
  if (error) return { error: error.message };

  revalidateStore();
  return { ok: true };
}
