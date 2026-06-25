/** Shared payment-method label resolver.
 *  Accepts the internal method code and a dict slice that must contain the required keys.
 */

export type PaymentMethodDict = {
  methodCash: string;
  methodQr: string;
  methodTransfer: string;
  methodCard: string;
  methodBankTransfer: string;
  methodCreditCard: string;
  methodDebitCard: string;
  methodCredit: string;
  methodOther: string;
};

/** Returns a localised display label for an internal payment method code. */
export function getPaymentMethodLabel(method: string | undefined, dict: PaymentMethodDict): string {
  switch (method) {
    case "cash":
      return dict.methodCash;
    case "promptpay":
    case "qr":
    case "transfer": // legacy alias for promptpay
      return dict.methodQr;
    case "bank_transfer":
      return dict.methodBankTransfer;
    case "card":
    case "debit":
      return dict.methodCard;
    case "credit_card":
      return dict.methodCreditCard;
    case "debit_card":
      return dict.methodDebitCard;
    case "credit":
      return dict.methodCredit;
    default:
      return dict.methodOther;
  }
}
