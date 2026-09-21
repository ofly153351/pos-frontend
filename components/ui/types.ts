export type AlertAlertTone = "success" | "error" | "info" | "warning";

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** "danger" → red confirm button (destructive actions). */
  tone?: "danger" | "default";
  /** Disables both buttons + shows a spinner while the action runs. */
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export type EntityComboboxEntityComboboxItem = {
  id: string;
  /** Primary label (shown bold). */
  label: string;
  /** Secondary text under the label (member code / phone / …). */
  subtitle?: string;
  /** Small right-aligned badge (e.g. "L1 • 5%"). */
  badge?: string;
  /** Extra keywords matched by search in addition to label/subtitle. */
  keywords?: string[];
};

export type EntityComboboxEntityComboboxLabels = {
  placeholder: string;
  noResults: string;
};

export type EntityComboboxProps = {
  items: EntityComboboxEntityComboboxItem[];
  value: string;
  onChange: (id: string) => void;
  labels: EntityComboboxEntityComboboxLabels;
  /** Renders an extra pinned row at the end of the dropdown (e.g. "+ create new"). */
  footerOption?: { id: string; label: string; onPick: () => void };
  /** Optional wrapper class for the trigger + dropdown container. */
  className?: string;
  /** Show a small ✕ on the selected value to clear it. */
  clearable?: boolean;
  disabled?: boolean;
};

export type SkeletonSkeletonProps = {
  className?: string;
  style?: React.CSSProperties;
};

export type SuccessPopupSuccessPopupProps = {
  message: string | null;
  autoClose?: boolean;
  duration?: number;
  onClose?: () => void;
};

export type ToastToastTone = "success" | "error" | "info" | "warning";

export type ToastToastEntry = {
  id: string;
  tone: ToastToastTone;
  message: string;
  duration: number;
};
