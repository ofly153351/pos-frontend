export type ProductUnit = {
  code?: string;
  description?: string | null;
  id: string;
  is_active: boolean;
  name: string;
};

export type ProductBrand = {
  description?: string | null;
  id: string;
  is_active: boolean;
  name: string;
};

export type ProductType = {
  description?: string | null;
  id: string;
  is_active: boolean;
  name: string;
  slug: string;
};

export type Product = {
  base_price: number;
  brand?: string | null;
  brand_id?: string | null;
  brand_name?: string | null;
  effective_price: number;
  id: string;
  image_url?: string | null;
  is_active: boolean;
  name: string;
  product_type?: ProductType | null;
  product_type_id?: string | null;
  product_type_name?: string | null;
  quantity: number;
  sku?: string | null;
  special_price?: number | null;
  special_price_end_at?: string | null;
  special_price_start_at?: string | null;
  unit_id: string;
  product_unit_id?: string | null;
  product_unit_name?: string | null;
  unit_type?: string | null;
};

export type ProductListPage = {
  has_next: boolean;
  has_prev: boolean;
  items: Product[];
  limit: number;
  page: number;
  total: number;
  total_pages: number;
};

export type ProductTypeInput = {
  description?: string;
  is_active?: boolean;
  name: string;
  slug?: string;
};

export type ProductInput = {
  base_price: string;
  brand_id?: string;
  image?: File | null;
  is_active?: boolean;
  name: string;
  product_type_id?: string;
  quantity?: string;
  sku?: string;
  special_price?: string;
  special_price_end_at?: string;
  special_price_start_at?: string;
  unit_id?: string;
};

export type ProductUnitInput = {
  code?: string;
  description?: string;
  is_active?: boolean;
  name: string;
};
