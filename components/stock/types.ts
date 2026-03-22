import type { ProductInput } from "@/types/product";

export type StockManagerDictionary = {
  assetValue: {
    label: string;
  };
  emptyState: string;
  filters: {
    categoryLabel: string;
    gridView: string;
    listView: string;
    statusLabel: string;
  };
  form: {
    activeLabel: string;
    activeHint: string;
    amountLabel: string;
    basePriceLabel: string;
    basePriceHint: string;
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
    createUnitTitle: string;
    descriptionLabel: string;
    editLabel: string;
    expandLabel: string;
    collapseLabel: string;
    editTypeTitle: string;
    editUnitTitle: string;
    helper: string;
    inactiveLabel: string;
    saveTypeButton: string;
    saveUnitButton: string;
    title: string;
    typeEmpty: string;
    typeNameLabel: string;
    typeRequiredError: string;
    typeSlugLabel: string;
    typeTitle: string;
    typesCountLabel: string;
    unitEmpty: string;
    unitTitle: string;
    unitsCountLabel: string;
  };
  pagination: {
    activePage: string;
    next: string;
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
    lowStockLabel: string;
    totalProductsLabel: string;
  };
  table: {
    actions: string;
    category: string;
    deleteAction: string;
    editAction: string;
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
};

export type ProductFormLabels = StockManagerDictionary["form"];
export type ManagementDictionary = NonNullable<StockManagerDictionary["management"]>;
export type UnitsDictionary = NonNullable<StockManagerDictionary["units"]>;
export const initialProductFormState: ProductInput = {
  base_price: "",
  is_active: true,
  name: "",
  quantity: "0",
  sku: "",
  special_price: "",
  unit_type: "piece",
};
