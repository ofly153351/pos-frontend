export type Warehouse = {
  id: string;
  store_id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  phone?: string | null;
  contact_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateWarehouseInput = {
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  contact_name?: string;
  is_active?: boolean;
};

export type UpdateWarehouseInput = {
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  contact_name?: string;
  is_active?: boolean;
};

export type WarehouseProduct = {
  id: string;
  warehouse_id: string;
  product_id: string;
  quantity: number;
  product_name: string;
  product_sku?: string | null;
  product_barcode?: string | null;
  product_price: number;
  image_url?: string | null;
  product_type_name?: string | null;
  product_unit_name?: string | null;
  product_min_stock?: number | null;
  product_max_stock?: number | null;
  product_quantity?: number | null;
  created_at: string;
};

export type AddWarehouseProductInput = {
  product_id: string;
  quantity: number;
};

export type UpdateWarehouseProductInput = {
  quantity: number;
};
