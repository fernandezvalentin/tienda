export type Role = "customer" | "admin";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: Role;
  created_at: string;
}

export interface StoreSettings {
  id: 1;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  primary_color: string;
  currency: string;
  locale: string;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  address: string | null;
  bank_transfer_info: string | null;
  shipping_cost: number;
  free_shipping_threshold: number | null;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  pickup_address: string | null;
  transfer_enabled: boolean;
  cash_enabled: boolean;
  mp_enabled: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  position: number;
  active: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  options: Record<string, string>;
  price: number | null;
  stock: number;
  sku: string | null;
  position: number;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  images: string[];
  base_price: number;
  compare_at_price: number | null;
  featured: boolean;
  active: boolean;
  created_at: string;
}

export interface ProductWithVariants extends Product {
  product_variants: ProductVariant[];
  categories?: Pick<Category, "name" | "slug"> | null;
}

export type OrderStatus = "pending" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled";
export type PaymentMethod = "transfer" | "cash" | "mercadopago";
export type ShippingMethod = "delivery" | "pickup";

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
}

export interface Order {
  id: string;
  number: number;
  user_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_method: ShippingMethod;
  address: string | null;
  city: string | null;
  province: string | null;
  zip: string | null;
  notes: string | null;
  payment_method: PaymentMethod;
  status: OrderStatus;
  subtotal: number;
  shipping_cost: number;
  total: number;
  paid_at: string | null;
  created_at: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface CartItem {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantName: string | null;
  price: number;
  image: string | null;
  quantity: number;
  maxStock: number;
}
