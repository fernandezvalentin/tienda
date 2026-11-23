-- =====================================================================
--  Datos de ejemplo (opcional). Ejecutar después de schema.sql
-- =====================================================================

update public.store_settings set
  name = 'Mi Tienda',
  tagline = 'Productos de calidad, directo a tu casa',
  description = 'Tienda online de ejemplo. Editá estos datos desde el panel de administración.',
  primary_color = '#4f46e5',
  whatsapp = '5491100000000',
  email = 'hola@mitienda.com',
  address = 'Av. Siempre Viva 742, CABA',
  bank_transfer_info = E'Alias: MI.TIENDA.OK\nCBU: 0000003100000000000000\nTitular: Mi Tienda SRL',
  shipping_cost = 4500,
  free_shipping_threshold = 60000,
  pickup_address = 'Av. Siempre Viva 742, CABA — Lun a Vie de 10 a 18 hs'
where id = 1;

insert into public.categories (name, slug, description, position) values
  ('Indumentaria', 'indumentaria', 'Remeras, buzos y más', 1),
  ('Accesorios',   'accesorios',   'Complementos para todos los días', 2),
  ('Hogar',        'hogar',        'Cosas lindas para tu casa', 3)
on conflict (slug) do nothing;

with c as (select id, slug from public.categories)
insert into public.products (name, slug, description, category_id, images, base_price, compare_at_price, featured)
values
  ('Remera Básica', 'remera-basica',
   'Remera de algodón peinado 24/1, corte regular. Ideal para el día a día.',
   (select id from c where slug = 'indumentaria'),
   array['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900'],
   18000, 22000, true),
  ('Buzo Canguro', 'buzo-canguro',
   'Buzo de frisa con capucha y bolsillo canguro.',
   (select id from c where slug = 'indumentaria'),
   array['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=900'],
   39000, null, true),
  ('Gorra Clásica', 'gorra-clasica',
   'Gorra de gabardina con regulador metálico.',
   (select id from c where slug = 'accesorios'),
   array['https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=900'],
   12500, null, true),
  ('Taza de Cerámica', 'taza-ceramica',
   'Taza de cerámica esmaltada de 350 ml. Apta microondas y lavavajillas.',
   (select id from c where slug = 'hogar'),
   array['https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=900'],
   8900, null, false)
on conflict (slug) do nothing;

-- Variantes
insert into public.product_variants (product_id, name, options, stock, position)
select p.id, t.talle || ' / ' || col.color,
       jsonb_build_object('Talle', t.talle, 'Color', col.color),
       10, t.pos * 10 + col.pos
  from public.products p
  cross join (values ('S', 1), ('M', 2), ('L', 3), ('XL', 4)) as t(talle, pos)
  cross join (values ('Blanco', 1), ('Negro', 2)) as col(color, pos)
 where p.slug = 'remera-basica'
   and not exists (select 1 from public.product_variants v where v.product_id = p.id);

insert into public.product_variants (product_id, name, options, price, stock, position)
select p.id, t.talle, jsonb_build_object('Talle', t.talle),
       case when t.talle = 'XXL' then 42000 else null end, 5, t.pos
  from public.products p
  cross join (values ('M', 1), ('L', 2), ('XL', 3), ('XXL', 4)) as t(talle, pos)
 where p.slug = 'buzo-canguro'
   and not exists (select 1 from public.product_variants v where v.product_id = p.id);

insert into public.product_variants (product_id, name, stock)
select p.id, 'Única', 25
  from public.products p
 where p.slug in ('gorra-clasica', 'taza-ceramica')
   and not exists (select 1 from public.product_variants v where v.product_id = p.id);
