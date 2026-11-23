import Image from "next/image";
import Link from "next/link";
import { productSummary } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import type { ProductWithVariants, StoreSettings } from "@/lib/types";

export function ProductCard({
  product,
  settings,
}: {
  product: ProductWithVariants;
  settings: StoreSettings;
}) {
  const { min, max, stock } = productSummary(product);
  const image = product.images[0];
  const onSale = product.compare_at_price && product.compare_at_price > min;

  return (
    <Link href={`/productos/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">Sin imagen</div>
        )}
        {stock === 0 ? (
          <span className="absolute top-2 left-2 rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
            Sin stock
          </span>
        ) : onSale ? (
          <span className="absolute top-2 left-2 rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-white">
            Oferta
          </span>
        ) : null}
      </div>
      <div className="mt-3 space-y-1">
        <h3 className="line-clamp-2 text-sm font-medium text-zinc-900">{product.name}</h3>
        <p className="text-sm">
          <span className="font-semibold">
            {min !== max && "Desde "}
            {formatPrice(min, settings)}
          </span>
          {onSale && (
            <span className="ml-2 text-zinc-400 line-through">
              {formatPrice(product.compare_at_price!, settings)}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
