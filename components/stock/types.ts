import type { ProductInput } from "@/types/product";
import type { Product } from "@/types/product";
import type { BarcodeModalLabels } from "@/components/stock/barcode-modal";
import type { ReactNode } from "react";
import type { InventoryDictionary } from "@/components/stock/inventory-types";
import type { ProductBrand } from "@/types/product";
import type { ProductType } from "@/types/product";
import type { ProductUnit } from "@/types/product";
import type { Barcode } from "lucide-react";
import type { Location } from "@/services/locations";
import type { InventoryAdjustDictionary } from "@/components/stock/inventory-types";
import type { CountDictionary } from "@/components/stock/inventory-types";
import type { CountStatus } from "@/types/stock-count";
import type { ProductDetailView } from "@/components/stock/product-detail-view";


export type StockManagerDictionary = {
  assetValue: {
    label: string;
  };
  emptyState: string;
  filters: {
    apply: string;
    activeStatus: string;
    allBrands: string;
    allCategories: string;
    allStatuses: string;
    allTypes: string;
    brandLabel: string;
    cancel: string;
    clearAll: string;
    filterButton: string;
    filterOptionsPlaceholder: string;
    filterPanelTitle: string;
    categoryLabel: string;
    gridView: string;
    inactiveStatus: string;
    listView: string;
    lowStockStatus: string;
    optionSearchPlaceholder: string;
    outOfStockStatus: string;
    searchLabel: string;
    statusLabel: string;
    typeLabel: string;
    readyToSellStatus?: string;
    locationLabel?: string;
    allLocations?: string;
    noLocationLabel?: string;
    quickViewLowStock?: string;
    quickViewNoLocation?: string;
  };
  form: {
    activeLabel: string;
    activeHint: string;
    amountLabel: string;
    basePriceLabel: string;
    basePriceHint: string;
    brandHint: string;
    brandLabel: string;
    cancel: string;
    categoryLabel: string;
    categoryHint: string;
    createProduct: string;
    createType: string;
    detailsSection: string;
    detailsSectionHint: string;
    imageLabel: string;
    imageHint: string;
    nameLabel: string;
    nameHint: string;
    pricingSection: string;
    pricingSectionHint: string;
    productTypeNameLabel: string;
    productTypeSlugLabel: string;
    quantityLabel: string;
    quantityHint: string;
    minStockLabel: string;
    minStockHint: string;

    optionalLabel: string;
    requiredLabel: string;
    costPriceLabel: string;
    costPriceHint: string;
    productCodeLabel: string;
    productCodeHint: string;
    descriptionLabel: string;
    descriptionHint: string;
    storageLocationLabel: string;
    storageLocationHint: string;
    storageAssignmentSection: string;
    storageAssignmentHint: string;
    warehouseLabel: string;
    zoneLabel: string;
    storagePlaceholder: string;
    storageSelectWarehouseFirst: string;
    storageNoWarehouses: string;
    storageNoLocations: string;
    storageCurrentLabel: string;
    storageClearLabel: string;
    storageUnavailableLabel: string;
    defaultLocationWarning: string;
    save: string;
    saving: string;
    setupSection: string;
    setupSectionHint: string;
    skuLabel: string;
    skuHint: string;
    barcodeLabel: string;
    barcodeHint: string;
    specialPriceLabel: string;
    specialPriceHint: string;
    initialStockLabel: string;
    initialStockHint: string;
    supplierLabel: string;
    supplierHint: string;
    supplierPlaceholder: string;
    supplierEmptyLabel: string;
    titleCreate: string;
    titleEdit: string;
    unitPair: string;
    unitPiece: string;
    unitTypeLabel: string;
    unitTypeHint: string;
    posPreviewLabel?: string;
    posStatusActive?: string;
    posStatusInactive?: string;
  };
  inventoryItems: Array<{
    barWidth: string;
    category: string;
    code: string;
    name: string;
    price: string;
    sku: string;
    statusTone: string;
    stockValue: string;
    updated: string;
  }>;
  loading: string;
  management?: {
    activeLabel: string;
    createTypeButton: string;
    createTypeTitle: string;
    createUnitButton: string;
    createBrandButton: string;
    createUnitTitle: string;
    createBrandTitle: string;
    descriptionLabel: string;
    editLabel: string;
    expandLabel: string;
    collapseLabel: string;
    editTypeTitle: string;
    editUnitTitle: string;
    editBrandTitle: string;
    helper: string;
    inactiveLabel: string;
    saveTypeButton: string;
    saveUnitButton: string;
    saveBrandButton: string;
    title: string;
    typeEmpty: string;
    typeNameLabel: string;
    brandNameLabel: string;
    typeRequiredError: string;
    typeSlugLabel: string;
    typeTitle: string;
    typesCountLabel: string;
    unitEmpty: string;
    unitTitle: string;
    unitsCountLabel: string;
    brandTitle: string;
    brandsCountLabel: string;
    brandEmpty: string;
  };
  pagination: {
    activePage: string;
    next: string;
    perPage: string;
    pages: string[];
    previous: string;
    summary: string;
  };
  quickAction: {
    button: string;
    label: string;
    title: string;
  };
  searchPlaceholder: string;
  scanWithCamera: string;
  stats: {
    categoriesLabel: string;
    highStockListLabel: string;
    lowStockListLabel: string;
    lowStockLabel: string;
    totalProductsLabel: string;
  };
  table: {
    actions: string;
    barcodeAction: string;
    barcodePreviewTitle: string;
    barcodePrintLabel: string;
    barcodeDownloadPng: string;
    barcodeDownloadPdf: string;
    barcodeExporting: string;
    barcodeCopyCode: string;
    barcodeCopied: string;
    barcodeTemplateLabel: string;
    barcodeTemplateSmall: string;
    barcodeTemplateMedium: string;
    barcodeTemplateLarge: string;
    barcodeTemplateShelf: string;
    barcodeTemplateQr: string;
    barcodeClose: string;
    barcodeTypeLabel: string;
    barcodeTypeCode128: string;
    barcodeTypeEan13: string;
    barcodeTypeEan8: string;
    barcodeTypeUpca: string;
    barcodeTypeQr: string;
    barcodeContentOptions: string;
    barcodeShowName: string;
    barcodeShowSku: string;
    barcodeShowPrice: string;
    barcodeShowBarcodeNumber: string;
    barcodeShowCategory: string;
    barcodeShowBrand: string;
    barcodeShowLocation: string;
    barcodeShowStoreName: string;
    barcodeShowSalePrice: string;
    barcodeOrigPriceInput: string;
    barcodeSalePriceInput: string;
    barcodeQuantityLabel: string;
    barcodePrinterModeLabel: string;
    barcodePrinterLabel: string;
    barcodePrinterA4: string;
    barcodePrinter58mm: string;
    barcodePrinter80mm: string;
    barcodeA4LayoutLabel: string;
    barcodePreviewLabel: string;
    barcodeInfoTemplate: string;
    barcodeInfoSize: string;
    barcodeInfoType: string;
    barcodeInfoMode: string;
    barcodeInfoQuantity: string;
    barcodeInfoPages: string;
    barcodePagesUnit: string;
    barcodeLabelsUnit: string;
    barcodePagesWillPrint: string;
    barcodeSampleNote: string;
    barcodeLabelPrinterNote: string;
    barcodeBatchTitle: string;
    barcodeBatchProducts: string;
    barcodeBatchQtyPerProduct: string;
    barcodeBatchPrintAll: string;
    barcodeBatchTotalLabels: string;
    copy: string;
    copied: string;
    location: string;
    noLocation: string;
    locationUnassigned: string;
    viewDetails: string;
    duplicate: string;
    archive: string;
    unarchive: string;
    statusReady: string;
    statusLow: string;
    statusOut: string;
    densityLabel: string;
    densityComfortable: string;
    densityCompact: string;
    densityWarehouse: string;
    selectedSuffix: string;
    printBarcodeAction: string;
    clearSelection: string;
    cancel: string;
    deleteConfirmTitle: string;
    deleteConfirmTitleMany: string;
    deleteConfirmBody: string;
    deleteConfirmBodyMany: string;
    detailTabGeneral: string;
    detailTabBarcode: string;
    detailTabInventory: string;
    detailTabMovements: string;
    detailNoMovements: string;
    detailMovementType: string;
    detailMovementQty: string;
    detailMovementDate: string;
    detailMovementBy: string;
    detailMovementNote: string;
    detailMaxStock: string;
    detailBack: string;
    detailProfit: string;
    detailReserved: string;
    detailDamaged: string;
    detailAvailable: string;
    detailWarehouse: string;
    detailZone: string;
    detailLastPrinted: string;
    detailPrintCount: string;
    detailNever: string;
    detailProductInfo: string;
    detailStorageHierarchy: string;
    detailKpiSummary: string;
    category: string;
    deleteAction: string;
    editAction: string;
    exportLabel: string;
    importLabel: string;
    invalidBarcodeLabel: string;
    noBarcodeLabel: string;
    barcode: string;
    price: string;
    costPrice: string;
    sellingPrice: string;
    productDetails: string;
    sku: string;
    stock: string;
    status: string;
    statusActive: string;
    statusInactive: string;
    receiveAction: string;
    moreActions: string;
    viewAction: string;
    cardView: string;
    tableView: string;
    stockReady: string;
    summaryAll?: string;
    summaryReady?: string;
    summaryLow?: string;
    summaryOut?: string;
    summaryValue?: string;
    bulkEnableLabel?: string;
    bulkDisableLabel?: string;
    bulkChangeCategoryLabel?: string;
    changeCategoryTitle?: string;
    changeCategoryApply?: string;
    changeCategorySelectPlaceholder?: string;
  };
  receive?: {
    receiveStockTitle?: string;
    receiveStock?: string;
    receiveStockConfirm?: string;
    receiveStockSuccess?: string;
    quantityToAdd?: string;
    productName?: string;
    currentStock?: string;
    note?: string;
    cancel?: string;
    saving?: string;
    historyTab?: string;
    historyEmpty?: string;
    historyProduct?: string;
    historyQty?: string;
    historyDate?: string;
    historyNote?: string;
    historyOperator?: string;
    historyLoadError?: string;
  };
  categories?: {
    addBrand: string;
    addType: string;
    addUnit: string;
    colActions: string;
    colLastModified: string;
    colNameBrand: string;
    colNameType: string;
    colNameUnit: string;
    colOrder: string;
    colProductCount: string;
    colStatus: string;
    countItems: string;
    deleteCancel: string;
    deleteConfirm: string;
    deleteMessage: string;
    deleteTitle: string;
    deleteWarning: string;
    emptyAdd: string;
    emptyTitle: string;
    importBrowse: string;
    importCancel: string;
    importColDesc: string;
    importColName: string;
    importColStatus: string;
    importConfirm: string;
    importDropText: string;
    importPreviewTitle: string;
    importTitle: string;
    legendActive: string;
    legendDelete: string;
    legendDrag: string;
    legendEdit: string;
    legendInactive: string;
    of: string;
    overviewActive: string;
    overviewInactive: string;
    overviewTitle: string;
    overviewTotal: string;
    overviewTotalProducts: string;
    perPage: string;
    popularTitle: string;
    popularViewAll: string;
    searchBrands: string;
    searchTypes: string;
    searchUnits: string;
    showing: string;
    statusActive: string;
    statusAll: string;
    statusInactive: string;
    tabBrands: string;
    tabTypes: string;
    tabUnits: string;
    toolsExport: string;
    toolsExportDesc: string;
    toolsImport: string;
    toolsImportDesc: string;
    toolsSort: string;
    toolsSortDesc: string;
    toolsTitle: string;
  };
  units?: {
    activateLabel: string;
    codeLabel: string;
    createButton: string;
    deactivateLabel: string;
    deleteLabel: string;
    descriptionLabel: string;
    empty: string;
    helper: string;
    nameLabel: string;
    requiredError: string;
    title: string;
  };
  importProduct?: {
    title: string;
    subtitleIdle: string;
    subtitlePreview: string;
    subtitleImporting: string;
    subtitleDone: string;
    step1Title: string;
    step1Columns: string;
    step1Guide: string;
    step1StockLocation: string;
    downloadTemplate: string;
    step2Title: string;
    step2Desc: string;
    selectFile: string;
    allRows: string;
    readyImport: string;
    hasIssues: string;
    colName: string;
    colSku: string;
    colBarcode: string;
    colPrice: string;
    colCost: string;
    colStock: string;
    colUnit: string;
    colCategory: string;
    colBrand: string;
    colStatus: string;
    statusReady: string;
    importing: string;
    success: string;
    failed: string;
    failedList: string;
    rowLabel: string;
    cancel: string;
    chooseNewFile: string;
    confirmImport: string;
    doneViewProducts: string;
    toastSuccess: string;
    toastPartial: string;
    errorGeneric: string;
    errorCategory: string;
    errorUnit: string;
    errorBrand: string;
    errorProduct: string;
    errorCreateCategory: string;
    errorCreateUnit: string;
    errorCreateBrand: string;
    errDuplicateSku: string;
    errDuplicateName: string;
    errInternal: string;
  };
};

export type StockManagerProps = {
  dictionary: StockManagerDictionary;
  initialSection?: "categories" | "stock-levels";
  /** true = Inventory/Stock page (stock adjust + receive enabled, table view).
   * Default false = Product master-data list (read-only stock, card/table toggle). */
  allowStockActions?: boolean;
};

export type ImportProductDictionary = NonNullable<StockManagerDictionary["importProduct"]>;
export type ProductFormLabels = StockManagerDictionary["form"];
export type ManagementDictionary = NonNullable<StockManagerDictionary["management"]>;
export type UnitsDictionary = NonNullable<StockManagerDictionary["units"]>;
export type CategoriesDictionary = NonNullable<StockManagerDictionary["categories"]>;
export const initialProductFormState: ProductInput = {
  base_price: "",
  brand_id: "",
  cost_price: "",
  is_active: true,
  min_stock: "",
  name: "",
  product_code: "",
  description: "",
  storage_location: "",
  default_location_id: "",
  sku: "",
  barcode: "",
  special_price: "",
  initial_stock: "",
  supplier_id: "",
  unit_id: "",
};

export type BarcodeBatchModalBarcodeBatchModalProps = {
  products: Product[] | null;
  labels: BarcodeModalLabels;
  storeName?: string | null;
  onClose: () => void;
};

export type BarcodeModalBarcodeModalLabels = {
  title: string;
  printLabel: string;
  downloadPng: string;
  downloadPdf: string;
  copyCode: string;
  copied: string;
  exporting: string;
  noBarcodeLabel: string;
  invalidBarcodeLabel: string;
  templateLabel: string;
  templateSmall: string;
  templateMedium: string;
  templateLarge: string;
  templateShelf: string;
  templateQr: string;
  barcodeTypeLabel: string;
  barcodeTypeCode128: string;
  barcodeTypeEan13: string;
  barcodeTypeEan8: string;
  barcodeTypeUpca: string;
  barcodeTypeQr: string;
  contentOptionsLabel: string;
  showName: string;
  showSku: string;
  showPrice: string;
  showBarcodeNumber: string;
  showCategory: string;
  showBrand: string;
  showLocation: string;
  showStoreName: string;
  showSalePrice: string;
  origPriceInput: string;
  salePriceInput: string;
  quantityLabel: string;
  printerModeLabel: string;
  printerLabel: string;
  printerA4: string;
  printer58mm: string;
  printer80mm: string;
  a4LayoutLabel: string;
  previewLabel: string;
  infoTemplate: string;
  infoSize: string;
  infoType: string;
  infoMode: string;
  infoQuantity: string;
  infoPages: string;
  pagesUnit: string;
  labelsUnit: string;
  pagesWillPrint: string;     // "{n} pages will be printed"
  sampleNote: string;         // "Showing {shown} of {total} labels"
  labelPrinterNote: string;
  closeLabel: string;
  // batch mode
  batchTitle: string;
  batchProducts: string;          // "{n} products"
  batchQtyPerProduct: string;
  batchPrintAll: string;
  batchTotalLabels: string;       // "{n} labels total"
};

export type BarcodeModalBarcodeModalProps = {
  product: Product | null;
  labels: BarcodeModalBarcodeModalLabels;
  storeName?: string | null;
  onClose: () => void;
};

export type CatalogSetupSectionTab = "types" | "units" | "brands";

export type CatalogSetupSectionStatusFilter = "all" | "active" | "inactive";

export type CatalogSetupSectionPageSize = 10 | 25 | 50 | 100;

export type CatalogSetupSectionBaseItem = {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  updated_at?: string;
  product_count: number;
};

export type CatalogSetupSectionCatalogSetupSectionProps = {
  activeLabel: string;
  cancelLabel: string;
  categoriesDictionary: CategoriesDictionary;
  managementDictionary: ManagementDictionary;
  totalProducts: number;
  unitsDictionary: UnitsDictionary;
};

export type ConfirmDialogConfirmDialogProps = {
  cancelLabel?: string;
  children: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  icon?: ReactNode;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
};

export type ImportProductModalPreviewRow = {
  rowNum: number;
  name: string;
  sku: string;
  barcode: string;
  price: string;
  cost: string;
  stock: string;
  minStock: string;
  unit: string;
  category: string;
  brand: string;
  description: string;
  error?: string; // validation error before import
};

export type ImportProductModalRowResult = { row: number; name: string; status: "ok" | "error"; error?: string };

export type ImportProductModalStep = "idle" | "preview" | "importing" | "done";

export type ImportProductModalProps = {
  onClose: () => void;
  onSuccess: () => void;
  importFileRef: React.RefObject<HTMLInputElement | null>;
  dictionary: ImportProductDictionary;
};

export type InventoryManagerProps = { dictionary: InventoryDictionary; locale: string; initialStatus?: string };

export type InventoryManagerStatus = "ready" | "low" | "out" | "inactive";

export type InventoryManagerMovementKind = "receive" | "sale" | "adjust" | "transfer" | "countCorrection" | "return";

export type LocationTransferDrawerLocationTransferDict = {
  ltTitle: string; ltProduct: string; ltSource: string; ltSourceQty: string;
  ltDestination: string; ltAmount: string; ltReason: string; ltNote: string;
  ltSelectSource: string; ltSelectDestination: string; ltConfirm: string;
  ltSubmitting: string; ltCancel: string; ltSuccess: string; ltForbidden: string;
  ltSalePointTag: string; ltStorageTag: string; ltDefaultSaleHint: string;
  ltReadyLabel: string; ltWarehouseStockLabel: string; ltTotalLabel: string; ltPreviewTitle: string;
  ltReasonReplenish: string; ltReasonReturnStorage: string; ltReasonRebalance: string;
  ltReasonReorganize: string; ltReasonOther: string;
  ltValSourceRequired: string; ltValDestRequired: string; ltValSameLocation: string;
  ltValInsufficient: string; ltValReasonRequired: string; ltValNoteRequired: string; ltNoSourceStock: string;
};

export type LocationTransferDrawerProps = {
  open: boolean;
  productId: string;
  productName: string;
  presetSourceLocationId?: string;
  canManage: boolean;
  dict: LocationTransferDrawerLocationTransferDict;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export type ProductBrandModalProductBrandModalProps = {
  activeLabel: string;
  cancelLabel: string;
  description: string;
  error: string;
  isActive: boolean;
  isOpen: boolean;
  isPending: boolean;
  name: string;
  onActiveChange: (checked: boolean) => void;
  onClose: () => void;
  onDescriptionChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  title: string;
  unitsDictionary: UnitsDictionary;
};

export type ProductCardGridProductCardLabels = {
  sku: string;
  category: string;
  brand: string;
  stock: string;
  stockReady: string;
  lowStock: string;
  outOfStock: string;
  statusActive: string;
  statusInactive: string;
  locationUnassigned: string;
  viewAction: string;
  barcodeAction: string;
  editAction: string;
  deleteAction: string;
};

export type ProductCardGridProductCardGridProps = {
  products: Product[];
  isPending: boolean;
  emptyState: string;
  labels: ProductCardGridProductCardLabels;
  onView: (product: Product) => void;
  onBarcode: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
};

export type ProductCardGridStockHealth = "ready" | "low" | "out" | "unknown";

export type ProductDetailViewTab = "general" | "barcode" | "inventory" | "movements";

export type ProductDetailViewProductDetailViewProps = {
  product: Product | null;
  dictionary: StockManagerDictionary;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onBarcode: (product: Product) => void;
};

export type ProductFormModalProductFormDrawerProps = {
  closeLabel: string;
  error?: string;
  formLabels: ProductFormLabels;
  formState: ProductInput;
  isOpen: boolean;
  isPending: boolean;
  isEditing: boolean;
  managementDictionary: ManagementDictionary;
  onClose: () => void;
  onFormStateChange: (updater: (current: ProductInput) => ProductInput) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  productBrands: ProductBrand[];
  productTypes: ProductType[];
  quickActionLabel: string;
  supplierOptions: { id: string; name: string }[];
  unitOptions: ProductUnit[];
};

export type ProductFormModalProductFieldProps = {
  badgeTone?: "optional" | "required";
  badgeText?: string;
  children: ReactNode;
  label: string;
};

export type ProductTypeModalProductTypeModalProps = {
  cancelLabel: string;
  description: string;
  error: string;
  isActive: boolean;
  isOpen: boolean;
  isPending: boolean;
  isEditing: boolean;
  managementDictionary: ManagementDictionary;
  name: string;
  onActiveChange: (checked: boolean) => void;
  onClose: () => void;
  onDescriptionChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
};

export type ProductUnitModalProductUnitModalProps = {
  activeLabel: string;
  cancelLabel: string;
  description: string;
  error: string;
  isActive: boolean;
  isEditing: boolean;
  isOpen: boolean;
  isPending: boolean;
  name: string;
  onActiveChange: (checked: boolean) => void;
  onClose: () => void;
  onDescriptionChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  title: string;
  unitsDictionary: UnitsDictionary;
};

export type ProductsTableProductsTableProps = {
  emptyState: string;
  isPending: boolean;
  loadingLabel: string;
  lowStockLabel: string;
  outOfStockLabel: string;
  managementDictionary: ManagementDictionary;
  onDelete: (productId: string) => void;
  onDeleteMany: (productIds: string[]) => void;
  onEdit: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
  onExport: (selectedIds: string[]) => void;
  /** Open the (single) Barcode Center for one product. */
  onBarcode?: (product: Product) => void;
  /** Open the Barcode Center in batch mode for many products. */
  onBulkBarcode?: (products: Product[]) => void;
  /** Open the Product Detail page (whole-row click). */
  onRowClick?: (product: Product) => void;
  /** When false, the per-row Adjust-stock action is hidden (product master list). */
  showStockActions?: boolean;
  products: Product[];
  productTypes?: ProductType[];
  onBulkEnable?: (ids: string[]) => void;
  onBulkDisable?: (ids: string[]) => void;
  onBulkCategoryChange?: (ids: string[], categoryId: string) => void;
  receiveDictionary: {
    receiveStockTitle: string;
    receiveStock: string;
    receiveStockConfirm: string;
    receiveStockSuccess: string;
    quantityToAdd: string;
    productName: string;
    currentStock: string;
    note?: string;
    cancel: string;
    saving: string;
    historyTab?: string;
    historyEmpty?: string;
    historyProduct?: string;
    historyQty?: string;
    historyDate?: string;
    historyNote?: string;
    historyOperator?: string;
    historyLoadError?: string;
  };
  tableDictionary: StockManagerDictionary["table"];
};

export type ProductsTableDensity = "comfortable" | "compact" | "warehouse";

export type ProductsTableHealth = "ready" | "low" | "out" | "unknown";

export type StockAdjustDrawerAdjustType = "receive" | "decrease" | "set";

export type StockAdjustDrawerLocationOption = Location & { quantity: number; isDefault: boolean };

export type StockAdjustDrawerProps = {
  product: Product | null;
  // When provided (Warehouse entry point) the candidate locations are restricted to this
  // warehouse. Absent (Inventory entry point) → every active location in the store.
  warehouseId?: string;
  dict: InventoryAdjustDictionary;
  onClose: () => void;
  onSuccess: () => void;
};

export type StockAdjustModalProps = {
  product: Product | null;
  onClose: () => void;
  onSuccess: () => void;
};

export type StockCountManagerCountRowStatus = "match" | "short" | "over" | "notCounted" | "skipped";

export type StockCountManagerCountMode = "table" | "quick";

export type StockCountManagerReviewDisplayMode = "variance" | "all";

export type StockCountManagerStockFilter = "all" | "ready" | "low" | "out" | "unassigned";

export type StockCountManagerCountFilterTab = "all" | "notCounted" | "counted" | "variance";

export type StockCountManagerVarianceSeverity = "low" | "medium" | "high" | "critical";

export type StockCountManagerQuickScanEntry = {
  productId: string;
  name: string;
  qty: number;
  time: string;
  status: StockCountManagerCountRowStatus;
};

export type StockCountManagerProps = { dictionary: CountDictionary; locale: string; autoStart?: boolean; initialStatus?: string };

export type StockCountManagerView = "list" | "wizard";

export type StockCountManagerListStatusFilter = CountStatus | "all" | "pending";

export type StockLevelsSectionProductStockStatus =
  | "all"
  | "active"
  | "inactive"
  | "low_stock"
  | "out_of_stock";

export type StockLevelsSectionStockLevelsSectionProps = {
  dictionary: StockManagerDictionary;
  /** Stock mode (Inventory page): show stock-mutating actions and force table view.
   * Default false = Product master-data list (read-only stock, card/table toggle). */
  allowStockActions?: boolean;
  /** When set, auto-opens the ProductDetailView for the product with this ID once products load. */
  initialDetailProductId?: string;
  emptyState: string;
  error: string;
  filteredProducts: Product[];
  isPending: boolean;
  loadingLabel: string;
  managementDictionary: ManagementDictionary;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onDelete: (productId: string) => void;
  onDeleteMany: (productIds: string[]) => void;
  onEdit: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
  onOpenCreateModal: () => void;
  onProductBrandFilterChange: (brandId: string) => void;
  onProductTypeFilterChange: (productTypeId: string) => void;
  onProductUnitFilterChange: (productUnitId: string) => void;
  onSearchChange: (value: string) => void;
  onStockStatusFilterChange: (status: StockLevelsSectionProductStockStatus) => void;
  sortBy: "created_at" | "updated_at";
  onSortChange: (sort: "created_at" | "updated_at") => void;
  paginationCurrentPage: number;
  paginationPageSize: number;
  paginationTotalItems: number;
  paginationTotalPages: number;
  productBrandFilter: string;
  productBrands: ProductBrand[];
  productTypeFilter: string;
  productTypes: ProductType[];
  productUnitFilter: string;
  productUnits: ProductUnit[];
  search: string;
  stockStatusFilter: StockLevelsSectionProductStockStatus;
  statusCounts: { all: number; active: number; low_stock: number; out_of_stock: number; inactive: number };
  locations: Location[];
  locationFilter: string;
  noLocationFilter: boolean;
  onLocationFilterChange: (id: string) => void;
  onNoLocationFilterChange: (v: boolean) => void;
  summaryStats: { total: number; ready: number; low: number; out: number; value: number };
  onBulkEnable: (ids: string[]) => void;
  onBulkDisable: (ids: string[]) => void;
  onBulkCategoryChange: (ids: string[], categoryId: string) => void;
};

export type StockManagerProductStockStatus = "all" | "active" | "inactive" | "low_stock" | "out_of_stock";

export type StockReceiveModalStockReceiveModalProps = {
  dictionary: {
    receiveStockTitle?: string;
    receiveStock?: string;
    receiveStockConfirm?: string;
    receiveStockSuccess?: string;
    quantityToAdd?: string;
    productName?: string;
    currentStock?: string;
    note?: string;
    cancel?: string;
    saving?: string;
    historyTab?: string;
    historyEmpty?: string;
    historyProduct?: string;
    historyQty?: string;
    historyDate?: string;
    historyNote?: string;
    historyOperator?: string;
    historyLoadError?: string;
  };
  onClose: () => void;
  onComplete: () => void;
  products: Product[];
  selectedIds: Set<string>;
};

export type StorageAssignmentCardStorageAssignmentLabels = {
  hint: string;
  warehouseLabel: string;
  zoneLabel: string;
  locationLabel: string;
  optionalLabel: string;
  placeholder: string;
  selectWarehouseFirst: string;
  noWarehouses: string;
  noLocations: string;
  currentLabel: string;
  clearLabel: string;
  unavailableLabel: string;
};

export type WarehouseSectionWarehouseSectionDictionary = {
  title: string;
  helper: string;
  empty: string;
  nameLabel: string;
  codeLabel: string;
  addressLabel: string;
  phoneLabel: string;
  contactNameLabel: string;
  activeLabel: string;
  inactiveLabel: string;
  createButton: string;
  editLabel: string;
  deleteLabel: string;
  createTitle: string;
  editTitle: string;
  saveButton: string;
  cancel: string;
  nameRequired: string;
  deleteConfirm: string;
  deleteConfirmTitle: string;
  productsLabel: string;
  addProductLabel: string;
  searchProductLabel: string;
  noProductsLabel: string;
  addLabel: string;
  noProductsInWarehouseLabel: string;
  addStandaloneLabel: string;
  fromStockLabel: string;
  newProductLabel: string;
  standaloneNameLabel: string;
  standaloneSkuLabel: string;
  standaloneBarcodeLabel: string;
  standalonePriceLabel: string;
  standaloneUnitLabel: string;
  standaloneTypeLabel: string;
  standaloneNameRequired: string;
  totalStockLabel: string;
  totalValueLabel: string;
  manageLabel: string;
  exportLabel: string;
  perPageLabel: string;
  prevLabel: string;
  nextLabel: string;
  showingLabel: string;
  fromLabel: string;
  itemsLabel: string;
  barcodeTitle: string;
  printLabel: string;
  closeLabel: string;
  invalidBarcodeLabel: string;
  noBarcodeLabel: string;
  barcodeTooltip: string;
  tableImageCol: string;
  tableDetailsCol: string;
  tableBarcodeCol: string;
  tableCategoryCol: string;
  tablePriceCol: string;
  tableStockCol: string;
  tableActionsCol: string;
  qtyLabel: string;
  saveLabel: string;
  outOfStockLabel: string;
  lowStockLabel: string;
  editQtyTitle: string;
  exportBarcodeLabel: string;
  receiveStockLabel: string;
  addDisabledMessage: string;
  removeHasStockMessage: string;
  locationDeleteBlockedMessage: string;
  receiveStockTitle: string;
  transferLabel: string;
  transferTitle: string;
  transferQtyLabel: string;
  transferDestLabel: string;
  transferToStockLabel: string;
  transferToWarehouseLabel: string;
  transferNoteLabel: string;
  transferConfirmLabel: string;
  selectDestWarehouseLabel: string;
  currentStoreLabel: string;
  selectTargetStoreLabel: string;
  crossStoreWarehouseInfo: string;
  availableQtyLabel: string;
  noteLabel: string;
  warehouseTransferredLabel: string;
  locationsLabel: string;
  manageLocationsLabel: string;
  backToWarehousesLabel: string;
  locationNameLabel: string;
  locationCodeLabel: string;
  locationSalePointLabel: string;
  locationStorageLabel: string;
  locationActiveLabel: string;
  locationInactiveLabel: string;
  addLocationLabel: string;
  createLocationTitle: string;
  editLocationTitle: string;
  locationNameRequired: string;
  locationDeleteConfirm: string;
  noLocationsLabel: string;
  locationSalePointHint: string;
  // Phase W4A — canonical location-aware transfer drawer keys.
  ltTitle: string; ltProduct: string; ltSource: string; ltSourceQty: string;
  ltDestination: string; ltAmount: string; ltReason: string; ltNote: string;
  ltSelectSource: string; ltSelectDestination: string; ltConfirm: string;
  ltSubmitting: string; ltCancel: string; ltSuccess: string; ltForbidden: string;
  ltSalePointTag: string; ltStorageTag: string; ltDefaultSaleHint: string;
  ltReadyLabel: string; ltWarehouseStockLabel: string; ltTotalLabel: string; ltPreviewTitle: string;
  ltReasonReplenish: string; ltReasonReturnStorage: string; ltReasonRebalance: string;
  ltReasonReorganize: string; ltReasonOther: string;
  ltValSourceRequired: string; ltValDestRequired: string; ltValSameLocation: string;
  ltValInsufficient: string; ltValReasonRequired: string; ltValNoteRequired: string; ltNoSourceStock: string;
};

export type WarehouseSectionWarehouseSectionProps = {
  dictionary: WarehouseSectionWarehouseSectionDictionary;
};

export type WarehouseSectionWarehouseFormState = {
  name: string;
  code: string;
  address: string;
  phone: string;
  contact_name: string;
  is_active: boolean;
};
