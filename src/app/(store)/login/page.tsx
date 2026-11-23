import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-semibold">Ingresar</h1>
      <p className="mt-1 text-sm text-zinc-600">
        ¿No tenés cuenta?{" "}
        <Link href="/registro" className="font-medium text-brand hover:underline">
          Registrate
        </Link>
      </p>
      <AuthForm mode="login" next={typeof next === "string" ? next : undefined} />
    </div>
  );
}
