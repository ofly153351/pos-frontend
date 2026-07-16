/**
 * Feature flags — read from NEXT_PUBLIC_* env vars.
 * Defaults are set so features are OFF unless explicitly enabled.
 */

/** Subscription / billing plan selector page. */
export const SUBSCRIPTION_ENABLED =
  process.env.NEXT_PUBLIC_SUBSCRIPTION_ENABLED === "true";

/** Default plan code used when subscription is disabled. */
export const DEFAULT_PLAN_CODE = "starter";
