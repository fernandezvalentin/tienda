import "server-only";
import { DEMO_ADMIN } from "./config";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>;

export interface DemoDB {
  store_settings: Row[];
  categories: Row[];
  products: Row[];
  product_variants: Row[];
  orders: Row[];
  order_items: Row[];
  profiles: Row[];
  /** Usuarios de "auth" (solo existen en la demo). */
  users: { id: string; email: string; password: string }[];
  nextOrderNumber: number;
}

/** UUID v4 válido y estable (los ids tienen que ser iguales entre reinicios: el carrito los guarda). */
export function demoId(kind: "a" | "b" | "c" | "d" | "e" | "f", n: number) {
  return `00000000-0000-4000-8000-${kind}${String(n).padStart(11, "0")}`;
}

export const DEMO_ADMIN_ID = demoId("f", 1);

const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=900`;

function daysAgo(days: number, hour = 12) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

type VariantSeed = { name: string; options?: Record<string, string>; price?: number | null; stock: number };

interface ProductSeed {
  name: string;
  slug: string;
  description: string;
  category: string;
  image: string;
  base_price: number;
  compare_at_price?: number | null;
  featured?: boolean;
  variants: VariantSeed[];
}

const CATEGORIES = [
  { name: "Indumentaria", slug: "indumentaria", description: "Remeras, buzos y más", image: "1521572163474-6864f9cf17ab" },
  { name: "Calzado", slug: "calzado", description: "Zapatillas para todos los días", image: "1491553895911-0055eca6402d" },
  { name: "Accesorios", slug: "accesorios", description: "Complementos para todos los días", image: "1553062407-98eeb64c6a62" },
  { name: "Hogar", slug: "hogar", description: "Cosas lindas para tu casa", image: "1507473885765-e6ed057f782c" },
];

const talles = (list: string[], stock: (t: string) => number, price?: (t: string) => number | null) =>
  list.map((t) => ({ name: t, options: { Talle: t }, stock: stock(t), price: price?.(t) ?? null }));

const PRODUCTS: ProductSeed[] = [
  {
    name: "Remera Básica",
    slug: "remera-basica",
    description: "Remera de algodón peinado 24/1, corte regular. Ideal para el día a día.",
    category: "indumentaria",
    image: "1521572163474-6864f9cf17ab",
    base_price: 18000,
    compare_at_price: 22000,
    featured: true,
    variants: ["S", "M", "L", "XL"].flatMap((t) =>
      ["Blanco", "Negro"].map((c) => ({
        name: `${t} / ${c}`,
        options: { Talle: t, Color: c },
        stock: t === "XL" && c === "Blanco" ? 0 : t === "L" && c === "Negro" ? 2 : 10,
      })),
    ),
  },
  {
    name: "Buzo Canguro",
    slug: "buzo-canguro",
    description: "Buzo de frisa con capucha y bolsillo canguro.",
    category: "indumentaria",
    image: "1556821840-3a63f95609a7",
    base_price: 39000,
    featured: true,
    variants: talles(["M", "L", "XL", "XXL"], (t) => (t === "XXL" ? 1 : 5), (t) => (t === "XXL" ? 42000 : null)),
  },
  {
    name: "Remera Estampada",
    slug: "remera-estampada",
    description: "Remera negra de algodón con estampa frontal. Edición limitada.",
    category: "indumentaria",
    image: "1618354691373-d851c5c3a990",
    base_price: 21000,
    variants: talles(["S", "M", "L"], () => 8),
  },
  {
    name: "Jogger de Lino",
    slug: "jogger-lino",
    description: "Pantalón jogger de lino liviano, con cintura elastizada y puños.",
    category: "indumentaria",
    image: "1594633312681-425c7b97ccd1",
    base_price: 33500,
    compare_at_price: 38000,
    variants: talles(["S", "M", "L"], (t) => (t === "S" ? 3 : 6)),
  },
  {
    name: "Zapatillas Running",
    slug: "zapatillas-running",
    description: "Zapatillas livianas con suela de goma y capellada de malla respirable.",
    category: "calzado",
    image: "1491553895911-0055eca6402d",
    base_price: 58000,
    compare_at_price: 65000,
    featured: true,
    variants: talles(["38", "39", "40", "41", "42", "43"], (t) => (t === "43" ? 0 : 4)),
  },
  {
    name: "Mochila Urbana",
    slug: "mochila-urbana",
    description: "Mochila de lona impermeable con compartimento acolchado para notebook de hasta 15\".",
    category: "accesorios",
    image: "1553062407-98eeb64c6a62",
    base_price: 34000,
    featured: true,
    variants: [{ name: "Única", stock: 12 }],
  },
  {
    name: "Reloj Inteligente",
    slug: "reloj-inteligente",
    description: "Smartwatch con monitor de actividad, notificaciones y batería de hasta 7 días.",
    category: "accesorios",
    image: "1523275335684-37898b6baf30",
    base_price: 72000,
    compare_at_price: 80000,
    featured: true,
    variants: [{ name: "Única", stock: 6 }],
  },
  {
    name: "Anteojos de Sol",
    slug: "anteojos-de-sol",
    description: "Anteojos con lentes polarizados y protección UV400.",
    category: "accesorios",
    image: "1572635196237-14b3f281503f",
    base_price: 27000,
    variants: ["Negro", "Carey"].map((c) => ({ name: c, options: { Color: c }, stock: c === "Carey" ? 2 : 7 })),
  },
  {
    name: "Auriculares Bluetooth",
    slug: "auriculares-bluetooth",
    description: "Auriculares over-ear inalámbricos con cancelación de ruido y 30 h de autonomía.",
    category: "accesorios",
    image: "1505740420928-5e560c06d30e",
    base_price: 64000,
    featured: true,
    variants: [{ name: "Única", stock: 9 }],
  },
  {
    name: "Gorra Clásica",
    slug: "gorra-clasica",
    description: "Gorra de gabardina con regulador metálico.",
    category: "accesorios",
    image: "1588850561407-ed78c282e89b",
    base_price: 12500,
    variants: [{ name: "Única", stock: 25 }],
  },
  {
    name: "Lámpara de Pie",
    slug: "lampara-de-pie",
    description: "Lámpara de pie metálica con pantalla orientable. Ideal para lectura.",
    category: "hogar",
    image: "1507473885765-e6ed057f782c",
    base_price: 45000,
    featured: true,
    variants: ["Gris", "Negro"].map((c) => ({ name: c, options: { Color: c }, stock: 4 })),
  },
  {
    name: "Maceta con Suculenta",
    slug: "maceta-suculenta",
    description: "Suculenta en maceta de cerámica esmaltada. Bajo mantenimiento.",
    category: "hogar",
    image: "1485955900006-10f4d324d411",
    base_price: 9500,
    featured: true,
    variants: [{ name: "Única", stock: 15 }],
  },
  {
    name: "Taza de Cerámica",
    slug: "taza-ceramica",
    description: "Taza de cerámica esmaltada de 350 ml. Apta microondas y lavavajillas.",
    category: "hogar",
    image: "1514228742587-6b1558fcca3d",
    base_price: 8900,
    variants: [{ name: "Única", stock: 3 }],
  },
];

interface OrderSeed {
  customer: [string, string, string];
  days: number;
  hour: number;
  status: string;
  payment: "transfer" | "cash" | "mercadopago";
  pickup?: boolean;
  items: [slug: string, variantIndex: number, quantity: number][];
}

const ORDERS: OrderSeed[] = [
  { customer: ["Lucía Gómez", "lucia.gomez@example.com", "1155550101"], days: 0, hour: 10, status: "pending", payment: "transfer", items: [["remera-basica", 2, 2], ["gorra-clasica", 0, 1]] },
  { customer: ["Martín Pérez", "martin.perez@example.com", "1155550102"], days: 1, hour: 18, status: "paid", payment: "mercadopago", items: [["zapatillas-running", 2, 1]] },
  { customer: ["Sofía Romero", "sofia.romero@example.com", "1155550103"], days: 1, hour: 11, status: "preparing", payment: "transfer", pickup: true, items: [["lampara-de-pie", 0, 1], ["maceta-suculenta", 0, 2]] },
  { customer: ["Juan Fernández", "juan.fernandez@example.com", "1155550104"], days: 2, hour: 16, status: "shipped", payment: "mercadopago", items: [["auriculares-bluetooth", 0, 1]] },
  { customer: ["Camila Díaz", "camila.diaz@example.com", "1155550105"], days: 3, hour: 9, status: "delivered", payment: "cash", pickup: true, items: [["taza-ceramica", 0, 4]] },
  { customer: ["Tomás Álvarez", "tomas.alvarez@example.com", "1155550106"], days: 4, hour: 20, status: "delivered", payment: "transfer", items: [["buzo-canguro", 1, 1], ["remera-basica", 3, 1]] },
  { customer: ["Valentina Ruiz", "valentina.ruiz@example.com", "1155550107"], days: 5, hour: 13, status: "cancelled", payment: "transfer", items: [["reloj-inteligente", 0, 1]] },
  { customer: ["Nicolás Torres", "nicolas.torres@example.com", "1155550108"], days: 12, hour: 15, status: "delivered", payment: "mercadopago", items: [["mochila-urbana", 0, 1], ["anteojos-de-sol", 0, 1]] },
  { customer: ["Agustina Sosa", "agustina.sosa@example.com", "1155550109"], days: 26, hour: 17, status: "delivered", payment: "transfer", items: [["jogger-lino", 1, 2]] },
];

export const DEMO_SETTINGS: Row = {
  id: 1,
  name: "Mi Tienda",
  tagline: "Productos de calidad, directo a tu casa",
  description: "Tienda online de demostración: ecommerce con catálogo, carrito, checkout y panel de administración.",
  logo_url: null,
  hero_image_url: img("1441986300917-64674bd600d8"),
  primary_color: "#4f46e5",
  currency: "ARS",
  locale: "es-AR",
  whatsapp: null,
  email: "hola@mitienda.com",
  instagram: null,
  address: "Av. Siempre Viva 742, CABA",
  bank_transfer_info: "Alias: MI.TIENDA.DEMO\nCBU: 0000003100000000000000\nTitular: Mi Tienda SRL",
  shipping_cost: 4500,
  free_shipping_threshold: 60000,
  delivery_enabled: true,
  pickup_enabled: true,
  pickup_address: "Av. Siempre Viva 742, CABA — Lun a Vie de 10 a 18 hs",
  transfer_enabled: true,
  cash_enabled: true,
  mp_enabled: false,
  updated_at: daysAgo(30),
};

export function createSeed(): DemoDB {
  const categories = CATEGORIES.map((c, i) => ({
    id: demoId("c", i + 1),
    name: c.name,
    slug: c.slug,
    description: c.description,
    image_url: img(c.image),
    position: i + 1,
    active: true,
    created_at: daysAgo(60),
  }));

  const products: Row[] = [];
  const product_variants: Row[] = [];
  let variantN = 0;
  PRODUCTS.forEach((p, i) => {
    const id = demoId("a", i + 1);
    const created = daysAgo(40 - i * 2);
    products.push({
      id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      category_id: categories.find((c) => c.slug === p.category)!.id,
      images: [img(p.image)],
      base_price: p.base_price,
      compare_at_price: p.compare_at_price ?? null,
      featured: p.featured ?? false,
      active: true,
      created_at: created,
      updated_at: created,
    });
    p.variants.forEach((v, position) => {
      product_variants.push({
        id: demoId("b", ++variantN),
        product_id: id,
        name: v.name,
        options: v.options ?? {},
        price: v.price ?? null,
        stock: v.stock,
        sku: null,
        position,
        active: true,
        created_at: created,
      });
    });
  });

  const orders: Row[] = [];
  const order_items: Row[] = [];
  let itemN = 0;
  ORDERS.forEach((o, i) => {
    const id = demoId("d", i + 1);
    let subtotal = 0;
    for (const [slug, vIndex, quantity] of o.items) {
      const product = products.find((p) => p.slug === slug)!;
      const variant = product_variants.filter((v) => v.product_id === product.id)[vIndex];
      const unit_price = variant.price ?? product.base_price;
      subtotal += unit_price * quantity;
      order_items.push({
        id: demoId("e", ++itemN),
        order_id: id,
        product_id: product.id,
        variant_id: variant.id,
        product_name: product.name,
        variant_name: variant.name === "Única" ? null : variant.name,
        image_url: product.images[0],
        unit_price,
        quantity,
      });
    }
    const shipping_cost =
      o.pickup || subtotal >= DEMO_SETTINGS.free_shipping_threshold ? 0 : DEMO_SETTINGS.shipping_cost;
    const created_at = daysAgo(o.days, o.hour);
    orders.push({
      id,
      number: 1001 + i,
      user_id: null,
      customer_name: o.customer[0],
      customer_email: o.customer[1],
      customer_phone: o.customer[2],
      shipping_method: o.pickup ? "pickup" : "delivery",
      address: o.pickup ? null : "Calle Falsa 123",
      city: o.pickup ? null : "CABA",
      province: o.pickup ? null : "Buenos Aires",
      zip: o.pickup ? null : "1414",
      notes: null,
      payment_method: o.payment,
      status: o.status,
      subtotal,
      shipping_cost,
      total: subtotal + shipping_cost,
      mp_preference_id: null,
      mp_payment_id: o.payment === "mercadopago" && o.status !== "pending" ? `9000000${i}` : null,
      paid_at: ["paid", "preparing", "shipped", "delivered"].includes(o.status) ? created_at : null,
      created_at,
    });
  });

  return {
    store_settings: [{ ...DEMO_SETTINGS }],
    categories,
    products,
    product_variants,
    orders,
    order_items,
    profiles: [
      { id: DEMO_ADMIN_ID, full_name: "Admin Demo", phone: null, role: "admin", created_at: daysAgo(60) },
    ],
    users: [{ id: DEMO_ADMIN_ID, email: DEMO_ADMIN.email, password: DEMO_ADMIN.password }],
    nextOrderNumber: 1001 + ORDERS.length,
  };
}
