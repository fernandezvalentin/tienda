import type { OrderStatus, PaymentMethod, StoreSettings } from "./types";

type MoneySettings = Pick<StoreSettings, "currency" | "locale">;

export function formatPrice(amount: number, s: MoneySettings) {
  return new Intl.NumberFormat(s.locale, {
    style: "currency",
    currency: s.currency,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

export function formatDate(date: string, locale = "es-AR") {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(date),
  );
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pendiente de pago",
  paid: "Pagado",
  preparing: "En preparación",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  preparing: "bg-sky-100 text-sky-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-zinc-200 text-zinc-800",
  cancelled: "bg-red-100 text-red-700",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  transfer: "Transferencia bancaria",
  cash: "Efectivo / a coordinar",
  mercadopago: "Mercado Pago",
};

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function whatsappLink(phone: string, text?: string) {
  const clean = phone.replace(/\D/g, "");
  return `https://wa.me/${clean}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** Precio efectivo de una variante. */
export function variantPrice(basePrice: number, variantPrice: number | null) {
  return variantPrice ?? basePrice;
}
