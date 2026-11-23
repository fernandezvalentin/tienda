import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/(store)/login/actions";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Administración", robots: { index: false } };

const NAV = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/categorias", label: "Categorías" },
  { href: "/admin/configuracion", label: "Configuración" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const [{ user }, settings] = await Promise.all([requireAdmin(), getSettings()]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 md:flex-row">
      <aside className="border-b border-zinc-200 bg-white md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center justify-between p-4 md:block">
          <Link href="/admin" className="font-semibold">{settings.name}</Link>
          <p className="hidden truncate text-xs text-zinc-500 md:mt-1 md:block">{user.email}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-0">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden space-y-1 border-t border-zinc-200 p-2 md:mt-4 md:block">
          <Link href="/" className="block rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100">
            ← Ver tienda
          </Link>
          <form action={signOut}>
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-600 hover:bg-zinc-100">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
