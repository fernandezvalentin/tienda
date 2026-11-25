import { signInDemoAdmin } from "@/app/(store)/login/actions";
import { getCurrentUser } from "@/lib/auth";
import { DEMO_ADMIN, isDemo } from "@/lib/demo/config";

/** Franja superior del modo demo: explica qué es y da acceso directo al panel. */
export async function DemoBanner() {
  if (!isDemo) return null;
  const current = await getCurrentUser();
  const isAdmin = current?.profile?.role === "admin";

  return (
    <div className="bg-zinc-900 text-xs text-zinc-200">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center">
        <span>
          <strong className="font-semibold text-white">Demo</strong> · Los datos son de ejemplo y los cambios
          solo se guardan en tu sesión.
        </span>
        {!isAdmin && (
          <form action={signInDemoAdmin} className="contents">
            <button className="rounded-full bg-white/15 px-3 py-0.5 font-medium text-white hover:bg-white/25">
              Entrar al panel admin →
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/** Recuadro con las credenciales de la demo para la pantalla de login. */
export function DemoCredentials({ next }: { next?: string }) {
  if (!isDemo) return null;
  return (
    <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm">
      <p className="font-medium">Cuenta de administrador de la demo</p>
      <p className="mt-1 text-zinc-600">
        {DEMO_ADMIN.email} · {DEMO_ADMIN.password}
      </p>
      <form action={signInDemoAdmin} className="mt-3">
        <input type="hidden" name="next" value={next ?? "/admin"} />
        <button className="btn-secondary w-full">Entrar como administrador</button>
      </form>
    </div>
  );
}
