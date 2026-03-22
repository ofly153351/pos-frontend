export const pendingPlanIdKey = "pos-pending-plan";

export type PendingPlanChoice = {
  code: string;
  id: string;
};

export function getPendingPlanChoice(): PendingPlanChoice | null {
  const rawValue = window.localStorage.getItem(pendingPlanIdKey);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as PendingPlanChoice;
  } catch {
    window.localStorage.removeItem(pendingPlanIdKey);
    return null;
  }
}

export function savePendingPlanChoice(plan: PendingPlanChoice) {
  window.localStorage.setItem(pendingPlanIdKey, JSON.stringify(plan));
}

export function clearPendingPlanId() {
  window.localStorage.removeItem(pendingPlanIdKey);
}
