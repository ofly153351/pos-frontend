import type { ParkedBill } from "@/services/sales";
import type { SaleDiscountType } from "@/types/sale";
import type { Product } from "@/types/product";
import type { NavLabels } from "@/components/navigation/nav-config";
import type { Customer } from "@/types/customer";
import type { CustomerLevelDiscount } from "@/types/customer";
import type { CartItem } from "./utils/sales-calculations";
import type { ParkedBillItem } from "@/services/sales";
import type { ReactNode } from "react";
import type { PromoChip } from "@/components/sales/promo-display";
import type { Campaign } from "@/components/promotions/promotion-types";
import type { CardSettings } from "@/lib/card-settings";
export type ProductViewMode = "grid" | "list";

export type SalesDictionary = {
  addButton: string;
  cartTitle: string;
  couponLabel: string;
  changeLabel: string;
  checkoutButton: string;
  checkoutSectionTitle: string;
  saleModeAriaLabel: string;
  saleModeCashLabel: string;
  saleModeCashDescription: string;
  saleModeInvoiceLabel: string;
  saleModeInvoiceDescription: string;
  saleModeQuotationLabel: string;
  saleModeQuotationDescription: string;
  quoteValidUntilLabel: string;
  quotationPaymentTermLabel: string;
  quotationPaymentTermPlaceholder: string;
  quotationPaymentTermSummary: string;
  dayUnitLabel: string;
  quotationValidUntilPrefix: string;
  clearDateButton: string;
  invoiceDueDateLabel: string;
  invoiceDueDatePrefix: string;
  createQuotationButton: string;
  checkoutSuccess: string;
  clearCartButton: string;
  actionsLabel: string;
  closeReceiptButton: string;
  confirmPaymentButton: string;
  customerLabel: string;
  customerDiscountLabel: string;
  customerColumnLabel: string;
  customerPlaceholder: string;
  amountPlaceholder: string;
  customerSettlementLabel: string;
  customerSettlementCashNow: string;
  customerSettlementInvoice: string;
  customerTypeGeneral: string;
  customerTypeLabel: string;
  customerTypeNetwork: string;
  documentSearchPlaceholder: string;
  customerPaymentLabel: string;
  discountAmountLabel: string;
  discountBillLabel: string;
  discountLabel: string;
  discountPercentLabel: string;
  discountSummaryLabel: string;
  totalDiscountLabel: string;
  itemDiscountLabel: string;
  discountTypeLabel: string;
  discountValueLabel: string;
  discountScopeLabel: string;
  discountScopeWholeLine: string;
  discountScopePerUnit: string;
  discountPreviewUnitPriceLabel: string;
  discountPreviewQtyLabel: string;
  discountPreviewLineSubtotalLabel: string;
  discountPreviewLineDiscountLabel: string;
  discountPreviewPerUnitDiscountLabel: string;
  discountPreviewTotalDiscountLabel: string;
  discountPreviewAfterDiscountLabel: string;
  discountBadgePerUnit: string;
  emptyCart: string;
  latestItemBadge: string;
  emptyHistory: string;
  emptyProducts: string;
  historyTitle: string;
  insufficientPayment: string;
  itemCountLabel: string;
  pagination: {
    next: string;
    perPage: string;
    previous: string;
  };
  noteLabel: string;
  notePlaceholder: string;
  paymentMethodCard: string;
  paymentMethodPromptPay: string;
  paymentMethodQrLabel: string;
  paymentMethodBankTransferLabel: string;
  paymentMethodCreditCardLabel: string;
  paymentMethodDebitCardLabel: string;
  paymentMethodCash: string;
  paymentMethodCashLabel: string;
  paymentMethodLabel: string;
  bankAccountLabel: string;
  bankAccountNone: string;
  bankTransferInstructions: string;
  bankTransferAccountNo: string;
  bankTransferAccountName: string;
  bankTransferBankName: string;
  invoiceButton: string;
  markUnpaidButton: string;
  markPaidButton: string;
  noProofLabel: string;
  pdfButton: string;
  pdfPreviewTitle: string;
  paymentMethodTransfer: string;
  paymentProofLabel: string;
  pendingPaymentButton: string;
  pendingPaymentLoading: string;
  pendingPaymentSectionTitle: string;
  unpayConfirmButton: string;
  unpayLoading: string;
  unpayReasonLabel: string;
  viewProofButton: string;
  printButton: string;
  printReceiptAskBody: string;
  printReceiptAskTitle: string;
  printReceiptNowButton: string;
  printReceiptSkipButton: string;
  printWindowBlockedError: string;
  receiptPreviewLoading: string;
  receiptPreviewError: string;
  receiptPreviewRetryButton: string;
  receiptPreviewPrintButton: string;
  receiptPreviewTitle: string;
  requestFailedLabel: string;
  quickCashLabel: string;
  quickCashExactAmountLabel: string;
  discountBillToggleShowLabel: string;
  discountBillToggleHideLabel: string;
  productCountLabel: string;
  productViewGrid: string;
  productViewList: string;
  cardSettings: string;
  openCustomerDisplay: string;
  cardSettingsModal: import("@/components/sales/card-settings-modal").CardSettingsDictionary;
  productOutOfStock: string;
  quantityLabel: string;
  quantityNumpadApply: string;
  quantityNumpadBackspace: string;
  quantityNumpadCancel: string;
  quantityNumpadClear: string;
  quantityNumpadTitle: string;
  receiptTitle: string;
  remainingLabel: string;
  removeItemButton: string;
  saleAtLabel: string;
  saleLocationLabel: string;
  saleLocationRequired: string;
  saleLocationCartAdjusted: string;
  customerDiscountUnavailable: string;
  noSalePointConfigured: string;
  noSalePointDescription: string;
  configureSalePoint: string;
  contactManager: string;
  searchPlaceholder: string;
  scanWithCamera: string;
  stockLabel: string;
  summary: {
    discountLabel: string;
    subtotalLabel: string;
    totalLabel: string;
  };
  title: string;
  totalPaidLabel: string;
  netTotalLabel: string;
  unitPriceLabel: string;
  unavailableProduct: string;
  vatAmountLabel: string;
  vatToggleLabel: string;
  vatToggleOff: string;
  vatToggleOn: string;
  vatToggleUpdateFailed: string;
  statusLabel: string;
  statusPaidLabel: string;
  statusUnpaidLabel: string;
  statusPartiallyPaidLabel: string;
  viewReceiptButton: string;
  printInvoiceButton: string;
  categoryFilterAll: string;
  categoryFilterShowMore: string;
  categoryFilterShowLess: string;
  promo: {
    tab: string;
    all: string;
    storeWide: string;
    discountLabel: string;
    badge: {
      percent: string; // contains "{v}"
      amount: string; // contains "{v}"
      price: string; // contains "{v}"
      bxgy: string; // contains "{b}" and "{g}"
      member: string;
      generic: string;
    };
  };
  holdBillLabel: string;
  restoreBillLabel: string;
  restoreBillDrawerTitle: string;
  holdBillConfirmLabel: string;
  holdBillCancelLabel: string;
  holdBillPlaceholderLabel: string;
  restoreBillConfirmLabel: string;
  noParkedBillsLabel: string;
  menuLabel: string;
  closeCashierLabel: string;
  confirmCloseTitle: string; // contains "{count}"
  confirmCloseMessage: string;
  confirmCloseHoldDescription: string;
  confirmCloseDiscardLabel: string;
  confirmCloseDiscardDescription: string;
  confirmCloseCancelLabel: string;
};

export type ActionsMenuModalDict = {
  actionsLabel: string;
  closeReceiptButton: string;
  noteLabel: string;
  holdBillLabel: string;
  restoreBillLabel: string;
  clearCartButton: string;
};

export type ActionsMenuModalProps = {
  isOpen: boolean;
  showNoteField: boolean;
  onClose: () => void;
  onToggleNote: () => void;
  onHoldBill: () => void;
  onOpenRestoreDrawer: (bills: ParkedBill[]) => void;
  onClearCart: () => void;
  dictionary: ActionsMenuModalDict;
};

export type AmountNumpadAmountNumpadField = "bill_discount" | "paid_amount";

export type AmountNumpadDict = {
  discountBillLabel: string;
  customerPaymentLabel: string;
  quantityNumpadClear: string;
  quantityNumpadBackspace: string;
  quantityNumpadCancel: string;
  quantityNumpadApply: string;
};

export type AmountNumpadProps = {
  field: AmountNumpadAmountNumpadField;
  value: string;
  isOpen: boolean;
  onInputChange: (v: string) => void;
  onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onDigit: (d: string) => void;
  onDecimal: () => void;
  onClear: () => void;
  onBackspace: () => void;
  onCancel: () => void;
  onApply: () => void;
  dictionary: AmountNumpadDict;
};

export type CardSettingsModalCardSettingsDictionary = {
  title: string;
  subtitle: string;
  namePos: string;
  nameBottom: string;
  nameTop: string;
  imageFit: string;
  imageFitHint: string;
  fitCover: string;
  fitContain: string;
  aspect: string;
  nameLines: string;
  nameLinesHint: string;
  line1: string;
  line2: string;
  line3: string;
  cardSize: string;
  sizeSm: string;
  sizeMd: string;
  sizeLg: string;
  stockBadge: string;
  promoBadge: string;
  show: string;
  hide: string;
  previewTitle: string;
  livePreview: string;
  reset: string;
  save: string;
  saved: string;
  resetDone: string;
};

export type CardSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  dictionary: CardSettingsModalCardSettingsDictionary;
};

export type CartPanelCartItem = {
  discountScope: "line" | "unit";
  discountType: SaleDiscountType;
  discountValue: string;
  product: Product;
  quantity: number;
};

export type CartPanelCartSummary = {
  subtotal: number;
  discountAmount: number;
};

export type CartPanelDict = {
  cartTitle: string;
  netTotalLabel: string;
  discountBillLabel: string;
  couponLabel: string;
  totalDiscountLabel: string;
  itemDiscountLabel: string;
  customerDiscountLabel: string;
  promo: { discountLabel: string };
  summary: { subtotalLabel: string };
  notePlaceholder: string;
  emptyCart: string;
  discountTypeLabel: string;
  discountBadgePerUnit: string;
  removeItemButton: string;
  checkoutButton: string;
  latestItemBadge: string;
};

export type CartPanelProps = {
  cart: CartPanelCartItem[];
  recentProductId: string | null;
  cartSummary: CartPanelCartSummary;
  settlementTotal: number;
  vatAmount: number;
  applyVat: boolean;
  billDiscount: string;
  billDiscountType: "amount" | "percent";
  couponCode: string;
  totalDiscountAmount: number;
  itemDiscountAmount: number;
  customerDiscountAmount: number;
  billDiscountAmount: number;
  promoDiscountAmount: number;
  promoBreakdown: Array<{ name: string; amount: number }>;
  showNoteField: boolean;
  note: string;
  isPending: boolean;
  isBillDiscountFieldOpen: boolean;
  cartScrollRef: React.RefObject<HTMLDivElement | null>;
  dictionary: CartPanelDict;
  onClearCart: () => void;
  onToggleBillDiscountField: () => void;
  onBillDiscountTypeChange: (type: "amount" | "percent") => void;
  onCouponChange: (v: string) => void;
  onOpenAmountNumpad: (field: "bill_discount" | "paid_amount") => void;
  onNoteChange: (v: string) => void;
  onOpenDiscountEditor: (productId: string) => void;
  onUpdateQuantity: (productId: string, qty: number) => void;
  onOpenQuantityNumpad: (productId: string, current: number, max: number) => void;
  onOpenCheckout: () => void;
  onLongPressStart: (product: Product) => void;
  onLongPressEnd: () => void;
};

export type CashierModalCashierModalProps = {
  dictionary: SalesDictionary;
  locale: string;
  navLabels: NavLabels;
  onClose: () => void;
};

export type CheckoutSummaryModalDict = {
  checkoutSectionTitle: string;
  closeReceiptButton: string;
  saleModeAriaLabel: string;
  saleModeCashLabel: string;
  saleModeCashDescription: string;
  saleModeInvoiceLabel: string;
  saleModeInvoiceDescription: string;
  saleModeQuotationLabel: string;
  saleModeQuotationDescription: string;
  quoteValidUntilLabel: string;
  quotationPaymentTermLabel: string;
  quotationPaymentTermPlaceholder: string;
  quotationPaymentTermSummary: string;
  dayUnitLabel: string;
  quotationValidUntilPrefix: string;
  clearDateButton: string;
  invoiceDueDateLabel: string;
  invoiceDueDatePrefix: string;
  createQuotationButton: string;
  customerLabel: string;
  customerPlaceholder: string;
  customerTypeLabel: string;
  customerSettlementLabel: string;
  customerSettlementCashNow: string;
  customerSettlementInvoice: string;
  paymentMethodLabel: string;
  paymentMethodCashLabel: string;
  paymentMethodCard: string;
  paymentMethodPromptPay: string;
  paymentMethodQrLabel: string;
  paymentMethodBankTransferLabel: string;
  paymentMethodCreditCardLabel: string;
  paymentMethodDebitCardLabel: string;
  bankAccountLabel: string;
  bankAccountNone: string;
  bankTransferInstructions: string;
  bankTransferAccountNo: string;
  bankTransferAccountName: string;
  bankTransferBankName: string;
  customerPaymentLabel: string;
  changeLabel: string;
  quickCashLabel: string;
  quickCashExactAmountLabel: string;
  noteLabel: string;
  notePlaceholder: string;
  discountBillLabel: string;
  customerDiscountLabel: string;
  vatAmountLabel: string;
  summary: {
    subtotalLabel: string;
    discountLabel: string;
    totalLabel: string;
  };
  totalPaidLabel: string;
  confirmPaymentButton: string;
  promo?: { tab: string };
};

export type CheckoutSummaryModalCartSummary = {
  subtotal: number;
  discountAmount: number;
};

export type CheckoutSummaryModalQuickCashOption = {
  amount: number;
  isExact: boolean;
};

export type CheckoutSummaryModalCustomerComboboxProps = {
  customers: Customer[];
  customerLevelDiscounts: CustomerLevelDiscount[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
};

export type CheckoutSummaryModalBankAccountSummary = {
  id: string;
  bank_name: string;
  account_no: string;
  account_name: string;
  is_active: boolean;
  is_default: boolean;
};

export type CheckoutSummaryModalProps = {
  isOpen: boolean;
  customers: Customer[];
  customerLevelDiscounts: CustomerLevelDiscount[];
  cartSummary: CheckoutSummaryModalCartSummary;
  settlementTotal: number;
  vatAmount: number;
  applyVat: boolean;
  selectedCustomerId: string;
  setSelectedCustomerId: (id: string) => void;
  customerSettlementMode: "cash_now" | "invoice";
  setCustomerSettlementMode: (mode: "cash_now" | "invoice") => void;
  invoiceDueDate: string;
  setInvoiceDueDate: (v: string) => void;
  paymentMethod: string;
  setPaymentMethod: (v: string) => void;
  selectedBankAccountId: string;
  setSelectedBankAccountId: (id: string) => void;
  bankAccounts: CheckoutSummaryModalBankAccountSummary[];
  paidAmount: string;
  note: string;
  setNote: (v: string) => void;
  billDiscountAmount: number;
  billDiscountPercent: number;
  billDiscountType: "amount" | "percent";
  customerDiscountAmount: number;
  customerDiscountPercent: number;
  promoDiscountAmount: number;
  promoNames?: string[];
  changeAmount: number;
  isPending: boolean;
  isCreatingQuotation: boolean;
  quotationMode: boolean;
  setQuotationMode: (v: boolean) => void;
  quotationValidUntil: string;
  setQuotationValidUntil: (v: string) => void;
  quotationPaymentTermDays: string;
  setQuotationPaymentTermDays: (v: string) => void;
  quickCashOptions: CheckoutSummaryModalQuickCashOption[];
  lastQuickCashAmount: number | null;
  customerTypeLabel: string;
  cartLength: number;
  enabledPaymentChannels?: string[];
  onClose: () => void;
  onSubmit: () => void;
  onCreateQuotation: () => void;
  onApplyQuickCash: (amount: number, isExact?: boolean) => void;
  onPaidAmountChange: (v: string) => void;
  dictionary: CheckoutSummaryModalDict;
};

export type CustomerDisplayDict = {
  welcomeTitle: string;
  welcomeSub: string;
  waitingForSale: string;
  items: string;
  qty: string;
  vat: string;
  total: string;
  payTitle: string;
  payScanQr: string;
  payCash: string;
  amountDue: string;
  successTitle: string;
  successThanks: string;
  change: string;
  fullscreen: string;
  pieces: string;
  statusWelcome: string;
  statusReceiving: string;
  statusReadyToPay: string;
  statusSuccess: string;
  generalCustomer: string;
  memberLabel: string;
  memberLevel: string;
  appliedPromotions: string;
  subtotalBeforeDiscount: string;
  itemDiscount: string;
  memberDiscount: string;
  promoDiscount: string;
  billDiscount: string;
  coupon: string;
  promoAndCouponDiscount: string;
  received: string;
  processingPayment: string;
  levelSilver: string;
  levelGold: string;
  levelPlatinum: string;
  levelVip: string;
  levelGeneral: string;
  methodCash: string;
  methodCard: string;
  methodPromptPay: string;
  methodTransfer: string;
  methodQr: string;
  methodBankTransfer: string;
  methodOther: string;
  bankTransferTitle: string;
  bankTransferInstruction: string;
  /** "กรุณาตรวจสอบรายการก่อนชำระเงิน" — shown in right panel when no member/promo active */
  reviewItems: string;
  /** "ลดทั้งรายการ" — label for whole-line fixed-amount discount */
  wholeLineDiscount: string;
  /** "ลด" — prefix for per-unit discount ("ลด ฿5.00/ชิ้น") */
  perUnitDiscountPrefix: string;
  /** "รวมส่วนลด" — total discount sub-row for per-unit case */
  totalItemDiscount: string;
  /** "ส่วนลด" — prefix for percentage discount ("ส่วนลด 10%") */
  percentDiscountLabel: string;
  /** Column header for the product name column */
  productColumn: string;
  /** Column header for the unit price column */
  unitPrice: string;
  /** Column header for the line total column */
  colTotal: string;
};

export type CustomerDisplayPaletteMode = "light" | "dark";

export type CustomerDisplayThemeConfig = {
  id: string;
  label: string;
  gradient: string;
  stickyBg: string;
  palette: CustomerDisplayPaletteMode;
};

export type DiscountEditorModalDict = {
  closeReceiptButton: string;
  discountTypeLabel: string;
  discountAmountLabel: string;
  discountPercentLabel: string;
  discountValueLabel: string;
  quantityNumpadClear: string;
  quantityNumpadBackspace: string;
  quantityNumpadApply: string;
  discountScopeLabel: string;
  discountScopeWholeLine: string;
  discountScopePerUnit: string;
  discountPreviewUnitPriceLabel: string;
  discountPreviewQtyLabel: string;
  discountPreviewLineSubtotalLabel: string;
  discountPreviewLineDiscountLabel: string;
  discountPreviewPerUnitDiscountLabel: string;
  discountPreviewTotalDiscountLabel: string;
  discountPreviewAfterDiscountLabel: string;
};

export type DiscountEditorModalProps = {
  item: CartItem | null;
  onClose: () => void;
  onDiscountTypeChange: (productId: string, type: SaleDiscountType) => void;
  onDiscountScopeChange: (productId: string, scope: "line" | "unit") => void;
  onInputChange: (v: string) => void;
  onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onDigit: (d: string) => void;
  onDecimal: () => void;
  onClear: () => void;
  onBackspace: () => void;
  onApply: () => void;
  dictionary: DiscountEditorModalDict;
};

export type HoldBillModalDict = {
  holdBillLabel: string;
  holdBillPlaceholderLabel: string;
  holdBillCancelLabel: string;
  holdBillConfirmLabel: string;
  emptyCart: string;
};

export type HoldBillModalProps = {
  isOpen: boolean;
  label: string;
  onLabelChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  dictionary: HoldBillModalDict;
};

export type ParkedBillsDrawerDrawerBillItem = ParkedBillItem & { base_price?: number };

export type ParkedBillsDrawerDrawerBill = Omit<ParkedBill, "items"> & { items?: ParkedBillsDrawerDrawerBillItem[] };

export type ParkedBillsDrawerDict = {
  restoreBillDrawerTitle: string;
  closeReceiptButton: string;
  noParkedBillsLabel: string;
  productCountLabel: string;
  restoreBillConfirmLabel: string;
};

export type ParkedBillsDrawerProps = {
  isOpen: boolean;
  bills: ParkedBillsDrawerDrawerBill[];
  cartLength: number;
  onClose: () => void;
  onConfirmRestore: (bill: ParkedBillsDrawerDrawerBill) => void;
  dictionary: ParkedBillsDrawerDict;
};

export type PostInvoiceModalProps = {
  docId: string | null;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export type ProductBrowserProductBrowserProps = {
  categories: string[];
  dictionary: SalesDictionary;
  error: string;
  hideSearch?: boolean;
  onAddToCart: (product: Product) => void;
  onCategoryFilterChange: (category: string) => void;
  onProductViewChange: (mode: ProductViewMode) => void;
  onSearchChange: (value: string) => void;
  /** Camera scan: decoded barcode/SKU → parent resolves & adds to cart. */
  onScanDetected?: (code: string) => void;
  productView: ProductViewMode;
  products: Product[];
  /** Sentinel value for the promotion tab (e.g. "__promo__"). */
  promoCategory?: string;
  /** IDs of products covered by at least one active promotion. */
  promotionProductIds?: Set<string>;
  /** Sub-chips (one per product-targeting promo), shown under the promo tab. */
  promoChips?: PromoChip[];
  /** Store-wide / bill-level promos, shown as an info strip under the promo tab. */
  promoStoreWide?: Campaign[];
  /** Selected promo sub-chip id (null = all promo products). */
  selectedPromoId?: string | null;
  onPromoSelect?: (promoId: string | null) => void;
  /** productId → short promo badge label rendered on each card. */
  productPromoLabels?: Map<string, string>;
  search: string;
  selectedCategory: string;
  getCartQuantity: (productId: string) => number;
  /** Compact selector/label rendered in the toolbar row (Cases C / D). Null hides it. */
  salePointSlot?: ReactNode;
  /** Replaces the product grid with a blocking state (Case A: no sale points). */
  salePointBlocker?: ReactNode;
};

export type ProductCardProductCardItem = {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string | null;
};

export type ProductCardProductCardLabels = {
  stock: string; // e.g. "สต็อก"
  outOfStock: string; // e.g. "หมด"
  add: string; // add-to-cart aria/title
};

export type ProductCardProductCardProps = {
  item: ProductCardProductCardItem;
  config: CardSettings;
  qtyInCart: number;
  onAdd: () => void;
  labels: ProductCardProductCardLabels;
  /** Short promo label ("ลด 10%", "ซื้อ 3 แถม 1"). Rendered when config.showPromoBadge. */
  promoLabel?: string | null;
};

export type ProductPopupProps = {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
};

export type QuantityNumpadDict = {
  quantityNumpadTitle: string;
  quantityNumpadClear: string;
  quantityNumpadBackspace: string;
  quantityNumpadCancel: string;
  quantityNumpadApply: string;
};

export type QuantityNumpadProps = {
  value: string;
  isOpen: boolean;
  onInputChange: (v: string) => void;
  onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onDigit: (d: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  onCancel: () => void;
  onApply: () => void;
  dictionary: QuantityNumpadDict;
};

export type ReceiptPreviewModalDict = {
  receiptPreviewLoading: string;
  receiptPreviewError: string;
  receiptPreviewRetryButton: string;
  receiptPreviewTitle: string;
  printReceiptNowButton: string;
  closeReceiptButton: string;
};

export type ReceiptPreviewModalReceiptPreviewStatus = "loading" | "success" | "error";

export type ReceiptPreviewModalProps = {
  isOpen: boolean;
  status: ReceiptPreviewModalReceiptPreviewStatus;
  html: string;
  onClose: () => void;
  onPrint: (frameWindow: Window) => void;
  onRetry: () => void;
  dictionary: ReceiptPreviewModalDict;
  onCreateTaxInvoice?: () => void;
  isTaxInvoicePending?: boolean;
};

export type SalesHistoryPaginationSalesHistoryPaginationDict = {
  pageShowing: string;
  pageOf: string;
  pageRecords: string;
  pagePerPage: string;
};

export type SalesManagerCartItem = {
  discountScope: "line" | "unit";
  discountType: SaleDiscountType;
  discountValue: string;
  product: Product;
  quantity: number;
};

export type SalesManagerSalesManagerHandle = {
  toggleVat: () => void;
  holdBill: () => void;
  restoreBill: () => void;
  toggleNote: () => void;
  clearCartExternal: () => void;
  openActions: () => void;
  /** Resolve a camera-scanned code and add it to the cart (fullscreen modal). */
  scanCode: (code: string) => void;
};

export type SalesManagerSalesManagerProps = {
  dictionary: SalesDictionary;
  locale?: string;
  onCartItemsChange?: (count: number) => void;
  externalSearch?: string;
  onExternalSearchChange?: (value: string) => void;
  onCartStateChange?: (state: { applyVat: boolean; showNoteField: boolean }) => void;
  onHoldBillSuccess?: () => void;
};
