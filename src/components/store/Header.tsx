import Image from "next/image";
import Link from "next/link";
import { CartButton } from "@/components/cart/CartButton";
import { getCurrentUser } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { SearchBox } from "./SearchBox";

export async function Header() {
  const [settings, categories, current] = await Promise.all([
    getSettings(),
    getCategories(),
    getCurrentUser(),
  ]);

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          {settings.logo_url ? (
            <Image src={settings.logo_url} alt={settings.name} width={120} height={36} className="h-9 w-auto" />
          ) : (
            <span className="text-lg">{settings.name}</span>
          )}
        </Link>

        <div className="hidden flex-1 md:block">
          <SearchBox />
        </div>

        <nav className="ml-auto flex items-center gap-1">
          {current?.profile?.role === "admin" && (
            <Link href="/admin" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100">
              Admin
            </Link>
          )}
          <Link
            href={current ? "/cuenta" : "/login"}
            className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100"
          >
            {current ? "Mi cuenta" : "Ingresar"}
          </Link>
          <CartButton />
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-3 md:hidden">
        <SearchBox />
      </div>

      {categories.length > 0 && (
        <div className="border-t border-zinc-100">
          <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 text-sm">
            <Link href="/productos" className="shrink-0 rounded-full px-3 py-1 hover:bg-zinc-100">
              Todos
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/productos?categoria=${c.slug}`}
                className="shrink-0 rounded-full px-3 py-1 hover:bg-zinc-100"
              >
                {c.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
