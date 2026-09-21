import type th from "@/locales/th.json";
import type { addMember } from "@/services/members";
import type { toast } from "@/components/ui/toast";
import type { MemberStatus } from "@/types/member";
import type { StoreRole } from "@/types/member";

export type ReceiptPaymentSettingsT = typeof th.receiptSettings;

export type ReceiptPaymentSettingsTaxMode = "none" | "inclusive" | "exclusive";

export type ReceiptPaymentSettingsPaperSize = "80mm" | "a4";

export type ReceiptPaymentSettingsLogoPosition = "top_center" | "top_left" | "top_right";

export type ReceiptPaymentSettingsTabKey = "receipt" | "payment" | "promptpay" | "bankAccounts" | "gateway" | "printer" | "display";

export interface ReceiptPaymentSettingsPaymentChannel {
  key: string;
  name: string;
  enabled: boolean;
  color: string;
  icon: React.ReactNode;
}

export type ReceiptPaymentSettingsGatewayProvider = "none" | "omise" | "2c2p";

export type ReceiptPaymentSettingsGatewayConfig = {
  provider: ReceiptPaymentSettingsGatewayProvider;
  omise: { public_key: string; secret_key: string; webhook_secret: string };
  c2p: { merchant_id: string; secret_key: string };
};

export type StaffManagerDict = {
  pageTitle: string;
  pageSubtitle: string;
  addMember: string;
  refresh: string;
  empty: string;
  forbidden: string;
  you: string;
  table: { name: string; email: string; role: string; status: string; joined: string; actions: string };
  roles: Record<StoreRole, string>;
  statusLabels: Record<MemberStatus, string>;
  rowActions: { suspend: string; activate: string; remove: string };
  form: {
    title: string;
    subtitle: string;
    name: string;
    email: string;
    password: string;
    passwordHint: string;
    role: string;
    submit: string;
    cancel: string;
  };
  confirmRemove: string;
  confirmRemoveTitle: string;
  errors: {
    generic: string;
    nameRequired: string;
    emailRequired: string;
    passwordTooShort: string;
    alreadyMember: string;
    lastOwner: string;
    ownerOnly: string;
    selfRemove: string;
    selfSuspend: string;
  };
  toast: { added: string; updated: string; removed: string };
};
