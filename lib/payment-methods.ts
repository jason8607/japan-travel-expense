import type { OCRPaymentCode, PaymentMethod } from "@/types";

export const OCR_TO_PAYMENT_METHOD = {
  cash: "現金",
  credit_card: "信用卡",
  paypay: "PayPay",
  suica: "Suica",
  other: "其他",
} as const satisfies Record<OCRPaymentCode, PaymentMethod>;

export function isOCRPaymentCode(value: unknown): value is OCRPaymentCode {
  return typeof value === "string" && value in OCR_TO_PAYMENT_METHOD;
}
