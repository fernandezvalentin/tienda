import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_SID_COOKIE, DEMO_USER_COOKIE, isDemo } from "@/lib/demo/config";

const PROTECTED_PREFIXES = ["/admin", "/cuenta"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

/** Modo demo: asigna a cada visitante su copia de los datos y protege las rutas privadas. */
function demoSession(request: NextRequest) {
  if (!request.cookies.get(DEMO_USER_COOKIE) && isProtected(request.nextUrl.pathname)) {
    return redirectToLogin(request);
  }
  if (request.cookies.get(DEMO_SID_COOKIE)) return NextResponse.next({ request });

  const sid = crypto.randomUUID();
  request.cookies.set(DEMO_SID_COOKIE, sid);
  const response = NextResponse.next({ request });
  response.cookies.set(DEMO_SID_COOKIE, sid, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7 });
  return response;
}

/** Refresca la sesión de Supabase y protege rutas privadas. */
export async function updateSession(request: NextRequest) {
  if (isDemo) return demoSession(request);

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers ?? {}).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // No poner lógica entre createServerClient y getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected(request.nextUrl.pathname)) return redirectToLogin(request);

  return response;
}
