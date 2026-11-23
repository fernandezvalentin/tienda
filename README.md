# Tienda — ecommerce genérico con Next.js + Supabase

Ecommerce listo para usar en cualquier emprendimiento, comercio o empresa. Todo lo “de marca”
(nombre, logo, color, contacto, envíos, medios de pago) se configura desde el **panel de administración**,
sin tocar código.

**Stack:** Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Mercado Pago Checkout Pro

## Funcionalidades

**Tienda**
- Portada con hero, categorías y productos destacados
- Catálogo con búsqueda, filtro por categoría, orden y paginación
- Productos con galería de imágenes y **variantes** (ej. Talle × Color) con precio y stock propios
- Carrito persistente (localStorage) con control de stock
- Checkout como invitado o con cuenta: **envío a domicilio** (costo fijo + envío gratis desde un monto) o **retiro en el local**
- Pagos: **Mercado Pago**, **transferencia** (muestra los datos bancarios) y **efectivo / a coordinar**
- Página de pedido con estado, instrucciones de pago y botón para enviar el resumen por **WhatsApp**
- Registro / login, “Mi cuenta” con datos e historial de pedidos
- SEO: metadata por producto, datos estructurados (JSON-LD), `sitemap.xml` y `robots.txt`

**Administración** (`/admin`)
- Resumen: ventas del mes, pedidos pendientes, stock bajo
- Productos: alta/edición, generador de variantes, subida de imágenes a Supabase Storage
- Categorías
- Pedidos: búsqueda, filtros y cambio de estado (al cancelar se **devuelve el stock**)
- Configuración de la tienda (identidad, color, moneda, contacto, envíos, medios de pago)

**Seguridad**
- Row Level Security en todas las tablas
- Los pedidos se crean con la función `create_order` en la base: **los precios y el stock se validan en el servidor**
  (no se confía en lo que manda el navegador) y el stock se descuenta de forma atómica
- Un usuario no puede auto-asignarse el rol admin

## Puesta en marcha

### 1. Crear el proyecto en Supabase
1. Creá un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecutá el contenido de [`supabase/schema.sql`](supabase/schema.sql).
3. (Opcional) Ejecutá [`supabase/seed.sql`](supabase/seed.sql) para cargar productos de ejemplo.
4. En **Authentication → URL Configuration** poné tu URL en *Site URL* (ej. `http://localhost:3000`)
   y agregá `http://localhost:3000/auth/callback` (y la de producción) en *Redirect URLs*.

### 2. Variables de entorno
```bash
cp .env.example .env.local
```
Completá `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API).
Las de Mercado Pago son opcionales (ver más abajo).

### 3. Correr el proyecto
```bash
npm install
```
```bash
npm run dev
```
Abrí http://localhost:3000.

### 4. Crear tu usuario administrador
Registrate desde `/registro` y después, en el SQL Editor de Supabase:
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'tu@email.com');
```
Volvé a ingresar y vas a ver el link **Admin** en el header. Desde **Admin → Configuración**
cargá el nombre, logo, color, WhatsApp, datos bancarios, envíos, etc.

## Mercado Pago

1. Creá una aplicación en el [panel de desarrolladores](https://www.mercadopago.com.ar/developers/panel/app)
   (producto: *Checkout Pro*).
2. Copiá el **Access Token** (para pruebas usá las credenciales de prueba) en `MP_ACCESS_TOKEN`.
3. Copiá la **clave secreta (service_role / secret)** de Supabase en `SUPABASE_SECRET_KEY`
   (la usa el webhook para marcar el pedido como pagado; nunca la expongas en el cliente).
4. En tu aplicación de MP → **Webhooks**, configurá la URL `https://TU-DOMINIO/api/webhooks/mercadopago`
   con el evento **Pagos**, y copiá la clave secreta en `MP_WEBHOOK_SECRET`.
5. Activá “Mercado Pago” en **Admin → Configuración**.

Flujo: el cliente confirma el pedido → se crea en estado *Pendiente* → se lo redirige a Mercado Pago →
al aprobarse el pago, el webhook lo pasa a *Pagado*. Si el cliente abandona, desde la página del pedido
puede reintentar el pago.

> En `localhost` Mercado Pago no puede llamar al webhook ni hacer `auto_return` (requieren HTTPS público).
> Para probar el circuito completo en local usá un túnel (ngrok, cloudflared) y poné esa URL en `NEXT_PUBLIC_SITE_URL`.

## Deploy (Vercel)
1. Subí el repo a GitHub e importalo en [Vercel](https://vercel.com).
2. Cargá las mismas variables de entorno, con `NEXT_PUBLIC_SITE_URL` = tu dominio.
3. Agregá `https://TU-DOMINIO/auth/callback` en las Redirect URLs de Supabase.

## Estructura
```
supabase/
  schema.sql            # tablas, RLS, funciones (create_order, get_order), storage
  seed.sql              # datos de ejemplo
src/
  proxy.ts              # refresca la sesión y protege /admin y /cuenta
  app/
    (store)/            # tienda: home, productos, carrito, checkout, pedido, login, cuenta
    admin/              # panel de administración + actions.ts
    api/webhooks/mercadopago/route.ts
  components/           # UI (carrito, producto, checkout, admin)
  lib/
    supabase/           # clientes server / browser / admin
    data.ts             # consultas del catálogo
    settings.ts         # configuración de la tienda
    mercadopago.ts      # preferencia de pago, consulta de pagos, firma de webhook
    types.ts, format.ts
```

## Personalización rápida
- **Colores:** el color principal se edita en Admin → Configuración (variable CSS `--brand`, clases `bg-brand`, `text-brand`).
  El resto del estilo está en `src/app/globals.css` (clases `btn-primary`, `input`, `card`…).
- **Moneda y formato:** Admin → Configuración (`ARS` / `es-AR`, `MXN` / `es-MX`, `USD` / `en-US`, etc.).
- **Imágenes externas:** `next.config.ts` permite cualquier dominio HTTPS; restringilo si querés.

## Ideas para seguir
Cupones de descuento · envío por zonas o con cotizador (Andreani, OCA, Correo Argentino) ·
emails transaccionales (Resend) · reseñas · wishlist · reportes de ventas.
