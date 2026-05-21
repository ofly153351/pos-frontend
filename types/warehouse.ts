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
  product_id: string;
  quantity: number;

  // Joined fields from product_view (populated via LEFT JOIN)
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

  // New fields from stocks+locations system
  cost_price: number;
  effective_price?: number;
};

export type AddWarehouseProductInput = {
  product_id: string;
  quantity: number;
};

export type UpdateWarehouseProductInput = {
  quantity: number;
};

export type WarehouseInventoryItem = {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  source_store_id: string;
  source_warehouse_id: string;
  transferred_at: string;

  // Joined fields
  product_name: string;
  product_sku?: string | null;
  product_image_url?: string | null;
  source_store_name?: string | null;
  source_warehouse_name?: string | null;
};
