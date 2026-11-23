-- =====================================================================
--  Esquema del ecommerce genérico
--  Ejecutar completo en Supabase → SQL Editor (es idempotente en lo posible)
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
--  Perfiles y roles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  created_at  timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un usuario no puede auto-asignarse el rol admin
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    -- Permite cambios desde el SQL editor / service role (auth.uid() es null)
    if auth.uid() is not null then
      raise exception 'No autorizado para cambiar el rol';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------------------------------------------------------------------
--  Configuración de la tienda (una sola fila)
-- ---------------------------------------------------------------------
create table if not exists public.store_settings (
  id                       int primary key default 1 check (id = 1),
  name                     text not null default 'Mi Tienda',
  tagline                  text default 'Productos de calidad, directo a tu casa',
  description              text,
  logo_url                 text,
  hero_image_url           text,
  primary_color            text not null default '#4f46e5',
  currency                 text not null default 'ARS',
  locale                   text not null default 'es-AR',
  whatsapp                 text,  -- formato internacional sin "+", ej: 5491122334455
  email                    text,
  instagram                text,
  address                  text,
  bank_transfer_info       text,  -- CBU / alias / titular
  shipping_cost            numeric(12,2) not null default 0,
  free_shipping_threshold  numeric(12,2),           -- null = nunca gratis
  delivery_enabled         boolean not null default true,
  pickup_enabled           boolean not null default true,
  pickup_address           text,
  transfer_enabled         boolean not null default true,
  cash_enabled             boolean not null default true,
  mp_enabled               boolean not null default false,
  updated_at               timestamptz not null default now()
);

insert into public.store_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
--  Catálogo
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  description  text,
  image_url    text,
  position     int not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text not null unique,
  description       text,
  category_id       uuid references public.categories (id) on delete set null,
  images            text[] not null default '{}',
  base_price        numeric(12,2) not null check (base_price >= 0),
  compare_at_price  numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  featured          boolean not null default false,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_active_idx on public.products (active, created_at desc);

create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  name        text not null default 'Única',
  options     jsonb not null default '{}'::jsonb,   -- {"Talle":"M","Color":"Rojo"}
  price       numeric(12,2) check (price is null or price >= 0), -- null = usa base_price
  stock       int not null default 0 check (stock >= 0),
  sku         text,
  position    int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists product_variants_product_idx on public.product_variants (product_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.store_settings;
create trigger settings_touch before update on public.store_settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
--  Pedidos
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  number            bigint generated always as identity,
  user_id           uuid references auth.users (id) on delete set null,
  customer_name     text not null,
  customer_email    text not null,
  customer_phone    text,
  shipping_method   text not null check (shipping_method in ('delivery', 'pickup')),
  address           text,
  city              text,
  province          text,
  zip               text,
  notes             text,
  payment_method    text not null check (payment_method in ('transfer', 'cash', 'mercadopago')),
  status            text not null default 'pending'
                    check (status in ('pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled')),
  subtotal          numeric(12,2) not null,
  shipping_cost     numeric(12,2) not null default 0,
  total             numeric(12,2) not null,
  mp_preference_id  text,
  mp_payment_id     text,
  paid_at           timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at desc);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid references public.products (id) on delete set null,
  variant_id    uuid references public.product_variants (id) on delete set null,
  product_name  text not null,
  variant_name  text,
  image_url     text,
  unit_price    numeric(12,2) not null,
  quantity      int not null check (quantity > 0)
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- Si un pedido se cancela, se devuelve el stock
create or replace function public.restock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.product_variants v
       set stock = v.stock + oi.quantity
      from public.order_items oi
     where oi.order_id = new.id and oi.variant_id = v.id;
  elsif old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'Un pedido cancelado no puede reactivarse';
  end if;
  if new.status = 'paid' and old.status <> 'paid' and new.paid_at is null then
    new.paid_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists orders_restock on public.orders;
create trigger orders_restock before update of status on public.orders
  for each row execute function public.restock_on_cancel();

-- ---------------------------------------------------------------------
--  RPC: crear pedido (precios y stock se validan en la base, nunca en el cliente)
--  payload = {
--    customer_name, customer_email, customer_phone, shipping_method,
--    address, city, province, zip, notes, payment_method,
--    items: [{ variant_id, quantity }]
--  }
-- ---------------------------------------------------------------------
create or replace function public.create_order(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  s            public.store_settings;
  v_order_id   uuid;
  v_subtotal   numeric(12,2) := 0;
  v_shipping   numeric(12,2) := 0;
  v_item       jsonb;
  v_qty        int;
  v_row        record;
  v_shipping_method text := payload ->> 'shipping_method';
  v_payment_method  text := payload ->> 'payment_method';
begin
  select * into s from public.store_settings where id = 1;

  if jsonb_typeof(payload -> 'items') <> 'array' or jsonb_array_length(payload -> 'items') = 0 then
    raise exception 'El carrito está vacío';
  end if;
  if coalesce(trim(payload ->> 'customer_name'), '') = '' or coalesce(trim(payload ->> 'customer_email'), '') = '' then
    raise exception 'Faltan datos del cliente';
  end if;

  -- Validar método de envío
  if v_shipping_method = 'delivery' and not s.delivery_enabled then
    raise exception 'El envío a domicilio no está disponible';
  elsif v_shipping_method = 'pickup' and not s.pickup_enabled then
    raise exception 'El retiro en el local no está disponible';
  elsif v_shipping_method not in ('delivery', 'pickup') or v_shipping_method is null then
    raise exception 'Método de envío inválido';
  end if;
  if v_shipping_method = 'delivery' and coalesce(trim(payload ->> 'address'), '') = '' then
    raise exception 'Falta la dirección de envío';
  end if;

  -- Validar método de pago
  if (v_payment_method = 'transfer' and not s.transfer_enabled)
     or (v_payment_method = 'cash' and not s.cash_enabled)
     or (v_payment_method = 'mercadopago' and not s.mp_enabled)
     or v_payment_method not in ('transfer', 'cash', 'mercadopago')
     or v_payment_method is null then
    raise exception 'Medio de pago no disponible';
  end if;

  insert into public.orders (
    user_id, customer_name, customer_email, customer_phone, shipping_method,
    address, city, province, zip, notes, payment_method, subtotal, shipping_cost, total
  ) values (
    auth.uid(),
    trim(payload ->> 'customer_name'),
    lower(trim(payload ->> 'customer_email')),
    nullif(trim(payload ->> 'customer_phone'), ''),
    v_shipping_method,
    nullif(trim(payload ->> 'address'), ''),
    nullif(trim(payload ->> 'city'), ''),
    nullif(trim(payload ->> 'province'), ''),
    nullif(trim(payload ->> 'zip'), ''),
    nullif(trim(payload ->> 'notes'), ''),
    v_payment_method,
    0, 0, 0
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(payload -> 'items') loop
    v_qty := (v_item ->> 'quantity')::int;
    if v_qty is null or v_qty <= 0 or v_qty > 999 then
      raise exception 'Cantidad inválida';
    end if;

    select v.id, v.name, v.stock, coalesce(v.price, p.base_price) as price,
           p.id as product_id, p.name as product_name, p.images[1] as image_url
      into v_row
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.id = (v_item ->> 'variant_id')::uuid
       and v.active and p.active
     for update of v;

    if not found then
      raise exception 'Un producto del carrito ya no está disponible';
    end if;
    if v_row.stock < v_qty then
      raise exception 'Stock insuficiente para "%"', v_row.product_name ||
        case when v_row.name <> 'Única' then ' (' || v_row.name || ')' else '' end;
    end if;

    update public.product_variants set stock = stock - v_qty where id = v_row.id;

    insert into public.order_items (order_id, product_id, variant_id, product_name, variant_name, image_url, unit_price, quantity)
    values (v_order_id, v_row.product_id, v_row.id, v_row.product_name,
            case when v_row.name = 'Única' then null else v_row.name end,
            v_row.image_url, v_row.price, v_qty);

    v_subtotal := v_subtotal + v_row.price * v_qty;
  end loop;

  if v_shipping_method = 'delivery' then
    if s.free_shipping_threshold is not null and v_subtotal >= s.free_shipping_threshold then
      v_shipping := 0;
    else
      v_shipping := s.shipping_cost;
    end if;
  end if;

  update public.orders
     set subtotal = v_subtotal, shipping_cost = v_shipping, total = v_subtotal + v_shipping
   where id = v_order_id;

  return v_order_id;
end;
$$;

-- Consulta de un pedido por id (para la página de confirmación, también invitados).
-- El id es un UUID aleatorio: funciona como un "link secreto".
create or replace function public.get_order(order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(o) - 'mp_preference_id' - 'mp_payment_id' - 'user_id'
         || jsonb_build_object('items', coalesce((
              select jsonb_agg(to_jsonb(oi) order by oi.product_name)
                from public.order_items oi where oi.order_id = o.id
            ), '[]'::jsonb))
    from public.orders o
   where o.id = get_order.order_id;
$$;

grant execute on function public.create_order(jsonb) to anon, authenticated;
grant execute on function public.get_order(uuid) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
--  Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.store_settings   enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;

-- profiles
drop policy if exists "profiles: ver propio o admin" on public.profiles;
create policy "profiles: ver propio o admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles: editar propio o admin" on public.profiles;
create policy "profiles: editar propio o admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- store_settings
drop policy if exists "settings: lectura pública" on public.store_settings;
create policy "settings: lectura pública" on public.store_settings
  for select using (true);
drop policy if exists "settings: admin edita" on public.store_settings;
create policy "settings: admin edita" on public.store_settings
  for update using (public.is_admin());

-- categories
drop policy if exists "categories: lectura" on public.categories;
create policy "categories: lectura" on public.categories
  for select using (active or public.is_admin());
drop policy if exists "categories: admin" on public.categories;
create policy "categories: admin" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- products
drop policy if exists "products: lectura" on public.products;
create policy "products: lectura" on public.products
  for select using (active or public.is_admin());
drop policy if exists "products: admin" on public.products;
create policy "products: admin" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- product_variants
drop policy if exists "variants: lectura" on public.product_variants;
create policy "variants: lectura" on public.product_variants
  for select using (active or public.is_admin());
drop policy if exists "variants: admin" on public.product_variants;
create policy "variants: admin" on public.product_variants
  for all using (public.is_admin()) with check (public.is_admin());

-- orders (se crean solo vía create_order)
drop policy if exists "orders: ver propios o admin" on public.orders;
create policy "orders: ver propios o admin" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "orders: admin edita" on public.orders;
create policy "orders: admin edita" on public.orders
  for update using (public.is_admin());

-- order_items
drop policy if exists "order_items: ver propios o admin" on public.order_items;
create policy "order_items: ver propios o admin" on public.order_items
  for select using (
    public.is_admin() or exists (
      select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
--  Storage: imágenes de productos
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

drop policy if exists "products bucket: lectura pública" on storage.objects;
create policy "products bucket: lectura pública" on storage.objects
  for select using (bucket_id = 'products');
drop policy if exists "products bucket: admin sube" on storage.objects;
create policy "products bucket: admin sube" on storage.objects
  for insert with check (bucket_id = 'products' and public.is_admin());
drop policy if exists "products bucket: admin edita" on storage.objects;
create policy "products bucket: admin edita" on storage.objects
  for update using (bucket_id = 'products' and public.is_admin());
drop policy if exists "products bucket: admin borra" on storage.objects;
create policy "products bucket: admin borra" on storage.objects
  for delete using (bucket_id = 'products' and public.is_admin());
