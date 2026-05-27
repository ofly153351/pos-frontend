import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";

export type Supplier = {
  id: string;
  store_id: string;
  name: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  contact_person?: string;
  note?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateSupplierInput = {
  name: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  contact_person?: string;
  note?: string;
  is_active?: boolean;
  line_id?: string;
  email?: string;
  payment_method?: "promptpay" | "bank_account";
  promptpay_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  credit_days?: number;
};

export type UpdateSupplierInput = {
  name?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  contact_person?: string;
  note?: string;
  is_active?: boolean;
};

function ensureStoreId() {
  const storeId = getCurrentStoreId();
  if (!storeId) {
    throw new Error("Missing current store");
  }
  return storeId;
}

export function listSuppliers() {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<Supplier[]>(
    `/api/stores/${currentStoreId}/suppliers`,
  );
}

export function getSupplier(supplierId: string) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<Supplier>(
    `/api/stores/${currentStoreId}/suppliers/${supplierId}`,
  );
}

export function createSupplier(input: CreateSupplierInput) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<Supplier>(
    `/api/stores/${currentStoreId}/suppliers`,
    {
      body: input,
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

export function updateSupplier(supplierId: string, input: UpdateSupplierInput) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<Supplier>(
    `/api/stores/${currentStoreId}/suppliers/${supplierId}`,
    {
      body: input,
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    },
  );
}

export function deleteSupplier(supplierId: string) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<Record<string, never>>(
    `/api/stores/${currentStoreId}/suppliers/${supplierId}`,
    {
      allowEmptyData: true,
      method: "DELETE",
    },
  );
}

// ---- Supplier Products ----

export type SupplierProduct = {
  id: string;
  supplier_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  supplier_sku: string;
  supplier_price: number;
  created_at: string;
};

export type AddSupplierProductInput = {
  product_id: string;
  supplier_sku: string;
  supplier_price: number;
};

export type UpdateSupplierProductInput = {
  supplier_sku: string;
  supplier_price: number;
};

export function listSupplierProducts(supplierId: string) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<SupplierProduct[]>(
    `/api/stores/${currentStoreId}/suppliers/${supplierId}/products`,
  );
}

export function addSupplierProduct(
  supplierId: string,
  input: AddSupplierProductInput,
) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<SupplierProduct>(
    `/api/stores/${currentStoreId}/suppliers/${supplierId}/products`,
    {
      body: input,
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

export function updateSupplierProduct(
  supplierId: string,
  productId: string,
  input: UpdateSupplierProductInput,
) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<SupplierProduct>(
    `/api/stores/${currentStoreId}/suppliers/${supplierId}/products/${productId}`,
    {
      body: input,
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    },
  );
}

export function removeSupplierProduct(supplierId: string, productId: string) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<Record<string, never>>(
    `/api/stores/${currentStoreId}/suppliers/${supplierId}/products/${productId}`,
    {
      allowEmptyData: true,
      method: "DELETE",
    },
  );
}

// ---- Create New Product and Link to Supplier ----

export type CreateSupplierProductInput = {
  name: string;
  sku?: string;
  barcode?: string;
  product_type_id?: string;
  product_unit_id?: string;
  base_price?: number;
  supplier_sku?: string;
  supplier_price?: number;
};

export function createSupplierProduct(
  supplierId: string,
  input: CreateSupplierProductInput,
) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<SupplierProduct>(
    `/api/stores/${currentStoreId}/suppliers/${supplierId}/products/create`,
    {
      body: input,
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}
