export type Store = {
  description?: string | null;
  id: string;
  logo_url?: string | null;
  name: string;
};

export type CreateStoreInput = {
  address?: string;
  currency_code?: string;
  description?: string;
  logo?: File | null;
  name: string;
  phone?: string;
  slug: string;
  subscription_plan_code: string;
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
