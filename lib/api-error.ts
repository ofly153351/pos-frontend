// Localized API error presentation (B23).
//
// The backend returns `{ code, message, fields: [{ field, code, message }] }`.
// Field codes are stable (pos-backend internal/platform/fieldcheck) and are
// translated through the `apiErrors` section of /locales/th.json and en.json.
// Unknown codes fall back to the backend message, and unexpected failures keep
// the HTTP status/code as a visible reference so they stay traceable.
//
// Messages are registered once per locale by <ApiErrorMessages> in the locale
// layout (server-provided, so the full dictionaries never enter client bundles).

import { ApiError } from "@/services/api";

export type ApiErrorMessages = {
  codes: Record<string, string>;
  fields: Record<string, string>;
  status: Record<string, string>;
  generic: string;
  reference: string;
  /** 409 explanations keyed by backend `error.details.reason`. */
  conflicts?: Record<string, string>;
  /** Document status labels used inside conflict messages. */
  statuses?: Record<string, string>;
};

export type ApiErrorLevel = "warning" | "error";

export type LocalizedApiError = {
  /** One-line summary suitable for a toast or <Alert>. */
  message: string;
  /** 400/409/422 are user-correctable → warning; everything else → error. */
  level: ApiErrorLevel;
  /** field → localized message, for inline errors. */
  fields: Record<string, string>;
};

// English fallback used until the layout registers the active locale.
const FALLBACK: ApiErrorMessages = {
  codes: {},
  fields: {},
  status: {},
  generic: "Something went wrong. Please try again.",
  reference: "Reference: {ref}",
};

let registered: ApiErrorMessages = FALLBACK;

export function registerApiErrorMessages(messages: ApiErrorMessages) {
  registered = messages;
}

/** The active locale's messages (e.g. for confirmation copy like below-cost). */
export function getApiErrorMessages(): ApiErrorMessages & Record<string, unknown> {
  return registered;
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

const WARNING_STATUSES = new Set([400, 409, 422]);
// Envelope texts that add nothing beyond the status itself.
const GENERIC_SERVER_MESSAGES = new Set(["Request failed", "validation failed", "invalid request body"]);

export function localizeApiError(err: unknown, messages: ApiErrorMessages = registered): LocalizedApiError {
  if (err instanceof ApiError) {
    const fields: Record<string, string> = {};
    for (const f of err.fields ?? []) {
      const label = messages.fields[f.field] ?? f.field;
      const template = f.code ? messages.codes[f.code] : undefined;
      // Known code → localized text; unknown code → backend message (still visible).
      fields[f.field] = template ? fill(template, { field: label }) : f.message;
    }
    const level: ApiErrorLevel = WARNING_STATUSES.has(err.status) ? "warning" : "error";
    const firstField = Object.values(fields)[0];
    if (firstField) return { message: firstField, level, fields };

    // Structured conflicts (B06/B07/B12): explain the rule in the user's language.
    const details = (err.details ?? null) as Record<string, unknown> | null;
    const reason = typeof details?.reason === "string" ? details.reason : "";
    const conflict = reason ? messages.conflicts?.[reason] : undefined;
    if (conflict) {
      const label = (v: unknown) => (typeof v === "string" ? messages.statuses?.[v] ?? v : "");
      const message = fill(conflict, {
        from: label(details?.from),
        to: label(details?.to),
        document_no: typeof details?.document_no === "string" ? details.document_no : "",
      });
      return { message, level, fields };
    }

    const statusText = messages.status[String(err.status)];
    if (statusText) {
      // Expected statuses with a localized meaning. For user-correctable ones
      // keep the server detail (e.g. which record conflicts, stock shortfall).
      const hasDetail = WARNING_STATUSES.has(err.status) && err.message && !GENERIC_SERVER_MESSAGES.has(err.message);
      const detail = hasDetail ? ` (${err.message})` : "";
      return { message: statusText + detail, level, fields };
    }
    // Unknown failure: show the generic text plus a traceable reference.
    const ref = [err.status, err.code].filter(Boolean).join(" · ");
    return { message: `${messages.generic} ${fill(messages.reference, { ref })}`, level, fields };
  }
  if (err instanceof Error && err.message) {
    return { message: `${messages.generic} ${fill(messages.reference, { ref: err.message })}`, level: "error", fields: {} };
  }
  return { message: messages.generic, level: "error", fields: {} };
}
