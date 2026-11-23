"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface AuthState {
  error?: string;
  message?: string;
}

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/cuenta";
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({ email: z.email(), password: z.string().min(1) })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Ingresá tu email y contraseña." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      error:
        error.code === "email_not_confirmed"
          ? "Tenés que confirmar tu email antes de ingresar."
          : "Email o contraseña incorrectos.",
    };
  }
  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({
      full_name: z.string().trim().min(2, "Ingresá tu nombre"),
      phone: z.string().trim().max(40).optional(),
      email: z.email("Email inválido"),
      password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { email, password, full_name, phone } = parsed.data;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, phone },
      emailRedirectTo: `${site}/auth/callback?next=/cuenta`,
    },
  });
  if (error) {
    return {
      error: error.code === "user_already_exists" ? "Ya existe una cuenta con ese email." : error.message,
    };
  }
  if (!data.session) {
    return { message: "¡Listo! Te enviamos un email para confirmar tu cuenta." };
  }
  revalidatePath("/", "layout");
  redirect("/cuenta");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
