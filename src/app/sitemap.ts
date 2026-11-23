import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const supabase = await createClient();
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from("products").select("slug, updated_at").eq("active", true),
    supabase.from("categories").select("slug").eq("active", true),
  ]);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/productos`, changeFrequency: "daily", priority: 0.9 },
    ...(categories ?? []).map((c) => ({ url: `${base}/productos?categoria=${c.slug}`, priority: 0.7 })),
    ...(products ?? []).map((p) => ({
      url: `${base}/productos/${p.slug}`,
      lastModified: p.updated_at as string,
      priority: 0.8,
    })),
  ];
}
