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

import { ApiError } from "@/services/api";

export type FieldErrors = Record<string, string | undefined>;

/** Maps an ApiError's structured fields into a FieldErrors state.
 *  Returns true when field errors were found (caller can skip generic toast).
 */
export function setFromApiError(
  err: ApiError,
  setErrors: (fn: (prev: FieldErrors) => FieldErrors) => void,
): boolean {
  if (err.fields?.length) {
    const map = err.fieldMap();
    setErrors(() => map);
    return true;
  }
  return false;
}

/** Returns a human-readable message for an ApiError.
 *  Falls back gracefully so the user always sees something meaningful.
 */
export function friendlyMessage(err: unknown): string {
  if (err instanceof ApiError) {
    // Prefer the server message; backend now returns meaningful text
    if (err.message && err.message !== "Request failed") return err.message;
    // Generic fallbacks by status
    if (err.status === 403) return "ไม่มีสิทธิ์ดำเนินการ";
    if (err.status === 404) return "ไม่พบข้อมูล";
    if (err.status === 409) return "ข้อมูลซ้ำหรือขัดแย้ง";
    if (err.status >= 500) return "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง";
  }
  if (err instanceof Error) return err.message;
  return "เกิดข้อผิดพลาด กรุณาลองใหม่";
}
