"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-100">
        {current ? (
          <Image src={current} alt={alt} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-400">Sin imagen</div>
        )}
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              className={`relative aspect-square overflow-hidden rounded-lg border-2 ${
                i === active ? "border-brand" : "border-transparent"
              }`}
              aria-label={`Ver imagen ${i + 1}`}
            >
              <Image src={src} alt="" fill sizes="20vw" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
