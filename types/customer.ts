export type ShippingAddress = {
  id: string;
  customer_id: string;
  label: string;
  recipient_name: string;
  recipient_phone: string;
  address: string;
  sub_district: string;
  district: string;
  province: string;
  postal_code: string;
  note: string;
  use_customer_address: boolean;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ShippingAddressInput = Omit<ShippingAddress, "id" | "customer_id" | "created_at" | "updated_at">;

export type Customer = {
  address?: string | null;
  branch?: string | null;
  created_at?: string;
  email?: string | null;
  full_name: string;
  id: string;
  is_active: boolean;
  level?: number;
  member_code?: string | null;
  note?: string | null;
  phone?: string | null;
  points?: number | null;
  store_id: string;
  tax_id?: string | null;
  // Legacy single shipping profile (kept for backwards compat)
  shipping_contact?: string | null;
  shipping_phone?: string | null;
  shipping_address?: string | null;
  shipping_province?: string | null;
  shipping_district?: string | null;
  shipping_postal_code?: string | null;
  delivery_note?: string | null;
  // Multi-address shipping (Phase 4)
  shipping_addresses?: ShippingAddress[];
  total_bills?: number | null;
  total_purchase?: number | null;
  updated_at?: string;
};

export type CustomerLevelDiscount = {
  discount_percent: number;
  level: number;
  store_id: string;
};

export type CreateCustomerInput = {
  address?: string;
  branch?: string;
  email?: string;
  full_name: string;
  is_active: boolean;
  level?: number;
  note?: string;
  phone?: string;
  tax_id?: string;
  shipping_contact?: string;
  shipping_phone?: string;
  shipping_address?: string;
  shipping_province?: string;
  shipping_district?: string;
  shipping_postal_code?: string;
  delivery_note?: string;
};

export type UpdateCustomerInput = Partial<CreateCustomerInput>;
