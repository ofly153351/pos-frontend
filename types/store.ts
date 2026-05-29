export type Store = {
  address?: string | null;
  created_at?: string;
  currency_code?: string | null;
  description?: string | null;
  fax?: string | null;
  email?: string | null;
  website?: string | null;
  id: string;
  logo_url?: string | null;
  name: string;
  owner_user_id?: string;
  phone?: string | null;
  promptpay_id?: string | null;
  tax_id?: string | null;
  slug?: string | null;
  subscription_period_end?: string | null;
  subscription_plan_code?: string | null;
  subscription_status?: string | null;
};

export type CreateStoreInput = {
  address?: string;
  currency_code?: string;
  description?: string;
  logo?: File | null;
  name: string;
  phone?: string;
  promptpay_id?: string;
  slug?: string;
  subscription_plan_code: string;
};

export type UpdateStoreInput = {
  address?: string;
  currency_code?: string;
  fax?: string;
  email?: string;
  website?: string;
  logo?: File | null;
  name?: string;
  phone?: string;
  promptpay_id?: string;
  tax_id?: string;
};

export type SubscriptionPlan = {
  code?: string;
  description?: string | null;
  id: string;
  name: string;
  price?: number | null;
};

export type StoreSubscription = {
  plan?: SubscriptionPlan | null;
  plan_id: string;
  status?: string;
  store_id: string;
};
