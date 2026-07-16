import { authorizedApiRequest } from "@/services/api";
import { updateMember } from "@/services/members";
import { updatePromotion } from "@/services/promotions";
import { updateReceiptSettings } from "@/services/receipt-settings";
import type { ActivityLogEntry } from "@/services/activity-logs";
import type { Campaign } from "@/components/promotions/promotion-types";
import type { UpdateMemberInput } from "@/types/member";
import type { UpdateReceiptSettingsInput } from "@/types/receipt-settings";
import { RESTORABLE_KINDS } from "./activity-config";
import { scalarChangedFields } from "./before-after-diff";

// Forward-only restore: re-apply an edit's previous values through the SAME update
// endpoints the UI already uses (never raw SQL). The existing endpoints enforce
// every validation — e.g. restoring a member role that would drop the last owner is
// rejected by the member service exactly as a normal edit would be. Only the changed
// fields are re-sent, so unrelated fields are never touched.

export function canRestore(entry: ActivityLogEntry): boolean {
  const kind = entry.changes?.kind;
  if (!kind || !RESTORABLE_KINDS.has(kind)) return false;
  if (entry.action !== "update") return false;
  // Promotion restore re-applies the whole campaign object; the others need at
  // least one changed scalar field to re-apply.
  if (kind === "promotion") return !!entry.changes?.fields?.data;
  return scalarChangedFields(entry.changes).length > 0;
}

// Spec §13 — every activity declares whether its previous state is recoverable, and
// if not, WHY. Financial / stock records are never restored (they need a
// compensating entry); older edits simply weren't captured; everything else has no
// previous value to put back.
export type RestoreState = "available" | "compensating" | "notCaptured" | "noPrevious";

const COMPENSATING_MODULES = new Set(["sale", "invoice", "document", "stock", "parked-bill", "purchasing"]);

export function restoreState(entry: ActivityLogEntry): RestoreState {
  if (canRestore(entry)) return "available";
  if (COMPENSATING_MODULES.has(entry.module)) return "compensating";
  if (entry.action === "update") return "notCaptured";
  return "noPrevious";
}

function before(entry: ActivityLogEntry, key: string): unknown {
  return entry.changes?.fields?.[key]?.before;
}

// Product / store updates are multipart form posts whose helpers add destructive
// "clear" flags — so restore builds its own minimal FormData with ONLY the changed
// fields (clearing a cleared field explicitly where the column allows it).
const PRODUCT_FORM_KEY: Record<string, string> = { product_unit_id: "unit_id" };
const PRODUCT_CLEARABLE: Record<string, string> = {
  sku: "clear_sku",
  barcode: "clear_barcode",
  default_location_id: "clear_default_location",
};

async function restoreProduct(entry: ActivityLogEntry) {
  const fd = new FormData();
  for (const key of scalarChangedFields(entry.changes)) {
    if (key === "image_url") continue; // image binary can't be restored from a URL
    const val = before(entry, key);
    if (key === "is_active") {
      fd.set("is_active", String(val === true));
      continue;
    }
    const formKey = PRODUCT_FORM_KEY[key] ?? key;
    if (val === null || val === undefined || val === "") {
      const clearFlag = PRODUCT_CLEARABLE[key];
      if (clearFlag) {
        fd.set(formKey, "");
        fd.set(clearFlag, "true");
      }
      continue;
    }
    fd.set(formKey, String(val));
  }
  await authorizedApiRequest(`/api/stores/${entry.store_id}/products/${entry.resource_id}`, {
    body: fd,
    method: "PATCH",
  });
}

const STORE_FIELDS = ["name", "phone", "fax", "email", "website", "address", "currency_code", "tax_id", "promptpay_id"];

async function restoreStore(entry: ActivityLogEntry) {
  const fd = new FormData();
  for (const key of scalarChangedFields(entry.changes)) {
    if (!STORE_FIELDS.includes(key)) continue; // skip logo_url
    const val = before(entry, key);
    fd.set(key, val === null || val === undefined ? "" : String(val));
  }
  await authorizedApiRequest(`/api/stores/${entry.store_id}`, {
    body: fd,
    method: "PUT",
  });
}

async function restoreReceiptSettings(entry: ActivityLogEntry) {
  const input: Record<string, unknown> = {};
  for (const key of scalarChangedFields(entry.changes)) {
    input[key] = before(entry, key);
  }
  await updateReceiptSettings(input as unknown as UpdateReceiptSettingsInput);
}

async function restoreMember(entry: ActivityLogEntry) {
  const input: Record<string, unknown> = {};
  const role = before(entry, "role");
  const status = before(entry, "status");
  if (role !== undefined) input.role = role;
  if (status !== undefined) input.status = status;
  await updateMember(entry.resource_id, input as unknown as UpdateMemberInput);
}

async function restorePromotion(entry: ActivityLogEntry) {
  const data = entry.changes?.fields?.data?.before;
  if (!data || typeof data !== "object") throw new Error("missing previous campaign");
  await updatePromotion(entry.resource_id, data as Campaign);
}

export async function restoreActivity(entry: ActivityLogEntry): Promise<void> {
  const kind = entry.changes?.kind;
  switch (kind) {
    case "product":
      return restoreProduct(entry);
    case "store":
      return restoreStore(entry);
    case "receipt_settings":
      return restoreReceiptSettings(entry);
    case "member":
      return restoreMember(entry);
    case "promotion":
      return restorePromotion(entry);
    default:
      throw new Error(`restore not supported for ${kind}`);
  }
}
