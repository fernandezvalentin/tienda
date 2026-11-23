"use client";

import Image from "next/image";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Sube imágenes al bucket "products" de Supabase Storage y devuelve sus URLs públicas. */
export function ImageUploader({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("products")
        .upload(path, file, { cacheControl: "31536000", contentType: file.type });
      if (upErr) {
        setError(upErr.message);
        continue;
      }
      uploaded.push(supabase.storage.from("products").getPublicUrl(path).data.publicUrl);
    }
    onChange([...images, ...uploaded]);
    setUploading(false);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((src, i) => (
          <div key={src} className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
            <Image src={src} alt="" fill sizes="150px" className="object-cover" />
            {i === 0 && (
              <span className="absolute top-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">Principal</span>
            )}
            <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition group-hover:opacity-100">
              <button type="button" onClick={() => move(i, -1)} className="rounded bg-white/90 px-1.5 text-xs">←</button>
              <button
                type="button"
                onClick={() => onChange(images.filter((_, k) => k !== i))}
                className="rounded bg-red-600 px-1.5 text-xs text-white"
              >
                Quitar
              </button>
              <button type="button" onClick={() => move(i, 1)} className="rounded bg-white/90 px-1.5 text-xs">→</button>
            </div>
          </div>
        ))}
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 text-center text-xs text-zinc-500 hover:border-brand">
          <span className="text-2xl">+</span>
          {uploading ? "Subiendo…" : "Subir imágenes"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="…o pegá la URL de una imagen"
          className="input"
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            try {
              new URL(url);
              onChange([...images, url]);
              setUrl("");
            } catch {
              setError("URL inválida");
            }
          }}
        >
          Agregar
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
