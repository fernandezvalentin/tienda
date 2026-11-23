import "server-only";
import { createClient } from "./supabase/server";
import type { Category, ProductWithVariants } from "./types";

const PRODUCT_SELECT = "*, product_variants(*), categories(name, slug)";

export const PAGE_SIZE = 12;

export type ProductSort = "recientes" | "precio-asc" | "precio-desc" | "nombre";

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("position")
    .order("name");
  return data ?? [];
}

function normalize(p: ProductWithVariants): ProductWithVariants {
  return {
    ...p,
    product_variants: (p.product_variants ?? [])
      .filter((v) => v.active)
      .sort((a, b) => a.position - b.position),
  };
}

export async function getFeaturedProducts(limit = 8): Promise<ProductWithVariants[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as ProductWithVariants[]).map(normalize);
}

export async function getProducts(opts: {
  category?: string;
  q?: string;
  sort?: ProductSort;
  page?: number;
}): Promise<{ products: ProductWithVariants[]; total: number }> {
  const supabase = await createClient();
  const page = Math.max(1, opts.page ?? 1);

  let categoryId: string | undefined;
  if (opts.category) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", opts.category)
      .maybeSingle();
    if (!cat) return { products: [], total: 0 };
    categoryId = cat.id;
  }

  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .eq("active", true);

  if (categoryId) query = query.eq("category_id", categoryId);
  if (opts.q) {
    const term = opts.q.replace(/[%,()]/g, " ").trim();
    if (term) query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }

  switch (opts.sort) {
    case "precio-asc":
      query = query.order("base_price", { ascending: true });
      break;
    case "precio-desc":
      query = query.order("base_price", { ascending: false });
      break;
    case "nombre":
      query = query.order("name", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
  return { products: ((data ?? []) as ProductWithVariants[]).map(normalize), total: count ?? 0 };
}

export async function getProductBySlug(slug: string): Promise<ProductWithVariants | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  return data ? normalize(data as ProductWithVariants) : null;
}

/** Rango de precios y stock total de un producto según sus variantes. */
export function productSummary(p: ProductWithVariants) {
  const prices = p.product_variants.map((v) => v.price ?? p.base_price);
  const min = prices.length ? Math.min(...prices) : p.base_price;
  const max = prices.length ? Math.max(...prices) : p.base_price;
  const stock = p.product_variants.reduce((acc, v) => acc + v.stock, 0);
  return { min, max, stock };
}
