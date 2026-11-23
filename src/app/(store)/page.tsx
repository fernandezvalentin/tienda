import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { getCategories, getFeaturedProducts } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export default async function HomePage() {
  const [settings, featured, categories] = await Promise.all([
    getSettings(),
    getFeaturedProducts(8),
    getCategories(),
  ]);

  return (
    <>
      <section className="relative overflow-hidden bg-zinc-900 text-white">
        {settings.hero_image_url && (
          <Image
            src={settings.hero_image_url}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-40"
          />
        )}
        <div
          className="absolute inset-0 opacity-60"
          style={{ background: "linear-gradient(120deg, var(--brand), transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:py-28">
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">{settings.name}</h1>
          {settings.tagline && <p className="mt-4 max-w-xl text-lg text-white/85">{settings.tagline}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/productos" className="btn bg-white text-zinc-900 hover:bg-zinc-100">
              Ver productos
            </Link>
          </div>
          {settings.delivery_enabled && settings.free_shipping_threshold !== null && (
            <p className="mt-6 text-sm text-white/80">
              🚚 Envío gratis en compras desde {formatPrice(settings.free_shipping_threshold, settings)}
            </p>
          )}
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-12">
          <h2 className="text-xl font-semibold">Categorías</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/productos?categoria=${c.slug}`}
                className="card group relative flex h-28 items-end overflow-hidden p-4 hover:border-brand"
              >
                {c.image_url && (
                  <Image src={c.image_url} alt="" fill sizes="25vw" className="object-cover opacity-30 transition group-hover:opacity-40" />
                )}
                <div className="relative">
                  <p className="font-medium">{c.name}</p>
                  {c.description && <p className="line-clamp-1 text-xs text-zinc-500">{c.description}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pt-12">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-semibold">Destacados</h2>
          <Link href="/productos" className="text-sm font-medium text-brand hover:underline">
            Ver todo →
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">
            Todavía no hay productos destacados. Marcá productos como “destacado” desde el panel de administración.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} settings={settings} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
