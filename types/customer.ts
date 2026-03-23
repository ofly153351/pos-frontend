export type Customer = {
  address?: string | null;
  created_at?: string;
  email?: string | null;
  full_name: string;
  id: string;
  is_active: boolean;
  level?: number;
  note?: string | null;
  phone?: string | null;
  store_id: string;
  updated_at?: string;
};

export type CustomerLevelDiscount = {
  discount_percent: number;
  level: number;
  store_id: string;
};

export type CreateCustomerInput = {
  address?: string;
  email?: string;
  full_name: string;
  is_active: boolean;
  level?: number;
  note?: string;
  phone?: string;
};

export type UpdateCustomerInput = Partial<CreateCustomerInput>;
