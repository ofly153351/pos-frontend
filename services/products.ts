import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";
import type {
  Product,
  ProductListPage,
  ProductInput,
  ProductType,
  ProductTypeInput,
  ProductUnit,
  ProductUnitInput,
} from "@/types/product";

function ensureStoreId() {
  const storeId = getCurrentStoreId();

  if (!storeId) {
    throw new Error("Missing current store");
  }

  return storeId;
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

  if (input.unit_id) {
    formData.set("unit_id", input.unit_id);
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
  return authorizedApiRequest<ProductType[]>(
    `/api/stores/${currentStoreId}/product-types`,
  );
}

export function createProductType(input: ProductTypeInput) {
  const currentStoreId = ensureStoreId();

  return authorizedApiRequest<ProductType>(
    `/api/stores/${currentStoreId}/product-types`,
    {
      body: input,
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
}

export function updateProductType(productTypeId: string, input: ProductTypeInput) {
  const currentStoreId = ensureStoreId();

  return authorizedApiRequest<ProductType>(
    `/api/stores/${currentStoreId}/product-types/${productTypeId}`,
    {
      body: input,
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    },
  );
}

export function deleteProductType(productTypeId: string) {
  const currentStoreId = ensureStoreId();

  return authorizedApiRequest<Record<string, never>>(
    `/api/stores/${currentStoreId}/product-types/${productTypeId}`,
    {
      allowEmptyData: true,
      method: "DELETE",
    },
  );
}

type ListProductsOptions = {
  limit?: number;
  page?: number;
};

export async function listProducts(options: ListProductsOptions = {}) {
  const currentStoreId = ensureStoreId();
  const page = options.page ?? 1;
  const limit = options.limit ?? 50;
  const response = await authorizedApiRequest<Product[] | ProductListPage>(
    `/api/stores/${currentStoreId}/products?page=${page}&limit=${limit}`,
  );

  const normalizedData: ProductListPage = Array.isArray(response.data)
    ? {
        has_next: false,
        has_prev: false,
        items: response.data,
        limit: response.data.length,
        page: 1,
        total: response.data.length,
        total_pages: 1,
      }
    : response.data;

  return {
    ...response,
    data: normalizedData,
  };
}

export function createProduct(input: ProductInput) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<Product>(`/api/stores/${currentStoreId}/products`, {
    body: buildProductFormData(input),
    method: "POST",
  });
}

export function updateProduct(productId: string, input: ProductInput) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<Product>(
    `/api/stores/${currentStoreId}/products/${productId}`,
    {
      body: buildProductFormData(input),
      method: "PATCH",
    },
  );
}

export function deleteProduct(productId: string) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<Record<string, never>>(
    `/api/stores/${currentStoreId}/products/${productId}`,
    {
      allowEmptyData: true,
      method: "DELETE",
    },
  );
}

export function listProductUnits() {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<ProductUnit[]>(
    `/api/stores/${currentStoreId}/product-units`,
  );
}

export function createProductUnit(input: ProductUnitInput) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<ProductUnit>(
    `/api/stores/${currentStoreId}/product-units`,
    {
      body: input,
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
}

export function updateProductUnit(unitId: string, input: ProductUnitInput) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<ProductUnit>(
    `/api/stores/${currentStoreId}/product-units/${unitId}`,
    {
      body: input,
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    },
  );
}

export function deleteProductUnit(unitId: string) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<Record<string, never>>(
    `/api/stores/${currentStoreId}/product-units/${unitId}`,
    {
      allowEmptyData: true,
      method: "DELETE",
    },
  );
}
