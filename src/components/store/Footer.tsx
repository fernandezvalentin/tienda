import Link from "next/link";
import { whatsappLink } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export async function Footer() {
  const s = await getSettings();
  return (
    <footer className="mt-16 border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm sm:grid-cols-3">
        <div>
          <p className="text-base font-semibold">{s.name}</p>
          {s.tagline && <p className="mt-1 text-zinc-600">{s.tagline}</p>}
        </div>
        {(s.whatsapp || s.email || s.instagram || s.address) ? (
        <div className="space-y-1 text-zinc-600">
          <p className="font-medium text-zinc-900">Contacto</p>
          {s.whatsapp && (
            <a href={whatsappLink(s.whatsapp)} className="block hover:underline" target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          )}
          {s.email && (
            <a href={`mailto:${s.email}`} className="block hover:underline">
              {s.email}
            </a>
          )}
          {s.instagram && (
            <a
              href={`https://instagram.com/${s.instagram.replace(/^@/, "")}`}
              className="block hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Instagram
            </a>
          )}
          {s.address && <p>{s.address}</p>}
        </div>
        ) : (
          <div />
        )}
        <div className="space-y-1 text-zinc-600">
          <p className="font-medium text-zinc-900">Tienda</p>
          <Link href="/productos" className="block hover:underline">Productos</Link>
          <Link href="/carrito" className="block hover:underline">Carrito</Link>
          <Link href="/cuenta" className="block hover:underline">Mi cuenta</Link>
        </div>
      </div>
      <p className="border-t border-zinc-200 py-4 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} {s.name}
      </p>
    </footer>
  );
}
