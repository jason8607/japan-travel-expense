"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { PageHeader } from "@/components/layout/page-header";
import { ReceiptUpload } from "@/components/scan/receipt-upload";
import { ReceiptConfirm } from "@/components/scan/receipt-confirm";
import { getExchangeRate, jpyToTwd } from "@/lib/exchange-rate";
import { toast } from "sonner";
import type { OCRResult, Category, PaymentMethod, SplitType } from "@/types";

export default function ScanPage() {
  const { user, currentTrip } = useApp();
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [saving, setSaving] = useState(false);

  const handleImageSelected = async (base64: string, mimeType: string) => {
    if (!currentTrip) {
      toast.error("請先建立一個旅程");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "辨識失敗");
      }

      const result: OCRResult = await res.json();
      setOcrResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "辨識失敗";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async (result: OCRResult, category: Category, paymentMethod: PaymentMethod, splitType: SplitType) => {
    if (!currentTrip || !user) return;
    setSaving(true);

    try {
      const rate = await getExchangeRate();
      const totalJpy = result.items.reduce(
        (s, item) => s + item.quantity * item.unit_price,
        0
      );

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip_id: currentTrip.id,
          paid_by: user.id,
          title: result.store_name,
          title_ja: result.store_name_ja,
          amount_jpy: totalJpy,
          amount_twd: jpyToTwd(totalJpy, rate),
          exchange_rate: rate,
          category,
          payment_method: paymentMethod,
          store_name: result.store_name,
          store_name_ja: result.store_name_ja,
          expense_date:
            result.date || new Date().toISOString().split("T")[0],
          split_type: splitType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "儲存失敗");

      toast.success(`已儲存 ${result.items.length} 筆消費`);
      router.push("/records");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "儲存失敗";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setOcrResult(null);
  };

  return (
    <div className="pb-4">
      <PageHeader
        title="掃描收據"
        subtitle="拍照或上傳收據圖片"
        showBack={!!ocrResult}
      />

      {ocrResult ? (
        <>
          <div className="px-4 mb-4">
            <h2 className="text-lg font-bold">確認收據內容</h2>
            <p className="text-sm text-muted-foreground">
              請確認或修改以下辨識結果
            </p>
          </div>
          <ReceiptConfirm
            result={ocrResult}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            saving={saving}
          />
        </>
      ) : (
        <ReceiptUpload
          onImageSelected={handleImageSelected}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
