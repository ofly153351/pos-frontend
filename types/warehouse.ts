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
  product_id: string; // FK to products table (ref mode) or warehouse_product.id (standalone mode)
  quantity: number;

  // Standalone product fields (used when no product_id ref)
  standalone_name?: string;
  standalone_sku?: string;
  standalone_barcode?: string;
  standalone_price?: number;
  standalone_unit_name?: string;
  standalone_type_name?: string;

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
  created_at: string;
};

/** Returns true when the warehouse product is standalone (no products table ref) */
export function isStandaloneProduct(wp: WarehouseProduct): boolean {
  // When the API returns, standalone products have product_id = warehouse_product.id
  // and we can detect them via standalone_name being populated
  return !!wp.standalone_name;
}

/** Returns the effective display name */
export function displayProductName(wp: WarehouseProduct): string {
  return wp.product_name || wp.standalone_name || "-";
}

/** Returns the effective SKU */
export function displayProductSKU(wp: WarehouseProduct): string | null {
  return wp.product_sku || wp.standalone_sku || null;
}

/** Returns the effective barcode */
export function displayProductBarcode(wp: WarehouseProduct): string | null {
  return wp.product_barcode || wp.standalone_barcode || null;
}

export type AddWarehouseProductInput = {
  // Reference mode (links to existing product)
  product_id?: string;
  quantity: number;

  // Standalone mode fields (required when product_id is empty)
  name?: string;
  sku?: string;
  barcode?: string;
  price?: number;
  unit_name?: string;
  type_name?: string;
};

export type UpdateWarehouseProductInput = {
  quantity: number;
};

export type CreateStandaloneWarehouseProductInput = {
  quantity: number;
  name: string;
  sku?: string;
  barcode?: string;
  price?: number;
  unit_name?: string;
  type_name?: string;
};
