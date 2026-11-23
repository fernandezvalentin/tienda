"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const { user } = await requireUser();
  const data = z
    .object({ full_name: z.string().trim().max(120), phone: z.string().trim().max(40) })
    .parse({ full_name: formData.get("full_name") ?? "", phone: formData.get("phone") ?? "" });

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ full_name: data.full_name || null, phone: data.phone || null })
    .eq("id", user.id);
  revalidatePath("/cuenta");
}
