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
  default_location_id?: string | null;
  product_type?: ProductType | null;
  product_type_id?: string | null;
  product_type_name?: string | null;
  max_stock?: number | null;
  min_stock?: number;
  // Phase W5 stock aggregate contract. The two legacy fields are historically mislabeled
  // and DEPRECATED — prefer ready_stock / storage_stock:
  total_stock?: number; // DEPRECATED: == ready_stock (sale-point sum), NOT a grand total
  warehouse_stock?: number; // DEPRECATED: grand total across all locations, NOT storage-only
  ready_stock?: number; // W5: POS-sellable stock (SUM where is_sale_point); == total_stock
  storage_stock?: number; // W5: non-sale-point storage (SUM where NOT is_sale_point)
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
  default_location_id?: string;
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
