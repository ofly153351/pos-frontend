import type { Campaign } from "./promotion-types";
import type { PromotionDictionary } from "./promotion-types";
import type { Locale } from "@/lib/locale-config";

export type PromotionManagerPreviewRow = { label: string; value: React.ReactNode; accent?: boolean };

export type PromotionManagerEditorProps = {
  form: Partial<Campaign>;
  onChange: (patch: Partial<Campaign>) => void;
  onSave: () => void;
  onCancel: () => void;
  campaigns: Campaign[];
  editingId: string | null;
  dict: PromotionDictionary;
  isPending: boolean;
};

export type PromotionManagerPromotionManagerProps = {
  dictionary: PromotionDictionary;
  locale: Locale;
};

export type ScopePickerPickerItem = { id: string; name: string; sub?: string };

export type ScopePickerGenericPickerDict = {
  searchPlaceholder: string;
  /** Must contain the literal string "{count}" */
  selectedCount: string;
  clearAll: string;
  noResults: string;
  loading: string;
  loadMore: string;
};

export type ScopePickerGenericPickerProps = {
  items: ScopePickerPickerItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Called whenever the id→name map derived from `items` changes */
  onNamesChange?: (map: Record<string, string>) => void;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  /** When set, renders a mobile camera-scan button next to the search input. Only the
   *  product picker passes this — category/brand searches have no barcode to scan. */
  scanTitle?: string;
  dict: ScopePickerGenericPickerDict;
};
