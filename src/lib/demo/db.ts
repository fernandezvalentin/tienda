import "server-only";
import { randomUUID } from "node:crypto";
import { DEMO_ORDERS_COOKIE, DEMO_SID_COOKIE, DEMO_USER_COOKIE } from "./config";
import { createSeed, type DemoDB, type Row } from "./seed";

/*
 * Imitación mínima del cliente de Supabase para el modo demo.
 * Implementa solo lo que usa la app (select con relaciones, filtros, orden, paginado,
 * insert/update/delete, las RPC create_order/get_order y auth con email + contraseña).
 *
 * Cada visitante (cookie demo_sid) tiene su propia copia de los datos de ejemplo en memoria:
 * lo que cambie en el admin solo lo ve él, y se reinicia cuando el servidor se recicla.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

interface CookieJar {
  get(name: string): { value: string } | undefined;
  set?(name: string, value: string, options?: Record<string, unknown>): unknown;
  delete?(name: string): unknown;
}

interface DemoUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: "customer" | "admin";
}

type TableName = Exclude<keyof DemoDB, "users" | "nextOrderNumber">;

interface Result {
  data: any;
  error: { code?: string; message: string } | null;
  count?: number | null;
}

// ---------------------------------------------------------------------
//  Datos por visitante
// ---------------------------------------------------------------------
const TTL_MS = 2 * 60 * 60 * 1000;
const MAX_SESSIONS = 500;

const globalForDemo = globalThis as unknown as { __demoStores?: Map<string, { db: DemoDB; touched: number }> };
const stores = (globalForDemo.__demoStores ??= new Map());

function getDb(sid: string): DemoDB {
  const now = Date.now();
  let entry = stores.get(sid);
  if (!entry) {
    for (const [key, value] of stores) {
      if (now - value.touched > TTL_MS || stores.size >= MAX_SESSIONS) stores.delete(key);
      else break; // el Map mantiene orden de inserción: los más viejos van primero
    }
    entry = { db: createSeed(), touched: now };
    stores.set(sid, entry);
  }
  entry.touched = now;
  return entry.db;
}

// ---------------------------------------------------------------------
//  Cookies
// ---------------------------------------------------------------------
const COOKIE_OPTS = { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7 } as const;

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
function decode<T>(value: string | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function setCookie(jar: CookieJar, name: string, value: string) {
  try {
    jar.set?.(name, value, COOKIE_OPTS);
  } catch {
    // Server Component: no se pueden escribir cookies (no hace falta en lecturas).
  }
}

function deleteCookie(jar: CookieJar, name: string) {
  try {
    jar.delete?.(name);
  } catch {
    /* idem */
  }
}

// ---------------------------------------------------------------------
//  Parser de select("*, rel(col, col), alias:rel(*)")
// ---------------------------------------------------------------------
type Field =
  | { type: "all" }
  | { type: "col"; name: string }
  | { type: "rel"; alias: string; name: string; fields: Field[] };

function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else current += ch;
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function parseSelect(s: string): Field[] {
  return splitTopLevel(s).map((token) => {
    if (token === "*") return { type: "all" };
    const rel = token.match(/^(?:(\w+):)?(\w+)\(([\s\S]*)\)$/);
    if (rel) return { type: "rel", alias: rel[1] ?? rel[2], name: rel[2], fields: parseSelect(rel[3]) };
    return { type: "col", name: token };
  });
}

const RELATIONS: Record<string, Record<string, { table: TableName; many: boolean; local: string; foreign: string }>> = {
  products: {
    product_variants: { table: "product_variants", many: true, local: "id", foreign: "product_id" },
    categories: { table: "categories", many: false, local: "category_id", foreign: "id" },
  },
  product_variants: {
    products: { table: "products", many: false, local: "product_id", foreign: "id" },
  },
  orders: {
    order_items: { table: "order_items", many: true, local: "id", foreign: "order_id" },
  },
};

function project(db: DemoDB, table: string, row: Row, fields: Field[]): Row {
  const out: Row = {};
  for (const f of fields) {
    if (f.type === "all") Object.assign(out, row);
    else if (f.type === "col") out[f.name] = row[f.name];
    else {
      const rel = RELATIONS[table]?.[f.name];
      if (!rel) throw new Error(`[demo] relación desconocida: ${table}.${f.name}`);
      const children = db[rel.table].filter((c) => row[rel.local] != null && c[rel.foreign] === row[rel.local]);
      out[f.alias] = rel.many
        ? children.map((c) => project(db, rel.table, c, f.fields))
        : children[0]
          ? project(db, rel.table, children[0], f.fields)
          : null;
    }
  }
  return out;
}

// ---------------------------------------------------------------------
//  Query builder
// ---------------------------------------------------------------------
function compare(a: any, b: any): number {
  if (a === b) return 0;
  if (a == null) return 1; // nulls last
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a) < String(b) ? -1 : 1;
}

function likeToRegex(pattern: string) {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp(`^${escaped}$`, "is");
}

type Filter = (row: Row) => boolean;

function parseOrFilter(expr: string): Filter {
  const conditions = expr.split(",").map((part) => {
    const [col, op, ...rest] = part.split(".");
    const value = rest.join(".");
    if (op === "ilike") {
      const re = likeToRegex(value);
      return (row: Row) => re.test(String(row[col] ?? ""));
    }
    if (op === "eq") return (row: Row) => String(row[col]) === value;
    throw new Error(`[demo] operador no soportado en or(): ${op}`);
  });
  return (row) => conditions.some((c) => c(row));
}

const UNIQUE_SLUG: TableName[] = ["products", "categories"];

const DEFAULTS: Partial<Record<TableName, () => Row>> = {
  categories: () => ({ description: null, image_url: null, position: 0, active: true }),
  products: () => ({
    description: null,
    category_id: null,
    images: [],
    compare_at_price: null,
    featured: false,
    active: true,
    updated_at: new Date().toISOString(),
  }),
  product_variants: () => ({ name: "Única", options: {}, price: null, stock: 0, sku: null, position: 0, active: true }),
};

class DemoQuery implements PromiseLike<Result> {
  private op: "select" | "insert" | "update" | "delete" = "select";
  private fields: Field[] | null = null;
  private countExact = false;
  private head = false;
  private filters: Filter[] = [];
  private sorts: { col: string; asc: boolean }[] = [];
  private window: { from: number; to: number } | null = null;
  private max: number | null = null;
  private mode: "many" | "single" | "maybe" = "many";
  private payload: Row | Row[] | null = null;

  constructor(
    private db: DemoDB,
    private table: TableName,
  ) {}

  select(columns = "*", opts?: { count?: "exact"; head?: boolean }) {
    this.fields = parseSelect(columns);
    if (opts?.count) this.countExact = true;
    if (opts?.head) this.head = true;
    return this;
  }
  insert(values: Row | Row[]) {
    this.op = "insert";
    this.payload = values;
    return this;
  }
  update(values: Row) {
    this.op = "update";
    this.payload = values;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }

  eq(col: string, value: unknown) {
    this.filters.push((r) => r[col] === value || (r[col] != null && String(r[col]) === String(value)));
    return this;
  }
  in(col: string, values: unknown[]) {
    const set = new Set(values.map(String));
    this.filters.push((r) => set.has(String(r[col])));
    return this;
  }
  gte(col: string, value: unknown) {
    this.filters.push((r) => r[col] != null && compare(r[col], value) >= 0);
    return this;
  }
  lte(col: string, value: unknown) {
    this.filters.push((r) => r[col] != null && compare(r[col], value) <= 0);
    return this;
  }
  ilike(col: string, pattern: string) {
    const re = likeToRegex(pattern);
    this.filters.push((r) => re.test(String(r[col] ?? "")));
    return this;
  }
  or(expr: string) {
    this.filters.push(parseOrFilter(expr));
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.sorts.push({ col, asc: opts?.ascending ?? true });
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  range(from: number, to: number) {
    this.window = { from, to };
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }
  returns() {
    return this;
  }

  then<A = Result, B = never>(
    onfulfilled?: ((value: Result) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve()
      .then(() => this.execute())
      .then(onfulfilled, onrejected);
  }

  private matching(): Row[] {
    return this.db[this.table].filter((r) => this.filters.every((f) => f(r)));
  }

  private shape(rows: Row[], count: number | null = null): Result {
    const projected = this.fields ? rows.map((r) => project(this.db, this.table, r, this.fields!)) : null;
    const data = projected ? structuredClone(projected) : null;
    if (this.mode === "many") return { data: this.head ? null : data, error: null, count };
    const list = data ?? [];
    if (list.length > 1 || (this.mode === "single" && list.length === 0)) {
      return { data: null, error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" } };
    }
    return { data: list[0] ?? null, error: null, count };
  }

  private slugTaken(slug: unknown, exceptIds: Set<string>) {
    return (
      UNIQUE_SLUG.includes(this.table) &&
      slug != null &&
      this.db[this.table].some((r) => r.slug === slug && !exceptIds.has(r.id))
    );
  }

  private execute(): Result {
    switch (this.op) {
      case "select": {
        let rows = this.matching();
        if (this.sorts.length) {
          rows = [...rows].sort((a, b) => {
            for (const s of this.sorts) {
              const c = compare(a[s.col], b[s.col]);
              if (c !== 0) return s.asc ? c : -c;
            }
            return 0;
          });
        }
        const count = this.countExact ? rows.length : null;
        if (this.window) rows = rows.slice(this.window.from, this.window.to + 1);
        if (this.max !== null) rows = rows.slice(0, this.max);
        return this.shape(rows, count);
      }

      case "insert": {
        const values = Array.isArray(this.payload) ? this.payload : [this.payload!];
        const now = new Date().toISOString();
        const created = values.map((v) => ({ ...DEFAULTS[this.table]?.(), id: randomUUID(), created_at: now, ...v }));
        for (const row of created) {
          if (this.slugTaken(row.slug, new Set())) return { data: null, error: { code: "23505", message: "duplicate key" } };
        }
        this.db[this.table].push(...created);
        return this.shape(created);
      }

      case "update": {
        const rows = this.matching();
        const patch = this.payload as Row;
        if ("slug" in patch && rows.length && this.slugTaken(patch.slug, new Set(rows.map((r) => r.id)))) {
          return { data: null, error: { code: "23505", message: "duplicate key" } };
        }
        for (const row of rows) {
          if (this.table === "orders" && patch.status && patch.status !== row.status) {
            if (row.status === "cancelled") {
              return { data: null, error: { code: "P0001", message: "Un pedido cancelado no puede reactivarse" } };
            }
            if (patch.status === "cancelled") restock(this.db, row.id);
            if (patch.status === "paid" && !row.paid_at) row.paid_at = new Date().toISOString();
          }
          Object.assign(row, structuredClone(patch));
          if (this.table === "products" || this.table === "store_settings") row.updated_at = new Date().toISOString();
        }
        return this.shape(rows);
      }

      case "delete": {
        const rows = this.matching();
        const ids = new Set(rows.map((r) => r.id));
        this.db[this.table] = this.db[this.table].filter((r) => !ids.has(r.id));
        cascadeDelete(this.db, this.table, ids);
        return this.shape(rows);
      }
    }
  }
}

function restock(db: DemoDB, orderId: string) {
  for (const item of db.order_items.filter((i) => i.order_id === orderId)) {
    const variant = db.product_variants.find((v) => v.id === item.variant_id);
    if (variant) variant.stock += item.quantity;
  }
}

function cascadeDelete(db: DemoDB, table: TableName, ids: Set<string>) {
  if (table === "products") {
    const variantIds = new Set(db.product_variants.filter((v) => ids.has(v.product_id)).map((v) => v.id));
    db.product_variants = db.product_variants.filter((v) => !ids.has(v.product_id));
    for (const i of db.order_items) {
      if (ids.has(i.product_id)) i.product_id = null;
      if (variantIds.has(i.variant_id)) i.variant_id = null;
    }
  }
  if (table === "product_variants") {
    for (const i of db.order_items) if (ids.has(i.variant_id)) i.variant_id = null;
  }
  if (table === "categories") {
    for (const p of db.products) if (ids.has(p.category_id)) p.category_id = null;
  }
  if (table === "orders") db.order_items = db.order_items.filter((i) => !ids.has(i.order_id));
}

// ---------------------------------------------------------------------
//  RPC (equivalentes a las funciones de supabase/schema.sql)
// ---------------------------------------------------------------------
class RpcError extends Error {}

function createOrder(db: DemoDB, userId: string | null, payload: Row): string {
  const s = db.store_settings[0];
  const items: Row[] = Array.isArray(payload.items) ? payload.items : [];
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  if (!items.length) throw new RpcError("El carrito está vacío");
  if (!text(payload.customer_name) || !text(payload.customer_email)) throw new RpcError("Faltan datos del cliente");

  const shipping = payload.shipping_method;
  if (shipping === "delivery" && !s.delivery_enabled) throw new RpcError("El envío a domicilio no está disponible");
  if (shipping === "pickup" && !s.pickup_enabled) throw new RpcError("El retiro en el local no está disponible");
  if (shipping !== "delivery" && shipping !== "pickup") throw new RpcError("Método de envío inválido");
  if (shipping === "delivery" && !text(payload.address)) throw new RpcError("Falta la dirección de envío");

  const payment = payload.payment_method;
  if (
    (payment === "transfer" && !s.transfer_enabled) ||
    (payment === "cash" && !s.cash_enabled) ||
    (payment === "mercadopago" && !s.mp_enabled) ||
    !["transfer", "cash", "mercadopago"].includes(payment)
  ) {
    throw new RpcError("Medio de pago no disponible");
  }

  // Validar todo antes de tocar el stock (en la base es una transacción).
  const lines = items.map((item) => {
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty <= 0 || qty > 999) throw new RpcError("Cantidad inválida");
    const variant = db.product_variants.find((v) => v.id === item.variant_id && v.active);
    const product = variant && db.products.find((p) => p.id === variant.product_id && p.active);
    if (!variant || !product) throw new RpcError("Un producto del carrito ya no está disponible");
    return { variant, product, qty };
  });
  const needed = new Map<string, number>();
  for (const { variant, product, qty } of lines) {
    const total = (needed.get(variant.id) ?? 0) + qty;
    needed.set(variant.id, total);
    if (variant.stock < total) {
      throw new RpcError(
        `Stock insuficiente para "${product.name}${variant.name !== "Única" ? ` (${variant.name})` : ""}"`,
      );
    }
  }

  const orderId = randomUUID();
  let subtotal = 0;
  for (const { variant, product, qty } of lines) {
    const price = variant.price ?? product.base_price;
    variant.stock -= qty;
    subtotal += price * qty;
    db.order_items.push({
      id: randomUUID(),
      order_id: orderId,
      product_id: product.id,
      variant_id: variant.id,
      product_name: product.name,
      variant_name: variant.name === "Única" ? null : variant.name,
      image_url: product.images[0] ?? null,
      unit_price: price,
      quantity: qty,
    });
  }

  let shippingCost = 0;
  if (shipping === "delivery") {
    const free = s.free_shipping_threshold !== null && subtotal >= s.free_shipping_threshold;
    shippingCost = free ? 0 : s.shipping_cost;
  }

  db.orders.push({
    id: orderId,
    number: db.nextOrderNumber++,
    user_id: userId,
    customer_name: text(payload.customer_name),
    customer_email: String(payload.customer_email).trim().toLowerCase(),
    customer_phone: text(payload.customer_phone),
    shipping_method: shipping,
    address: text(payload.address),
    city: text(payload.city),
    province: text(payload.province),
    zip: text(payload.zip),
    notes: text(payload.notes),
    payment_method: payment,
    status: "pending",
    subtotal,
    shipping_cost: shippingCost,
    total: subtotal + shippingCost,
    mp_preference_id: null,
    mp_payment_id: null,
    paid_at: null,
    created_at: new Date().toISOString(),
  });
  return orderId;
}

function getOrder(db: DemoDB, orderId: string) {
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return null;
  const rest: Row = { ...order };
  delete rest.mp_preference_id;
  delete rest.mp_payment_id;
  delete rest.user_id;
  const items = db.order_items
    .filter((i) => i.order_id === orderId)
    .sort((a, b) => compare(a.product_name, b.product_name));
  return structuredClone({ ...rest, items });
}

// Los pedidos que hace el visitante también se guardan en una cookie: si el servidor
// se recicla (o la página la sirve otra instancia), el pedido se recupera igual.
type SavedOrder = { o: Row; i: Row[] };

function rememberOrder(jar: CookieJar, db: DemoDB, orderId: string) {
  const order = db.orders.find((o) => o.id === orderId)!;
  const items = db.order_items.filter((i) => i.order_id === orderId).map((i) => ({ ...i, image_url: null }));
  const saved = decode<SavedOrder[]>(jar.get(DEMO_ORDERS_COOKIE)?.value) ?? [];
  const next = [{ o: order, i: items }, ...saved.filter((s) => s.o.id !== orderId)].slice(0, 2);
  setCookie(jar, DEMO_ORDERS_COOKIE, encode(next));
}

function restoreOrders(jar: CookieJar, db: DemoDB) {
  const saved = decode<SavedOrder[]>(jar.get(DEMO_ORDERS_COOKIE)?.value);
  for (const { o, i } of saved ?? []) {
    if (!o?.id || db.orders.some((x) => x.id === o.id)) continue;
    db.orders.push(o);
    for (const item of i) {
      const product = db.products.find((p) => p.id === item.product_id);
      db.order_items.push({ ...item, image_url: product?.images[0] ?? null });
    }
    db.nextOrderNumber = Math.max(db.nextOrderNumber, Number(o.number) + 1);
  }
}

// ---------------------------------------------------------------------
//  Cliente
// ---------------------------------------------------------------------
export function createDemoClient(jar: CookieJar) {
  const sid = jar.get(DEMO_SID_COOKIE)?.value ?? "compartido";
  const db = getDb(sid);
  let user = decode<DemoUser>(jar.get(DEMO_USER_COOKIE)?.value);

  if (user && !db.profiles.some((p) => p.id === user!.id)) {
    db.profiles.push({ id: user.id, full_name: user.full_name, phone: user.phone, role: user.role, created_at: new Date().toISOString() });
  }
  restoreOrders(jar, db);

  const login = (u: DemoUser) => {
    user = u;
    setCookie(jar, DEMO_USER_COOKIE, encode(u));
  };
  const asAuthUser = (u: DemoUser) => ({ id: u.id, email: u.email, user_metadata: { full_name: u.full_name } });

  return {
    from: (table: string) => {
      if (!(table in db) || table === "users") throw new Error(`[demo] tabla desconocida: ${table}`);
      return new DemoQuery(db, table as TableName);
    },

    async rpc(fn: string, args: Row): Promise<Result> {
      try {
        if (fn === "create_order") {
          const id = createOrder(db, user?.id ?? null, args.payload ?? {});
          rememberOrder(jar, db, id);
          return { data: id, error: null };
        }
        if (fn === "get_order") return { data: getOrder(db, String(args.order_id)), error: null };
        throw new Error(`[demo] rpc desconocida: ${fn}`);
      } catch (err) {
        if (err instanceof RpcError) return { data: null, error: { code: "P0001", message: err.message } };
        throw err;
      }
    },

    auth: {
      async getUser() {
        return { data: { user: user ? asAuthUser(user) : null }, error: null };
      },

      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const found = db.users.find((u) => u.email === email.trim().toLowerCase() && u.password === password);
        if (!found) {
          return {
            data: { user: null, session: null },
            error: { code: "invalid_credentials", message: "Invalid login credentials" },
          };
        }
        const profile = db.profiles.find((p) => p.id === found.id);
        const u: DemoUser = {
          id: found.id,
          email: found.email,
          full_name: profile?.full_name ?? null,
          phone: profile?.phone ?? null,
          role: profile?.role ?? "customer",
        };
        login(u);
        return { data: { user: asAuthUser(u), session: {} }, error: null };
      },

      async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Row } }) {
        const normalized = email.trim().toLowerCase();
        if (db.users.some((u) => u.email === normalized)) {
          return {
            data: { user: null, session: null },
            error: { code: "user_already_exists", message: "User already registered" },
          };
        }
        const id = randomUUID();
        const u: DemoUser = {
          id,
          email: normalized,
          full_name: options?.data?.full_name || null,
          phone: options?.data?.phone || null,
          role: "customer",
        };
        db.users.push({ id, email: normalized, password });
        db.profiles.push({ id, full_name: u.full_name, phone: u.phone, role: "customer", created_at: new Date().toISOString() });
        login(u);
        return { data: { user: asAuthUser(u), session: {} }, error: null };
      },

      async signOut() {
        user = null;
        deleteCookie(jar, DEMO_USER_COOKIE);
        return { error: null };
      },

      async exchangeCodeForSession() {
        return { data: { session: null }, error: { message: "No disponible en la demo" } };
      },
    },
  };
}
