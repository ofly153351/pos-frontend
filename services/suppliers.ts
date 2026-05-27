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
  email?: string;
  line_id?: string;
  payment_method?: "promptpay" | "bank_account";
  promptpay_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  credit_days?: number;
  logo_url?: string;
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
  logo?: File;
};

export type UpdateSupplierInput = {
  name?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  contact_person?: string;
  note?: string;
  is_active?: boolean;
  email?: string;
  line_id?: string;
  payment_method?: "promptpay" | "bank_account";
  promptpay_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  credit_days?: number;
  logo?: File;
  remove_logo?: boolean;
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

function supplierToFormData(input: CreateSupplierInput | UpdateSupplierInput): FormData {
  const fd = new FormData();
  const append = (key: string, value: string | number | boolean | File | undefined | null) => {
    if (value === undefined || value === null) return;
    if (value instanceof File) fd.append(key, value);
    else fd.append(key, String(value));
  };
  append("name", (input as CreateSupplierInput).name);
  append("phone", input.phone);
  append("address", input.address);
  append("tax_id", input.tax_id);
  append("contact_person", input.contact_person);
  append("note", input.note);
  if (input.is_active !== undefined) append("is_active", input.is_active);
  append("email", input.email);
  append("line_id", input.line_id);
  append("payment_method", input.payment_method);
  append("promptpay_number", input.promptpay_number);
  append("bank_name", input.bank_name);
  append("bank_account_number", input.bank_account_number);
  append("bank_account_name", input.bank_account_name);
  if (input.credit_days !== undefined) append("credit_days", input.credit_days);
  if (input.logo) append("logo", input.logo);
  if ((input as UpdateSupplierInput).remove_logo) append("remove_logo", "true");
  return fd;
}

export function createSupplier(input: CreateSupplierInput) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<Supplier>(
    `/api/stores/${currentStoreId}/suppliers`,
    { body: supplierToFormData(input), method: "POST" },
  );
}

export function updateSupplier(supplierId: string, input: UpdateSupplierInput) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<Supplier>(
    `/api/stores/${currentStoreId}/suppliers/${supplierId}`,
    { body: supplierToFormData(input), method: "PUT" },
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
