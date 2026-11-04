/**
 * Utilities for inline form validation and API error display.
 *
 * Usage (in a component):
 *   const [fieldErrors, setFieldErrors, clearFieldError] = useFieldErrors();
 *
 *   // on submit catch
 *   if (err instanceof ApiError) {
 *     const mapped = setFromApiError(err, setFieldErrors);
 *     if (!mapped) toast.error(err.message);   // non-validation error
 *   }
 *
 *   // in JSX under each input
 *   <FieldError message={fieldErrors.name} />
 */

import { toast } from "@/components/ui/toast";
import { localizeApiError } from "@/lib/api-error";
import type { ApiError } from "@/services/api";

export type FieldErrors = Record<string, string | undefined>;

/** Maps an ApiError's structured fields into a FieldErrors state, localized
 *  through `apiErrors.codes` (B23). Returns true when field errors were found
 *  (caller can skip the generic toast).
 */
export function setFromApiError(
  err: ApiError,
  setErrors: (fn: (prev: FieldErrors) => FieldErrors) => void,
): boolean {
  if (err.fields?.length) {
    const { fields } = localizeApiError(err);
    setErrors(() => fields);
    return true;
  }
  return false;
}

/** Returns a message in the selected language for any error. Known field codes
 *  and HTTP statuses are translated; unknown failures keep a visible reference.
 */
export function friendlyMessage(err: unknown): string {
  return localizeApiError(err).message;
}

/** Shows an error toast at the right level: 400/409/422 → warning, else error. */
export function showApiError(err: unknown): string {
  const { message, level } = localizeApiError(err);
  if (level === "warning") toast.warning(message, 5000);
  else toast.error(message);
  return message;
}
