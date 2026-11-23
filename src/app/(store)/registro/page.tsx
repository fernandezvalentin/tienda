import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>
      <p className="mt-1 text-sm text-zinc-600">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Ingresá
        </Link>
      </p>
      <AuthForm mode="register" />
    </div>
  );
}
