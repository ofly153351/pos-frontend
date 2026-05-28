import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest, authorizedRawRequest } from "@/services/api";
import type {
  BulkActionPayload,
  CreateDocumentPayload,
  Document,
  DocumentListQuery,
  DocumentListResponse,
  UpdateDocumentStatusPayload,
} from "@/types/document";

function base() {
  const storeId = getCurrentStoreId();
  if (!storeId) throw new Error("No active store");
  return `/api/stores/${storeId}/documents`;
}

function buildParams(query: DocumentListQuery): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  return params.toString();
}

export async function getDocuments(query: DocumentListQuery): Promise<DocumentListResponse> {
  const qs = buildParams(query);
  const res = await authorizedApiRequest<DocumentListResponse>(`${base()}?${qs}`);
  return res.data;
}

export async function getDocument(id: string): Promise<Document> {
  const res = await authorizedApiRequest<Document>(`${base()}/${id}`);
  return res.data;
}

export async function createDocument(payload: CreateDocumentPayload): Promise<Document> {
  const res = await authorizedApiRequest<Document>(base(), { method: "POST", body: payload });
  return res.data;
}

export async function updateDocumentStatus(id: string, payload: UpdateDocumentStatusPayload): Promise<void> {
  await authorizedApiRequest(`${base()}/${id}/status`, { method: "PUT", body: payload });
}

export async function deleteDocument(id: string): Promise<void> {
  await authorizedApiRequest(`${base()}/${id}`, { method: "DELETE" });
}

export async function bulkDocumentAction(payload: BulkActionPayload): Promise<void> {
  await authorizedApiRequest(`${base()}/bulk`, { method: "POST", body: payload });
}

export async function getDocumentPrintHtml(id: string): Promise<string> {
  return authorizedRawRequest<string>(`${base()}/${id}/print`, { method: "GET", responseType: "text" });
}

export interface InvoicePDFParams {
  customer_address?: string;
  customer_tax_id?: string;
  credit_term?: number;
  reference_do?: string;
  discount_percent?: number;
  default_unit?: string;
  bank_name?: string;
  account_number?: string;
  promptpay?: string;
}

export interface StatementPDFParams {
  customer_id: string;
  period_start?: string;
  period_end?: string;
  bank_name?: string;
  account_number?: string;
  note?: string;
}

export async function getDocumentPdfBlob(id: string, params?: InvoicePDFParams): Promise<Blob> {
  const url = getDocumentPDFUrl(id, params);
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`PDF fetch failed: ${res.status}`);
  return res.blob();
}

export function getDocumentPDFUrl(id: string, params?: InvoicePDFParams): string {
  const storeId = getCurrentStoreId();
  if (!storeId) throw new Error("No active store");
  const qs = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    }
  }
  const q = qs.toString();
  return `/api/stores/${storeId}/documents/${id}/pdf${q ? `?${q}` : ""}`;
}

export interface WHTCertParams {
  receiver_type?: "individual" | "company";
  income_type?: string;
  income_desc?: string;
  wht_rate?: number;
}

export function getWHTCertUrl(id: string, params?: WHTCertParams): string {
  const storeId = getCurrentStoreId();
  if (!storeId) throw new Error("No active store");
  const qs = new URLSearchParams();
  if (params?.receiver_type) qs.set("receiver_type", params.receiver_type);
  if (params?.income_type) qs.set("income_type", params.income_type);
  if (params?.income_desc) qs.set("income_desc", params.income_desc);
  if (params?.wht_rate != null) qs.set("wht_rate", String(params.wht_rate));
  const q = qs.toString();
  return `/api/stores/${storeId}/documents/${id}/wht-cert${q ? `?${q}` : ""}`;
}

export async function getWHTCertHtml(id: string, params?: WHTCertParams): Promise<string> {
  const storeId = getCurrentStoreId();
  if (!storeId) throw new Error("No active store");
  const qs = new URLSearchParams();
  if (params?.receiver_type) qs.set("receiver_type", params.receiver_type);
  if (params?.income_type) qs.set("income_type", params.income_type);
  if (params?.income_desc) qs.set("income_desc", params.income_desc);
  if (params?.wht_rate != null) qs.set("wht_rate", String(params.wht_rate));
  const path = `/api/stores/${storeId}/documents/${id}/wht-cert${qs.toString() ? `?${qs.toString()}` : ""}`;
  return authorizedRawRequest<string>(path, { method: "GET", responseType: "text" });
}

export function getStatementPDFUrl(params: StatementPDFParams): string {
  const storeId = getCurrentStoreId();
  if (!storeId) throw new Error("No active store");
  const qs = new URLSearchParams({ customer_id: params.customer_id });
  if (params.period_start) qs.set("period_start", params.period_start);
  if (params.period_end) qs.set("period_end", params.period_end);
  if (params.bank_name) qs.set("bank_name", params.bank_name);
  if (params.account_number) qs.set("account_number", params.account_number);
  if (params.note) qs.set("note", params.note);
  return `/api/stores/${storeId}/documents/statement?${qs.toString()}`;
}
