import type { Locale } from "@/lib/locale-config";

export type StoreSetupFormStoreSetupDictionary = {
  createTitle: string;
  descriptionLabel: string;
  helper: string;
  nameLabel: string;
  phoneLabel: string;
  addressLabel: string;
  currencyLabel: string;
  save: string;
  selectedPlanEmpty: string;
  selectedPlanLabel: string;
  planRequired: string;
  saving: string;
  title: string;
  planNames: Record<string, string>;
};

export type StoreSetupFormStoreSetupFormProps = {
  dictionary: StoreSetupFormStoreSetupDictionary;
  locale: Locale;
};
