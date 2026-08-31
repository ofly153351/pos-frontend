// Dictionary shape for the Finance → Expense Records page.
// Structurally matches locales/{th,en}.json `financeExpenses`.

export type ExpenseDictionary = {
  title: string;
  subtitle: string;
  loading: string;
  addBtn: string;
  kpi: {
    monthlyTotal: string;
    count: string;
    countSuffix: string;
    topCategory: string;
    average: string;
    none: string;
  };
  byCategory: { title: string; subtitle: string; empty: string };
  trend: { title: string; subtitle: string; empty: string };
  table: {
    title: string;
    colDate: string;
    colCategory: string;
    colDescription: string;
    colAmount: string;
    colMethod: string;
    colRecorder: string;
    colActions: string;
    empty: string;
    totalRow: string;
  };
  method: {
    cash: string;
    bank_transfer: string;
    promptpay: string;
    credit_card: string;
    debit_card: string;
    cheque: string;
  };
  actions: { edit: string; delete: string; deleteConfirm: string };
  form: {
    addTitle: string;
    editTitle: string;
    subtitle: string;
    date: string;
    category: string;
    categoryPlaceholder: string;
    createCategory: string;
    noCategoryMatch: string;
    newCategoryPlaceholder: string;
    addCategory: string;
    cancelCategory: string;
    errCategoryName: string;
    description: string;
    descriptionPlaceholder: string;
    amount: string;
    amountPlaceholder: string;
    method: string;
    note: string;
    notePlaceholder: string;
    cancel: string;
    save: string;
    saving: string;
    errDate: string;
    errCategory: string;
    errDescription: string;
    errAmount: string;
  };
  toast: { created: string; updated: string; deleted: string; error: string };
  readOnlyNote: string;
};
