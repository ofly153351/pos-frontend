import type { ProductInput } from "@/types/product";

export type StockManagerDictionary = {
  assetValue: {
    label: string;
  };
  emptyState: string;
  filters: {
    activeStatus: string;
    allCategories: string;
    allStatuses: string;
    allTypes: string;
    categoryLabel: string;
    gridView: string;
    inactiveStatus: string;
    listView: string;
    lowStockStatus: string;
    outOfStockStatus: string;
    statusLabel: string;
    typeLabel: string;
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
    optionalLabel: string;
    requiredLabel: string;
    save: string;
    setupSection: string;
    setupSectionHint: string;
    skuLabel: string;
    skuHint: string;
    specialPriceLabel: string;
    specialPriceHint: string;
    titleCreate: string;
    titleEdit: string;
    unitPair: string;
    unitPiece: string;
    unitTypeLabel: string;
    unitTypeHint: string;
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
    category: string;
    deleteAction: string;
    editAction: string;
    invalidBarcodeLabel: string;
    noBarcodeLabel: string;
    price: string;
    productDetails: string;
    sku: string;
    stock: string;
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
};

export type StockManagerProps = {
  dictionary: StockManagerDictionary;
  initialSection?: "categories" | "stock-levels";
};

export type ProductFormLabels = StockManagerDictionary["form"];
export type ManagementDictionary = NonNullable<StockManagerDictionary["management"]>;
export type UnitsDictionary = NonNullable<StockManagerDictionary["units"]>;
export const initialProductFormState: ProductInput = {
  base_price: "",
  brand_id: "",
  is_active: true,
  name: "",
  quantity: "0",
  sku: "",
  special_price: "",
  unit_id: "",
};
