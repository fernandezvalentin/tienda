import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/product/AddToCart";
import { ProductGallery } from "@/components/product/ProductGallery";
import { getProductBySlug, productSummary } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export async function generateMetadata({ params }: PageProps<"/productos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Producto no encontrado" };
  return {
    title: product.name,
    description: product.description?.slice(0, 160),
    openGraph: { images: product.images.slice(0, 1) },
  };
}

export default async function ProductPage({ params }: PageProps<"/productos/[slug]">) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProductBySlug(slug), getSettings()]);
  if (!product) notFound();

  const { min, stock } = productSummary(product);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images,
    offers: {
      "@type": "Offer",
      price: min,
      priceCurrency: settings.currency,
      availability: stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/productos" className="hover:underline">Productos</Link>
        {product.categories && (
          <>
            {" / "}
            <Link href={`/productos?categoria=${product.categories.slug}`} className="hover:underline">
              {product.categories.name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} alt={product.name} />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
          <div className="mt-6">
            <AddToCart product={product} money={{ currency: settings.currency, locale: settings.locale }} />
          </div>

          {product.description && (
            <div className="mt-8 border-t border-zinc-200 pt-6">
              <h2 className="mb-2 font-medium">Descripción</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">{product.description}</p>
            </div>
          )}

          <ul className="mt-6 space-y-2 border-t border-zinc-200 pt-6 text-sm text-zinc-600">
            {settings.delivery_enabled && (
              <li>
                🚚 Envío a domicilio{" "}
                {settings.free_shipping_threshold !== null
                  ? `— gratis desde ${formatPrice(settings.free_shipping_threshold, settings)}`
                  : settings.shipping_cost > 0
                    ? `— ${formatPrice(settings.shipping_cost, settings)}`
                    : "gratis"}
              </li>
            )}
            {settings.pickup_enabled && <li>🏬 Retiro sin cargo{settings.pickup_address ? ` en ${settings.pickup_address}` : ""}</li>}
          </ul>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}
