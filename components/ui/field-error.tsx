/**
 * FieldError — inline red text shown beneath a form input.
 * Renders nothing when message is falsy.
 *
 * Usage:
 *   <input ... />
 *   <FieldError message={fieldErrors.name} />
 */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 flex items-center gap-1 text-xs font-medium text-red-500">
      <span aria-hidden="true">✕</span>
      {message}
    </p>
  );
}
