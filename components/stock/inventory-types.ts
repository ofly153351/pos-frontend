// Explicit dictionary shapes for the Inventory + Stock-Count modules.
// These structurally match locales/{th,en}.json `inventory` and `count` sections
// (Dictionary = typeof th), so the server pages can pass dictionary.inventory /
// dictionary.count directly.

export type InventoryAdjustDictionary = {
  title: string;
  typeReceive: string;
  typeDecrease: string;
  typeSet: string;
  quantity: string;
  reason: string;
  reasonPlaceholder: string;
  reasonRequired: string;
  reference: string;
  referencePlaceholder: string;
  currentStock: string;
  newStock: string;
  difference: string;
  preview: string;
  confirm: string;
  back: string;
  save: string;
  saving: string;
  cancel: string;
  invalidNegative: string;
  success: string;
  error: string;
  location: string;
};

export type InventoryDictionary = {
  title: string;
  subtitle: string;
  search: string;
  empty: string;
  loading: string;
  openCount: string;
  kpi: {
    totalProducts: string;
    lowStock: string;
    outOfStock: string;
    stockValue: string;
    movementsToday: string;
  };
  col: {
    product: string;
    currentStock: string;
    minStock: string;
    status: string;
    location: string;
    lastMovement: string;
    actions: string;
  };
  status: { ready: string; low: string; out: string; over: string; inactive: string };
  unassigned: string;
  noMovement: string;
  min: string;
  selected: string;
  action: { adjust: string; history: string; viewProduct: string };
  adjust: InventoryAdjustDictionary;
};

export type CountDictionary = {
  title: string;
  subtitle: string;
  back: string;
  newSession: string;
  noSessions: string;
  sessionList: string;
  items: string;
  create: {
    title: string;
    name: string;
    namePlaceholder: string;
    warehouse: string;
    allWarehouses: string;
    zone: string;
    zonePlaceholder: string;
    category: string;
    allCategories: string;
    note: string;
    start: string;
    cancel: string;
  };
  status: { draft: string; counting: string; review: string; completed: string; cancelled: string };
  col: { product: string; sku: string; barcode: string; systemQty: string; countedQty: string; variance: string; status: string; note: string };
  variance: { match: string; short: string; over: string; notCounted: string };
  summary: { totalItems: string; counted: string; matched: string; short: string; over: string; totalVariance: string };
  scanPlaceholder: string;
  scanNotFound: string;
  action: { saveDraft: string; review: string; continue: string; apply: string; applying: string; cancel: string; export: string; back: string };
  review: { title: string; subtitle: string; noVariance: string; applyConfirm: string; applied: string; applyNote: string; applyError: string };
  empty: string;
  draftSaved: string;
  cancelConfirm: string;
  deleteSession: string;
};
