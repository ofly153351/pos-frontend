export interface PaymentChannelSetting {
  key: string;
  enabled: boolean;
}

export interface ReceiptSettingsData {
  id: string;
  store_id: string;
  template_key: string;
  paper_size: string;
  paper_length: string;
  tax_mode: "none" | "inclusive" | "exclusive";
  vat_rate: number;
  tax_label: string;
  show_logo: boolean;
  logo_position: "top_center" | "top_left" | "top_right";
  show_store_name: boolean;
  show_address: boolean;
  show_phone: boolean;
  show_tax_id: boolean;
  footer_text: string;
  payment_channels: PaymentChannelSetting[];
  printer_type: "thermal" | "inkjet" | "pdf";
  printer_name: string;
  auto_print: boolean;
  copies: number;
  show_qr: boolean;
  qr_size: "small" | "medium" | "large";
  show_customer_display: boolean;
  show_product_images: boolean;
  date_format: string;
  time_format: "24h" | "12h";
  currency_position: "before" | "after";
  created_at: string;
  updated_at: string;
}

export type UpdateReceiptSettingsInput = Partial<Omit<ReceiptSettingsData, "id" | "store_id" | "created_at" | "updated_at">>;
