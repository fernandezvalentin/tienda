"use client";

import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "@/app/(store)/login/actions";

export function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "login" ? signIn : signUp,
    {},
  );

  if (state.message) {
    return <p className="mt-8 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{state.message}</p>;
  }

  return (
    <form action={action} className="mt-8 space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {mode === "register" && (
        <>
          <div>
            <label className="label" htmlFor="full_name">Nombre y apellido</label>
            <input id="full_name" name="full_name" className="input" required autoComplete="name" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Teléfono (opcional)</label>
            <input id="phone" name="phone" type="tel" className="input" autoComplete="tel" />
          </div>
        </>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          required
          minLength={mode === "register" ? 8 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </div>
      {state.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Un momento…" : mode === "login" ? "Ingresar" : "Crear cuenta"}
      </button>
    </form>
  );
}
