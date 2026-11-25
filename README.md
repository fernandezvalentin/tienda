# Tienda — e-commerce platform with Next.js + Supabase

**English** · [Español](README.es.md)

A ready-to-use online store for any small business, shop or company. Everything brand-related
(name, logo, color, contact info, shipping, payment methods) is configured from the **admin panel**,
with no code changes.

### 👉 [Live demo](https://tienda-eta-ashy.vercel.app/)

Try the whole store: browse the catalog, fill a cart and place an order. To see the admin panel, use the
**“Entrar al panel admin”** button in the top banner, or sign in with `admin@demo.com` / `demo1234`.
The data is sample data and your changes are only visible to you (see [Demo mode](#demo-mode)).

> The user interface is in Spanish: the store was built for businesses in Argentina
> (Argentine peso, Mercado Pago, bank transfers, WhatsApp).

**Stack:** Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Mercado Pago Checkout Pro

## Features

**Storefront**
- Home page with hero, categories and featured products
- Catalog with search, category filter, sorting and pagination
- Products with image gallery and **variants** (e.g. Size × Color), each with its own price and stock
- Persistent cart (localStorage) with stock limits
- Checkout as a guest or with an account: **home delivery** (flat fee + free shipping above a threshold) or **in-store pickup**
- Payments: **Mercado Pago**, **bank transfer** (shows the bank details) and **cash / arrange with the seller**
- Order page with status, payment instructions and a button to send the order summary via **WhatsApp**
- Sign up / sign in, “My account” page with profile and order history
- SEO: per-product metadata, structured data (JSON-LD), `sitemap.xml` and `robots.txt`

**Admin panel** (`/admin`)
- Dashboard: monthly sales, pending orders, low stock
- Products: create/edit, variant generator, image upload to Supabase Storage
- Categories
- Orders: search, filters and status changes (cancelling an order **restores the stock**)
- Store settings (branding, color, currency, contact, shipping, payment methods)

**Security**
- Row Level Security on every table
- Orders are created by the `create_order` database function: **prices and stock are validated on the server**
  (nothing sent by the browser is trusted) and stock is decremented atomically
- Users cannot grant themselves the admin role

## Demo mode

With `NEXT_PUBLIC_DEMO_MODE=1` (or when `NEXT_PUBLIC_SUPABASE_URL` is not set) the store runs **without Supabase**:
the client is replaced by an in-memory implementation ([`src/lib/demo/`](src/lib/demo)) with the same interface,
so the rest of the code stays unchanged. This is what the [live demo](https://tienda-eta-ashy.vercel.app/) uses.

- Loads sample data: 13 products with variants, 4 categories and orders in different states.
- Mirrors the database logic: price and stock validation in `create_order`, stock restored on cancellation,
  unique slugs and table relationships.
- Every visitor gets **their own copy** of the data (session cookie): admin edits don't affect anyone else,
  and the data resets on its own after a while.
- Includes an admin user (`admin@demo.com` / `demo1234`) and a one-click shortcut to the panel.
- Limitations: image uploads are disabled (images are added by URL) and Mercado Pago is turned off.

To run it locally:
```bash
npm install
```
```bash
NEXT_PUBLIC_DEMO_MODE=1 npm run dev
```
(or add `NEXT_PUBLIC_DEMO_MODE=1` to `.env.local`).

## Getting started (with Supabase)

### 1. Create the Supabase project
1. Create a project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run the contents of [`supabase/schema.sql`](supabase/schema.sql).
3. (Optional) Run [`supabase/seed.sql`](supabase/seed.sql) to load sample products.
4. In **Authentication → URL Configuration**, set your URL as the *Site URL* (e.g. `http://localhost:3000`)
   and add `http://localhost:3000/auth/callback` (and your production URL) to *Redirect URLs*.

### 2. Environment variables
```bash
cp .env.example .env.local
```
Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API).
The Mercado Pago variables are optional (see below).

### 3. Run the project
```bash
npm install
```
```bash
npm run dev
```
Open http://localhost:3000.

### 4. Create your admin user
Sign up at `/registro`, then run this in the Supabase SQL Editor:
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```
Sign in again and you'll see the **Admin** link in the header. From **Admin → Configuración**
set the store name, logo, color, WhatsApp number, bank details, shipping, etc.

## Mercado Pago

1. Create an application in the [developer dashboard](https://www.mercadopago.com.ar/developers/panel/app)
   (product: *Checkout Pro*).
2. Copy the **Access Token** (use the test credentials while testing) into `MP_ACCESS_TOKEN`.
3. Copy the Supabase **secret key (service_role / secret)** into `SUPABASE_SECRET_KEY`
   (the webhook uses it to mark orders as paid; never expose it to the client).
4. In your MP application → **Webhooks**, set the URL `https://YOUR-DOMAIN/api/webhooks/mercadopago`
   with the **Payments** event, and copy the secret key into `MP_WEBHOOK_SECRET`.
5. Enable “Mercado Pago” in **Admin → Configuración**.

Flow: the customer confirms the order → it is created as *Pending* → the customer is redirected to Mercado Pago →
once the payment is approved, the webhook moves the order to *Paid*. If the customer leaves, they can retry
the payment from the order page.

> On `localhost`, Mercado Pago can't call the webhook or use `auto_return` (both require public HTTPS).
> To test the full flow locally, use a tunnel (ngrok, cloudflared) and set that URL in `NEXT_PUBLIC_SITE_URL`.

## Deploy (Vercel)
1. Push the repo to GitHub and import it in [Vercel](https://vercel.com).
2. Add the same environment variables, with `NEXT_PUBLIC_SITE_URL` = your domain.
3. Add `https://YOUR-DOMAIN/auth/callback` to the Supabase Redirect URLs.

To deploy only the demo, a single environment variable is enough: `NEXT_PUBLIC_DEMO_MODE` = `1`.

## Project structure
```
supabase/
  schema.sql            # tables, RLS, functions (create_order, get_order), storage
  seed.sql              # sample data
src/
  proxy.ts              # refreshes the session and protects /admin and /cuenta
  app/
    (store)/            # storefront: home, products, cart, checkout, order, login, account
    admin/              # admin panel + actions.ts
    api/webhooks/mercadopago/route.ts
  components/           # UI (cart, product, checkout, admin)
  lib/
    supabase/           # server / browser / admin clients
    demo/               # demo mode: sample data and in-memory client
    data.ts             # catalog queries
    settings.ts         # store settings
    mercadopago.ts      # payment preference, payment lookup, webhook signature
    types.ts, format.ts
```

## Customization
- **Colors:** the main color is set in Admin → Configuración (CSS variable `--brand`, classes `bg-brand`, `text-brand`).
  The rest of the styles live in `src/app/globals.css` (classes `btn-primary`, `input`, `card`…).
- **Currency and formatting:** Admin → Configuración (`ARS` / `es-AR`, `MXN` / `es-MX`, `USD` / `en-US`, etc.).
- **External images:** `next.config.ts` allows any HTTPS domain; restrict it if you like.

## Roadmap ideas
Discount coupons · zone-based shipping or carrier quotes (Andreani, OCA, Correo Argentino) ·
transactional emails (Resend) · reviews · wishlist · sales reports.
