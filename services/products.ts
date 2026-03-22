import { getAuthSession } from "@/lib/auth-storage";
import { getCurrentStoreId } from "@/lib/store-storage";
import { ApiError } from "@/services/api";
import type { ApiResponse } from "@/types/auth";
import type {
  Product,
  ProductInput,
  ProductType,
  ProductTypeInput,
  ProductUnit,
  ProductUnitInput,
} from "@/types/product";

function getAccessToken() {
  const session = getAuthSession();
  return session?.access_token ?? "";
}

function ensureStoreId() {
  const storeId = getCurrentStoreId();

  if (!storeId) {
    throw new Error("Missing current store");
  }

  return storeId;
}

async function parseResponse<T>(response: Response) {
  let payload: ApiResponse<T>;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError("Unexpected response from server", response.status);
  }

  if (!response.ok || !payload.success || typeof payload.data === "undefined") {
    throw new ApiError(payload.message || "Request failed", response.status);
  }

  return payload as ApiResponse<T> & { data: T };
}

async function authorizedRequest<T>(path: string, init?: RequestInit) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Missing access token");
  }

  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<T>(response);
}

function buildProductFormData(input: ProductInput) {
  const formData = new FormData();

  formData.set("name", input.name);
  formData.set("base_price", input.base_price);

  if (input.sku) {
    formData.set("sku", input.sku);
  }

  if (input.product_type_id) {
    formData.set("product_type_id", input.product_type_id);
  }

  if (input.unit_type) {
    formData.set("unit_type", input.unit_type);
  }

  if (typeof input.quantity === "string") {
    formData.set("quantity", input.quantity);
  }

  if (input.special_price) {
    formData.set("special_price", input.special_price);
  }

  if (input.special_price_start_at) {
    formData.set("special_price_start_at", input.special_price_start_at);
  }

  if (input.special_price_end_at) {
    formData.set("special_price_end_at", input.special_price_end_at);
  }

  if (typeof input.is_active === "boolean") {
    formData.set("is_active", String(input.is_active));
  }

  if (input.image) {
    formData.set("image", input.image);
  }

  return formData;
}

export function listProductTypes() {
  const currentStoreId = ensureStoreId();
  return authorizedRequest<ProductType[]>(
    `/api/stores/${currentStoreId}/product-types`,
  );
}

export function createProductType(input: ProductTypeInput) {
  const currentStoreId = ensureStoreId();

  return authorizedRequest<ProductType>(
    `/api/stores/${currentStoreId}/product-types`,
    {
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
}

export function updateProductType(productTypeId: string, input: ProductTypeInput) {
  const currentStoreId = ensureStoreId();

  return authorizedRequest<ProductType>(
    `/api/stores/${currentStoreId}/product-types/${productTypeId}`,
    {
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    },
  );
}

export function deleteProductType(productTypeId: string) {
  const currentStoreId = ensureStoreId();

  return authorizedRequest<Record<string, never>>(
    `/api/stores/${currentStoreId}/product-types/${productTypeId}`,
    {
      method: "DELETE",
    },
  );
}

export function listProducts() {
  const currentStoreId = ensureStoreId();
  return authorizedRequest<Product[]>(`/api/stores/${currentStoreId}/products`);
}

export function createProduct(input: ProductInput) {
  const currentStoreId = ensureStoreId();
  return authorizedRequest<Product>(`/api/stores/${currentStoreId}/products`, {
    body: buildProductFormData(input),
    method: "POST",
  });
}

export function updateProduct(productId: string, input: ProductInput) {
  const currentStoreId = ensureStoreId();
  return authorizedRequest<Product>(
    `/api/stores/${currentStoreId}/products/${productId}`,
    {
      body: buildProductFormData(input),
      method: "PATCH",
    },
  );
}

export function deleteProduct(productId: string) {
  const currentStoreId = ensureStoreId();
  return authorizedRequest<Record<string, never>>(
    `/api/stores/${currentStoreId}/products/${productId}`,
    {
      method: "DELETE",
    },
  );
}

export function listProductUnits() {
  const currentStoreId = ensureStoreId();
  return authorizedRequest<ProductUnit[]>(
    `/api/stores/${currentStoreId}/product-units`,
  );
}

export function createProductUnit(input: ProductUnitInput) {
  const currentStoreId = ensureStoreId();
  return authorizedRequest<ProductUnit>(
    `/api/stores/${currentStoreId}/product-units`,
    {
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
}

export function updateProductUnit(unitId: string, input: ProductUnitInput) {
  const currentStoreId = ensureStoreId();
  return authorizedRequest<ProductUnit>(
    `/api/stores/${currentStoreId}/product-units/${unitId}`,
    {
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    },
  );
}

export function deleteProductUnit(unitId: string) {
  const currentStoreId = ensureStoreId();
  return authorizedRequest<Record<string, never>>(
    `/api/stores/${currentStoreId}/product-units/${unitId}`,
    {
      method: "DELETE",
    },
  );
}
