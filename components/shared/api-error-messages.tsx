"use client";

import { registerApiErrorMessages, type ApiErrorMessages } from "@/lib/api-error";

// Registers the active locale's `apiErrors` dictionary for localizeApiError
// (B23). Rendered by the locale layout; registration happens in the browser
// only, so concurrent server renders never share a module-level locale.
export function ApiErrorMessagesRegistrar({ messages }: { messages: ApiErrorMessages }) {
  if (typeof window !== "undefined") registerApiErrorMessages(messages);
  return null;
}
