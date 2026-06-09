// Explicit types for the Promotion & Campaign Engine module.
// All data is stored client-side (localStorage) until backend tables are added.

export type PromotionType =
  | "percentage"
  | "fixed_amount"
  | "fixed_price"
  | "buy_x_get_y"
  | "spend_x_discount"
  | "spend_x_gift"
  | "bundle"
  | "member_price"
  | "coupon"
  | "happy_hour"
  | "cylinder_exchange"; // Gas shop: return old cylinder → discount

export type CampaignStatus = "draft" | "active" | "scheduled" | "expired" | "paused";

export type ScopeType = "store" | "category" | "brand" | "products";

export type LimitType = "unlimited" | "total" | "per_customer" | "daily";

export type CylinderSize = "7kg" | "15kg" | "48kg";

export type CustomerType = "retail" | "wholesale";

export interface Campaign {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string; // one of CAMPAIGN_COLOR_KEYS
  type: PromotionType;
  status: CampaignStatus; // stored: draft | active | paused — computed adds scheduled/expired
  priority: number;

  // Type-specific value config (all optional — only relevant fields used per type)
  percentOff?: number;
  amountOff?: number;
  fixedPrice?: number;
  originalPrice?: number;
  buyQty?: number;
  getQty?: number;
  freeProduct?: string;
  minSpend?: number;
  discountAmount?: number;
  giftDescription?: string;
  bundlePrice?: number;
  memberPrice?: number;
  memberLevels?: number[];
  couponCode?: string;
  // Gas shop — cylinder exchange
  cylinderTypes?: CylinderSize[]; // which cylinder sizes this exchange promo applies to
  exchangeDiscount?: number;      // flat discount per cylinder exchange

  // Scope
  scopeType: ScopeType;
  scopeIds: string[]; // category/brand names or product SKUs

  // Conditions
  minAmount?: number;
  minQty?: number;
  vipOnly: boolean;
  memberOnly: boolean;
  customerTypes?: CustomerType[]; // empty = all customer types (retail + wholesale)

  // Schedule
  startDate?: string; // ISO date string
  endDate?: string;
  daysOfWeek: number[]; // 0=Sun … 6=Sat; empty = every day
  happyHourStart?: string; // "HH:mm"
  happyHourEnd?: string;

  // Limits
  limitType: LimitType;
  totalLimit?: number;
  perCustomerLimit?: number;
  dailyLimit?: number;

  // Conflict rules
  stackable: boolean;
  conflictRule: "stack" | "best";

  // Analytics (client-side tracked)
  usageCount: number;
  usageToday: number;
  revenueGenerated: number;
  discountGiven: number;
  lastUsedDate?: string; // "YYYY-MM-DD" for daily reset

  createdAt: string;
  updatedAt: string;
}

// ── Dictionary type ──────────────────────────────────────────────────────────

export type PromotionDictionary = {
  title: string;
  subtitle: string;
  newCampaign: string;
  editCampaign: string;

  kpi: {
    active: string;
    scheduled: string;
    expired: string;
    totalUses: string;
    revenueGenerated: string;
    discountGiven: string;
    usagesToday: string;
  };

  list: {
    search: string;
    filterType: string;
    filterStatus: string;
    allTypes: string;
    allStatuses: string;
    gridView: string;
    tableView: string;
    empty: string;
    col: {
      name: string;
      type: string;
      scope: string;
      status: string;
      priority: string;
      usage: string;
      start: string;
      end: string;
      actions: string;
    };
    action: {
      edit: string;
      duplicate: string;
      pause: string;
      resume: string;
      delete: string;
      deleteConfirm: string;
      activate: string;
    };
    noEnd: string;
    usageTimes: string;
    priorityLabel: string;
  };

  status: {
    draft: string;
    active: string;
    scheduled: string;
    expired: string;
    paused: string;
  };

  type: {
    percentage: string;
    percentageDesc: string;
    fixed_amount: string;
    fixedAmountDesc: string;
    fixed_price: string;
    fixedPriceDesc: string;
    buy_x_get_y: string;
    buyXGetYDesc: string;
    spend_x_discount: string;
    spendXDiscountDesc: string;
    spend_x_gift: string;
    spendXGiftDesc: string;
    bundle: string;
    bundleDesc: string;
    member_price: string;
    memberPriceDesc: string;
    coupon: string;
    couponDesc: string;
    happy_hour: string;
    happyHourDesc: string;
    cylinder_exchange: string;
    cylinderExchangeDesc: string;
  };

  wizard: {
    info: string;
    type: string;
    scope: string;
    conditions: string;
    schedule: string;
    preview: string;
    stepOf: string;
    back: string;
    next: string;
    create: string;
    update: string;
    cancel: string;
    creating: string;
  };

  info: {
    title: string;
    subtitle: string;
    name: string;
    namePlaceholder: string;
    nameRequired: string;
    description: string;
    descriptionPlaceholder: string;
    icon: string;
    color: string;
  };

  typeConfig: {
    title: string;
    subtitle: string;
    config: string;
    percentOff: string;
    amountOff: string;
    fixedPrice: string;
    originalPrice: string;
    buyQty: string;
    getQty: string;
    freeProduct: string;
    freeProductPlaceholder: string;
    minSpend: string;
    discountAmount: string;
    giftDescription: string;
    giftDescPlaceholder: string;
    bundlePrice: string;
    memberPrice: string;
    memberLevels: string;
    couponCode: string;
    couponCodePlaceholder: string;
    couponCodeHelp: string;
    requiredField: string;
    // Gas shop
    cylinderTypes: string;
    cylinderType7kg: string;
    cylinderType15kg: string;
    cylinderType48kg: string;
    exchangeDiscount: string;
    exchangeDiscountHelp: string;
  };

  scopeStep: {
    title: string;
    subtitle: string;
    store: string;
    storeDesc: string;
    category: string;
    categoryDesc: string;
    brand: string;
    brandDesc: string;
    products: string;
    productsDesc: string;
    tagPlaceholder: string;
    tagHint: string;
    noneSelected: string;
  };

  conditionsStep: {
    title: string;
    subtitle: string;
    minAmount: string;
    minAmountPlaceholder: string;
    minQty: string;
    minQtyPlaceholder: string;
    vipOnly: string;
    vipOnlyHelp: string;
    memberOnly: string;
    memberOnlyHelp: string;
    optional: string;
    customerTypes: string;
    customerTypesHelp: string;
    customerTypeRetail: string;
    customerTypeWholesale: string;
  };

  scheduleStep: {
    title: string;
    subtitle: string;
    startDate: string;
    endDate: string;
    noEndDate: string;
    daysOfWeek: string;
    allDays: string;
    happyHour: string;
    happyHourFrom: string;
    happyHourTo: string;
    priority: string;
    priorityHelp: string;
    priorityHint: string;
    stackable: string;
    stackableHelp: string;
    limitType: string;
    unlimited: string;
    totalLimit: string;
    perCustomerLimit: string;
    dailyLimit: string;
    limitValue: string;
    days: {
      sun: string;
      mon: string;
      tue: string;
      wed: string;
      thu: string;
      fri: string;
      sat: string;
    };
  };

  previewStep: {
    title: string;
    subtitle: string;
    testSection: string;
    testPrice: string;
    testQty: string;
    testCustomerLevel: string;
    testCustomerType: string;
    testCylinderSize: string;
    noLevel: string;
    anyType: string;
    anySize: string;
    calculate: string;
    resultSection: string;
    originalTotal: string;
    discount: string;
    finalTotal: string;
    promotionApplies: string;
    promotionNotApplies: string;
    reason: string;
    summarySection: string;
    summaryType: string;
    summaryScope: string;
    summarySchedule: string;
    summaryPriority: string;
    discountValue: string;
    conditionsSummary: string;
    scheduleSummary: string;
    limitsSummary: string;
    always: string;
    noConditions: string;
  };

  sections: {
    basicInfo: string;
    promoType: string;
    config: string;
    scope: string;
    conditions: string;
    schedule: string;
    limits: string;
    livePreview: string;
    simulator: string;
    conflicts: string;
    impact: string;
  };

  impact: {
    title: string;
    allStore: string;
    categories: string;
    brands: string;
    products: string;
    none: string;
  };

  stackableNote: string;
  exclusiveNote: string;
  simulatorToggle: string;
  conflictTitle: string;
  conflictBody: string;
  statusLabel: string;
  activateLabel: string;
  draftLabel: string;
  saveDraft: string;
  noTypeHint: string;
  created: string;
  updated: string;
  deleted: string;
  duplicated: string;
  paused: string;
  resumed: string;
  activated: string;
};
