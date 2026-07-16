import type { ActivityLogEntry, ActivitySeverity } from "@/services/activity-logs";
import type { ActivityDict } from "./types";

// A single explainable insight. Every insight states, in business language, why it
// matters, its impact, the recommended next step, and where the data came from —
// never technical wording, never a fabricated "AI" claim.
export interface ActivityInsight {
  id: string;
  severity: ActivitySeverity;
  title: string;
  why: string;
  impact: string;
  recommendation: string;
  source: string;
}

export interface ActivitySummary {
  total: number;
  needsReview: number; // critical + high
  profitImpact: number; // touches money / stock / access
  anomalies: number; // deterministic outliers
  paragraph: string; // short, human, derived from counts
  insight: ActivityInsight | null; // the single most useful thing to check
}

// InsightProvider is the seam the spec calls for: the UI, API contract, and chat
// flow depend only on this interface. Today the deterministic provider is the
// production implementation; a future LLM provider can implement the same interface
// and become an optional narrative layer without touching any consumer. Business
// rules and numbers stay here (deterministic, explainable) — an LLM would only
// enhance the prose, never own the calculation.
export interface InsightProvider {
  summarize(entries: ActivityLogEntry[], t: ActivityDict): ActivitySummary;
  explain(entry: ActivityLogEntry, t: ActivityDict): ActivityInsight;
}

function isReview(e: ActivityLogEntry): boolean {
  return e.severity === "critical" || e.severity === "high";
}

// Profit/stock/access-affecting: destructive or value-moving actions on money,
// stock, purchasing, or settings.
function isProfitImpact(e: ActivityLogEntry): boolean {
  const moneyish = ["sale", "purchasing", "stock", "settings", "product", "invoice"].includes(e.module);
  const moving = ["void", "cancel", "delete", "adjust", "pay", "convert"].includes(e.action);
  return moneyish && moving;
}

function changedPrice(e: ActivityLogEntry): boolean {
  const f = e.changes?.fields;
  return !!f && (("base_price" in f) || ("cost_price" in f) || ("special_price" in f));
}

function tpl(s: string, n: number): string {
  return s.replace("{n}", String(n));
}

// Deterministic anomaly flags — simple, explainable outliers, not ML:
//  • a user performing 3+ deletes in this window
//  • 3+ critical actions in this window
function detectAnomalies(entries: ActivityLogEntry[]): number {
  const deletesByUser = new Map<string, number>();
  let criticals = 0;
  for (const e of entries) {
    if (e.action === "delete") deletesByUser.set(e.user_id, (deletesByUser.get(e.user_id) ?? 0) + 1);
    if (e.severity === "critical") criticals += 1;
  }
  let count = 0;
  for (const n of deletesByUser.values()) if (n >= 3) count += 1;
  if (criticals >= 3) count += 1;
  return count;
}

export const deterministicInsightProvider: InsightProvider = {
  summarize(entries, t) {
    const total = entries.length;
    const needsReview = entries.filter(isReview).length;
    const profitImpact = entries.filter(isProfitImpact).length;
    const anomalies = detectAnomalies(entries);

    const priceChanges = entries.filter((e) => e.module === "product" && e.action === "update" && changedPrice(e)).length;
    const promoChanges = entries.filter((e) => e.module === "promotion" && e.action === "update").length;
    const stockAdjusts = entries.filter((e) => e.module === "stock" && e.action === "adjust").length;
    const deletes = entries.filter((e) => e.action === "delete").length;

    const lines: string[] = [];
    if (priceChanges > 0) lines.push(tpl(t.summary.linePrice, priceChanges));
    if (promoChanges > 0) lines.push(tpl(t.summary.linePromo, promoChanges));
    if (stockAdjusts > 0) lines.push(tpl(t.summary.lineStock, stockAdjusts));
    if (deletes > 0) lines.push(tpl(t.summary.lineDelete, deletes));
    const paragraph = lines.length > 0 ? lines.join(" · ") : t.summary.calm;

    const insight: ActivityInsight | null =
      needsReview > 0
        ? {
            id: "review",
            severity: anomalies > 0 ? "critical" : "high",
            title: tpl(t.summary.lineReview, needsReview),
            why: t.summary.reviewWhy,
            impact: t.summary.reviewImpact,
            recommendation: t.summary.reviewRec,
            source: t.summary.sourceValue,
          }
        : null;

    return { total, needsReview, profitImpact, anomalies, paragraph, insight };
  },

  // Per-activity explanation (the "Explain" action). Deterministic, business
  // language, structured into why / impact / recommendation / source.
  explain(entry, t) {
    const moduleLabel = t.modules[entry.module] ?? entry.module;
    const actionLabel = t.actions[entry.action] ?? entry.action;
    const changedKeys = entry.changes?.fields ? Object.keys(entry.changes.fields).filter((k) => k !== "data") : [];
    const fieldLabels = changedKeys.map((k) => t.diff.fields[k] ?? k);

    const why =
      entry.severity === "critical" || entry.severity === "high" ? t.summary.reviewWhy : t.summary.reviewImpact;
    const impact = fieldLabels.length > 0 ? `${actionLabel} · ${moduleLabel}: ${fieldLabels.join(", ")}` : `${actionLabel} · ${moduleLabel}`;

    return {
      id: entry.id,
      severity: entry.severity,
      title: `${actionLabel} — ${moduleLabel}`,
      why,
      impact,
      recommendation: t.summary.reviewRec,
      source: t.summary.sourceValue,
    };
  },
};
