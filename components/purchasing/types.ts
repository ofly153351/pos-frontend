import type { createSupplier } from "@/services/suppliers";
import type { Supplier } from "@/services/suppliers";
import type { receiveStock } from "@/services/purchases";
import type { PurchaseOrder } from "@/services/purchases";
import type { GoodsReceiptDraft } from "@/types/goods-receipt";
import type { WorkspaceNav } from "./workspace/workspace-shared";
import type { WsDict } from "./workspace/workspace-shared";
import type { GoodsReceiptStatus } from "@/types/goods-receipt";
import type { PurchaseOrderStatus } from "./workspace/workspace-shared";
import type { PurchaseForm } from "@/components/purchasing/purchase-form";

export type AddSupplierModalPaymentMethod = "promptpay" | "bank_account";

export type AddSupplierModalCreditOption = 0 | 7 | 15 | 30 | 45 | "custom";

export interface AddSupplierModalFormState {
  companyName: string;
  contactName: string;
  phone: string;
  lineId: string;
  email: string;
  taxId: string;
  logoFile: File | null;
  logoPreviewUrl: string;
  logoError: string;
  paymentMethod: AddSupplierModalPaymentMethod;
  promptpayNumber: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  creditTerm: AddSupplierModalCreditOption;
  customDays: string;
  address: string;
  notes: string;
  isActive: boolean;
}

export interface AddSupplierModalFormErrors {
  companyName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  promptpayNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  creditTerm?: string;
  customDays?: string;
}

export type AddSupplierModalAddSupplierDict = {
  createSupplier: string;
  contactPerson: string;
  supplierPhone: string;
  address: string;
  note: string;
  save: string;
  saving: string;
  cancel: string;
  successCreated: string;
  requestFailed: string;
  addSupplierModal: {
    subtitle: string;
    timeHint: string;
    activateNow: string;
    sectionContact: string;
    sectionAdditional: string;
    companyName: string;
    companyNamePlaceholder: string;
    contactNamePlaceholder: string;
    phonePlaceholder: string;
    lineId: string;
    lineIdPlaceholder: string;
    email: string;
    emailPlaceholder: string;
    taxId: string;
    taxIdPlaceholder: string;
    errTaxId: string;
    sectionLogo: string;
    logoOptional: string;
    logoUploadText: string;
    logoUploadHint: string;
    logoRemove: string;
    logoErrType: string;
    logoErrSize: string;
    sectionFinancial: string;
    paymentMethodLabel: string;
    promptpay: string;
    bankAccount: string;
    promptpayNumber: string;
    promptpayNumberPlaceholder: string;
    promptpayHint: string;
    bankNameLabel: string;
    bankAccountNumber: string;
    bankAccountName: string;
    bankAccountNumberPlaceholder: string;
    bankAccountNamePlaceholder: string;
    selectBankPlaceholder: string;
    creditTerm: string;
    creditCash: string;
    creditCustom: string;
    creditCustomLabel: string;
    creditCustomPlaceholder: string;
    creditSuffix: string;
    addressPlaceholder: string;
    notesPlaceholder: string;
    saveSupplier: string;
    cancelConfirmTitle: string;
    cancelConfirmBody: string;
    backToForm: string;
    confirmCancel: string;
    errCompanyName: string;
    errContactName: string;
    errPhone: string;
    errEmail: string;
    errPromptpay: string;
    errBankName: string;
    errBankAccountNumber: string;
    errBankAccountName: string;
    errCreditTerm: string;
    errCustomDays: string;
  };
};

export interface AddSupplierModalProps {
  dictionary: AddSupplierModalAddSupplierDict;
  onClose: () => void;
  onSuccess?: (supplier: Supplier) => void;
}

export type PurchaseFormPurchaseFormProps = {
  dictionary: {
    createOrder: string;
    editOrder: string;
    selectSupplier: string;
    selectSupplierFirst: string;
    noSupplierMatch: string;
    selectProduct: string;
    searchPlaceholder?: string;
    addItem: string;
    product: string;
    quantity: string;
    unitCost: string;
    totalCost: string;
    note: string;
    save: string;
    saving: string;
    cancel: string;
    requestFailed: string;
    noProducts?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
};

export type PurchaseFormLineItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
};

export type PurchaseListStatusFilter = "all" | "pending" | "partial" | "completed" | "cancelled";

export type PurchaseListDict = {
  purchaseOrders: string;
  createOrder: string;
  orderNumber: string;
  supplierName: string;
  date: string;
  totalCost: string;
  status: string;
  pending: string;
  partial: string;
  completed: string;
  cancelled: string;
  receiveStock: string;
  cancelOrder: string;
  emptyOrders: string;
  loading: string;
  tableActions: string;
  receiveConfirm: string;
  receiveQuantity: string;
  product: string;
  quantity: string;
  unitCost: string;
  cancel: string;
  saving: string;
  stockUpdated: string;
  filterAll: string;
  searchOrders: string;
  itemsUnit: string;
  kpiTotalOrders: string;
  kpiTotalValue: string;
  viewOrder: string;
  emptyFilteredOrders: string;
  confirmCancelOrder: string;
  requestFailed: string;
  noProducts?: string;
};

export type PurchaseListKpiCardProps = { icon: React.ReactNode; label: string; value: string; accent?: string };

export type ReceiveModalReceiveModalProps = {
  dictionary: {
    receiveStock: string;
    receiveConfirm: string;
    receiveQuantity: string;
    product: string;
    quantity: string;
    unitCost: string;
    totalCost: string;
    cancel: string;
    saving: string;
    stockUpdated: string;
    [key: string]: string;
  };
  onClose: () => void;
  purchaseOrder: PurchaseOrder;
};

export type SupplierManagerStatusFilter = "all" | "active" | "inactive";

export type SupplierManagerSortBy = "recent" | "name_asc";

export type SupplierManagerSupplierUI = {
  allSuppliers: string;
  countUnit: string;
  sortRecent: string;
  sortNameAZ: string;
  loadMore: string;
  searchPlaceholder: string;
  filterAll: string;
  filterActive: string;
  filterInactive: string;
  noResults: string;
  noResultsSub: string;
  lastTx: string;
  creditDaysPrefix: string;
  daysSuffix: string;
  selectHint: string;
  selectSub: string;
  codeLabel: string;
  callBtn: string;
  lineBtn: string;
  kpiTotal: string;
  kpiOutstanding: string;
  kpiCreditLimit: string;
  kpiRemaining: string;
  kpiAllTime: string;
  kpiNoDue: string;
  kpiNoLimit: string;
  kpiOrders: string;
  kpiLastOrder: string;
  kpiNoOrders: string;
  sectionContact: string;
  sectionPayment: string;
  sectionAddress: string;
  sectionNotes: string;
  primaryContact: string;
  noInfo: string;
  purchaseHistory: string;
  viewAll: string;
  colDocNo: string;
  colDate: string;
  colAmount: string;
  colStatus: string;
  emptyHistory: string;
  badgeActive: string;
  badgeInactive: string;
  addSupplierBtn: string;
};

export type SupplierManagerSupplierManagerProps = {
  dictionary: {
    title: string;
    createSupplier: string;
    editSupplier: string;
    supplierName: string;
    supplierPhone: string;
    contactPerson: string;
    address: string;
    taxId: string;
    note: string;
    supplierIsActive: string;
    save: string;
    saving: string;
    cancel: string;
    deleteConfirm: string;
    deleteLabel: string;
    successCreated: string;
    successUpdated: string;
    successDeleted: string;
    loading: string;
    emptySuppliers: string;
    requestFailed: string;
    tableActions: string;
    supplierProducts: string;
    addProduct: string;
    editProduct: string;
    removeProduct: string;
    noProducts: string;
    searchProduct: string;
    supplierSKU: string;
    supplierPrice: string;
    productName: string;
    productSKU: string;
    confirmRemoveProduct: string;
    productRemoved: string;
    productAdded: string;
    productUpdated: string;
    selectExistingProduct: string;
    createNewProduct: string;
    productNameRequired: string;
    basePrice: string;
    supplierUI: SupplierManagerSupplierUI;
    addSupplierModal: {
      subtitle: string;
      timeHint: string;
      activateNow: string;
      sectionContact: string;
      companyName: string;
      companyNamePlaceholder: string;
      contactNamePlaceholder: string;
      phonePlaceholder: string;
      lineId: string;
      lineIdPlaceholder: string;
      email: string;
      emailPlaceholder: string;
      sectionLogo: string;
      logoOptional: string;
      logoUploadText: string;
      logoUploadHint: string;
      logoRemove: string;
      logoErrType: string;
      logoErrSize: string;
      sectionFinancial: string;
      paymentMethodLabel: string;
      promptpay: string;
      bankAccount: string;
      promptpayNumber: string;
      promptpayNumberPlaceholder: string;
      promptpayHint: string;
      bankNameLabel: string;
      bankAccountNumber: string;
      bankAccountName: string;
      bankAccountNumberPlaceholder: string;
      bankAccountNamePlaceholder: string;
      selectBankPlaceholder: string;
      creditTerm: string;
      creditCash: string;
      creditCustom: string;
      creditCustomLabel: string;
      creditCustomPlaceholder: string;
      creditSuffix: string;
      addressPlaceholder: string;
      notesPlaceholder: string;
      saveSupplier: string;
      cancelConfirmTitle: string;
      cancelConfirmBody: string;
      backToForm: string;
      confirmCancel: string;
      errCompanyName: string;
      errContactName: string;
      errPhone: string;
      errEmail: string;
      errPromptpay: string;
      errBankName: string;
      errBankAccountNumber: string;
      errBankAccountName: string;
      errCreditTerm: string;
      errCustomDays: string;
      taxId: string;
      taxIdPlaceholder: string;
      errTaxId: string;
      sectionAdditional: string;
    };
  };
};

export type SupplierManagerEditFormData = {
  name: string;
  phone: string;
  contact_person: string;
  email: string;
  line_id: string;
  address: string;
  tax_id: string;
  note: string;
  is_active: boolean;
  payment_method: "promptpay" | "bank_account" | "";
  promptpay_number: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  credit_days: number | "";
  logo?: File;
  remove_logo: boolean;
};

export type CompletedTabRecordKind = "po" | "receipt";

export type CompletedTabCompletedRow = {
  kind: CompletedTabRecordKind;
  id: string;
  number: string;
  supplier?: string;
  warehouse?: string;
  date?: string;
  ts: number;
  value: number;
};

export type CompletedTabTypeFilter = "all" | CompletedTabRecordKind;

export type CompletedTabProps = {
  dict: WsDict;
  locale: string;
  pos: PurchaseOrder[];
  confirmed: GoodsReceiptDraft[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  nav: WorkspaceNav;
};

export type GoodsReceiptsTabStatusFilter = "all" | GoodsReceiptStatus;

export type GoodsReceiptsTabProps = {
  dict: WsDict;
  locale: string;
  nav: WorkspaceNav;
};

export type OverviewTabProps = {
  dict: WsDict;
  locale: string;
  pos: PurchaseOrder[];
  posLoading: boolean;
  posError: boolean;
  onRetryPos: () => void;
  pendingReview: GoodsReceiptDraft[];
  pendingReviewTotal: number;
  pendingLoading: boolean;
  confirmed: GoodsReceiptDraft[];
  confirmedLoading: boolean;
  /** Epoch ms for the first day of the current month (stable per mount). */
  monthStart: number;
  nav: WorkspaceNav;
};

export type PendingApprovalTabProps = {
  dict: WsDict;
  locale: string;
  items: GoodsReceiptDraft[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  nav: WorkspaceNav;
};

export type PendingReceivingTabProps = {
  dict: WsDict;
  locale: string;
  canOperate: boolean;
  pos: PurchaseOrder[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  nav: WorkspaceNav;
};

export type PurchaseOrdersTabStatusFilter = "all" | PurchaseOrderStatus;

export type PurchaseOrdersTabProps = {
  dict: WsDict;
  locale: string;
  canOperate: boolean;
  canManage: boolean;
  pos: PurchaseOrder[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  nav: WorkspaceNav;
};

export type PurchasingWorkspaceFormDict = React.ComponentProps<typeof PurchaseForm>["dictionary"];

export type PurchasingWorkspaceProps = {
  dict: WsDict;
  formDict: PurchasingWorkspaceFormDict;
};
