"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import { saveSettings, type ActionResult } from "@/app/admin/actions";
import type { StoreSettings } from "@/lib/types";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card space-y-4 p-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  placeholder,
  hint,
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="input"
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? 0 : undefined}
      />
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-[var(--brand)]" />
      {label}
    </label>
  );
}

export function SettingsForm({ settings: s, mpConfigured }: { settings: StoreSettings; mpConfigured: boolean }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveSettings, {});

  return (
    <form action={action} className="space-y-6">
      <Section title="Identidad">
        <Field name="name" label="Nombre de la tienda" defaultValue={s.name} />
        <Field name="tagline" label="Frase / slogan" defaultValue={s.tagline} />
        <div>
          <label className="label" htmlFor="description">Descripción (SEO)</label>
          <textarea id="description" name="description" rows={3} defaultValue={s.description ?? ""} className="input" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="logo_url" label="URL del logo" defaultValue={s.logo_url} type="url" />
          <Field name="hero_image_url" label="Imagen de portada (URL)" defaultValue={s.hero_image_url} type="url" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="primary_color">Color principal</label>
            <input id="primary_color" name="primary_color" type="color" defaultValue={s.primary_color} className="h-10 w-full cursor-pointer rounded-lg border border-zinc-300" />
          </div>
          <Field name="currency" label="Moneda" defaultValue={s.currency} hint="Código ISO: ARS, USD, MXN, CLP…" />
          <Field name="locale" label="Formato regional" defaultValue={s.locale} hint="es-AR, es-MX, es-ES…" />
        </div>
      </Section>

      <Section title="Contacto">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="whatsapp" label="WhatsApp" defaultValue={s.whatsapp} placeholder="5491122334455" hint="Con código de país, sin + ni espacios" />
          <Field name="email" label="Email" defaultValue={s.email} type="email" />
          <Field name="instagram" label="Instagram" defaultValue={s.instagram} placeholder="@mitienda" />
          <Field name="address" label="Dirección" defaultValue={s.address} />
        </div>
      </Section>

      <Section title="Envíos">
        <Toggle name="delivery_enabled" label="Envío a domicilio" defaultChecked={s.delivery_enabled} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="shipping_cost" label="Costo de envío" defaultValue={s.shipping_cost} type="number" />
          <Field
            name="free_shipping_threshold"
            label="Envío gratis desde"
            defaultValue={s.free_shipping_threshold}
            type="number"
            hint="Dejalo vacío para no ofrecer envío gratis"
          />
        </div>
        <Toggle name="pickup_enabled" label="Retiro en el local" defaultChecked={s.pickup_enabled} />
        <Field name="pickup_address" label="Dirección y horario de retiro" defaultValue={s.pickup_address} />
      </Section>

      <Section title="Medios de pago">
        <Toggle name="mp_enabled" label="Mercado Pago" defaultChecked={s.mp_enabled} />
        {!mpConfigured && (
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            Para usar Mercado Pago configurá la variable de entorno <code>MP_ACCESS_TOKEN</code> (ver README).
          </p>
        )}
        <Toggle name="transfer_enabled" label="Transferencia bancaria" defaultChecked={s.transfer_enabled} />
        <div>
          <label className="label" htmlFor="bank_transfer_info">Datos bancarios</label>
          <textarea
            id="bank_transfer_info"
            name="bank_transfer_info"
            rows={4}
            defaultValue={s.bank_transfer_info ?? ""}
            className="input font-mono"
            placeholder={"Alias: MI.TIENDA\nCBU: ...\nTitular: ..."}
          />
        </div>
        <Toggle name="cash_enabled" label="Efectivo / a coordinar" defaultChecked={s.cash_enabled} />
      </Section>

      <div className="sticky bottom-4 flex items-center justify-end gap-4 rounded-xl border border-zinc-200 bg-white/95 p-3 backdrop-blur">
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.ok && <p className="text-sm text-emerald-700">Configuración guardada ✓</p>}
        <button className="btn-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar cambios"}</button>
      </div>
    </form>
  );
}
