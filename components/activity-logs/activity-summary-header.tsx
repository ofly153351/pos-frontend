import { Activity, AlertTriangle, CircleDollarSign, ShieldAlert, Lightbulb } from "lucide-react";
import { ReportKpiCard } from "@/components/reports/report-kpi-card";
import type { ActivityLogEntry } from "@/services/activity-logs";
import type { ActivityDict } from "./types";
import { deterministicInsightProvider, type InsightProvider } from "./insight-provider";
import { SEVERITY_STYLE, cn } from "./activity-config";

// The Activity Center "business overview". Honest business intelligence, not an LLM:
// the numbers and prose are derived deterministically by the InsightProvider. The
// provider is injectable so a future LLM narrative layer can drop in unchanged.
export function ActivitySummaryHeader({
  entries,
  t,
  loading,
  provider = deterministicInsightProvider,
}: {
  entries: ActivityLogEntry[];
  t: ActivityDict;
  loading?: boolean;
  provider?: InsightProvider;
}) {
  const s = provider.summarize(entries, t);

  return (
    <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 to-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 sm:text-base">
            <span aria-hidden>📊</span>
            {t.summary.title}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">{t.summary.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ReportKpiCard
          label={t.summary.total}
          value={s.total.toLocaleString()}
          icon={<Activity className="h-5 w-5" />}
          iconBg="bg-violet-100"
          iconColor="text-violet-600"
          loading={loading}
        />
        <ReportKpiCard
          label={t.summary.needsReview}
          value={s.needsReview.toLocaleString()}
          icon={<AlertTriangle className="h-5 w-5" />}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
          warning={s.needsReview > 0}
          warningHint={t.summary.needsReview}
          valueTone={s.needsReview > 0 ? "danger" : "default"}
          loading={loading}
        />
        <ReportKpiCard
          label={t.summary.profitImpact}
          value={s.profitImpact.toLocaleString()}
          icon={<CircleDollarSign className="h-5 w-5" />}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          loading={loading}
        />
        <ReportKpiCard
          label={t.summary.anomalies}
          value={s.anomalies.toLocaleString()}
          icon={<ShieldAlert className="h-5 w-5" />}
          iconBg="bg-rose-100"
          iconColor="text-rose-600"
          warning={s.anomalies > 0}
          warningHint={t.summary.anomalies}
          valueTone={s.anomalies > 0 ? "danger" : "default"}
          loading={loading}
        />
      </div>

      {/* Derived paragraph (spec §4) */}
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{s.paragraph}</p>

      {/* Single most-useful check, fully explained (why / impact / next / source) */}
      {s.insight && !loading ? (
        <div className="mt-3 rounded-xl border border-violet-100 bg-white p-3">
          <div className="flex items-center gap-2">
            <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", SEVERITY_STYLE[s.insight.severity].badge)}>
              <Lightbulb className="h-4 w-4" />
            </span>
            <p className="text-sm font-semibold text-slate-800">{s.insight.title}</p>
          </div>
          <dl className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2">
            <InsightLine label={t.summary.why} value={s.insight.why} />
            <InsightLine label={t.summary.impact} value={s.insight.impact} />
            <InsightLine label={t.summary.recommendation} value={s.insight.recommendation} />
            <InsightLine label={t.summary.source} value={s.insight.source} />
          </dl>
        </div>
      ) : null}
    </section>
  );
}

function InsightLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt className="shrink-0 font-semibold text-slate-400">{label}:</dt>
      <dd className="text-slate-600">{value}</dd>
    </div>
  );
}
