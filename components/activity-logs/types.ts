// Shared dictionary shape for the Activity Center. The page passes
// `dictionary.activityLogs` as `t`; every string the UI renders comes from here so
// the feature stays fully localized (th + en).

export type ActivityDict = {
  title: string;
  subtitle: string;
  refreshButton: string;
  filterLabel: string;
  allModules: string;
  allActions: string;
  clearFilters: string;
  dateFrom: string;
  dateTo: string;
  colUser: string;
  colModule: string;
  colAction: string;
  colTime: string;
  loading: string;
  empty: string;
  showing: string;
  modules: Record<string, string>;
  actions: Record<string, string>;
  severities: Record<string, string>;
  categories: Record<string, string>;
  filters: {
    today: string;
    yesterday: string;
    last7: string;
    last30: string;
    allTime: string;
    severity: string;
    category: string;
    allSeverities: string;
    allCategories: string;
    searchPlaceholder: string;
  };
  card: {
    viewDetails: string;
    hideDetails: string;
    changedFields: string;
    andMore: string;
  };
  diff: {
    before: string;
    after: string;
    noDetails: string;
    empty: string;
    fields: Record<string, string>;
  };
  drawer: {
    title: string;
    who: string;
    actionLabel: string;
    when: string;
    severityLabel: string;
    categoryLabel: string;
    changedTitle: string;
    relatedTitle: string;
    noRelated: string;
    openRecord: string;
    copyId: string;
    copied: string;
    explain: string;
    restore: string;
    restoreNotAvailable: string;
    restoreReasonCompensating: string;
    restoreReasonNotCaptured: string;
    restoreReasonNoPrevious: string;
    close: string;
  };
  restore: {
    confirmTitle: string;
    confirmMessage: string;
    confirm: string;
    cancel: string;
    success: string;
    error: string;
  };
  summary: {
    title: string;
    subtitle: string;
    total: string;
    needsReview: string;
    profitImpact: string;
    anomalies: string;
    insightTitle: string;
    why: string;
    impact: string;
    recommendation: string;
    source: string;
    calm: string;
    linePrice: string;
    linePromo: string;
    lineStock: string;
    lineDelete: string;
    lineReview: string;
    reviewWhy: string;
    reviewImpact: string;
    reviewRec: string;
    sourceValue: string;
  };
  relative: {
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
  };
};
