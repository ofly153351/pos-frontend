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
};

export type UpdateCustomerInput = Partial<CreateCustomerInput>;
