export type ProductUnit = {
  code?: string;
  description?: string | null;
  id: string;
  is_active: boolean;
  name: string;
  product_count?: number;
  updated_at?: string;
};

export type ProductBrand = {
  description?: string | null;
  id: string;
  is_active: boolean;
  name: string;
  product_count?: number;
  updated_at?: string;
};

export type ProductType = {
  description?: string | null;
  id: string;
  is_active: boolean;
  name: string;
  slug: string;
  product_count?: number;
  updated_at?: string;
};

export type Product = {
  base_price: number;
  brand?: string | null;
  brand_id?: string | null;
  brand_name?: string | null;
  cost_price?: number;
  effective_price: number;
  id: string;
  image_url?: string | null;
  is_active: boolean;
  name: string;
  product_code?: string | null;
  description?: string | null;
  storage_location?: string | null;
  product_type?: ProductType | null;
  product_type_id?: string | null;
  product_type_name?: string | null;
  max_stock?: number | null;
  min_stock?: number;
  total_stock?: number;
  sku?: string | null;
  barcode?: string | null;
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
  base_price?: string;
  brand_id?: string;
  cost_price?: string;
  description?: string;
  image?: File | null;
  initial_stock?: string;
  is_active?: boolean;
  min_stock?: string;
  name: string;
  product_code?: string;
  storage_location?: string;
  product_type_id?: string;
  sku?: string;
  barcode?: string;
  special_price?: string;
  special_price_end_at?: string;
  special_price_start_at?: string;
  supplier_id?: string;
  unit_id?: string;
};

export type ProductUnitInput = {
  code?: string;
  description?: string;
  is_active?: boolean;
  name: string;
};
