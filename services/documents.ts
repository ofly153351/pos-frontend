import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";
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
