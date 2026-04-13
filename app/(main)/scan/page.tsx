"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { PageHeader } from "@/components/layout/page-header";
import { ReceiptUpload } from "@/components/scan/receipt-upload";
import { ReceiptConfirm } from "@/components/scan/receipt-confirm";
import type { ReceiptItemWithOwner } from "@/components/scan/receipt-confirm";
import { getExchangeRate, jpyToTwd } from "@/lib/exchange-rate";
import { toast } from "sonner";
import type { OCRResult, PaymentMethod } from "@/types";
import Link from "next/link";
import { Camera as CameraIcon } from "lucide-react";

export default function ScanPage() {
  const { user, currentTrip, isGuest } = useApp();
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
        const err = await res.json().catch(() => ({}));
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

  const handleConfirm = async (data: {
    items: ReceiptItemWithOwner[];
    paymentMethod: PaymentMethod;
    creditCardId: string | null;
    storeName: string;
    storeNameJa: string;
    date: string;
  }) => {
    if (!currentTrip || !user) return;
    setSaving(true);

    try {
      const rate = await getExchangeRate();
      const now = new Date();
      const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const expenseDate = data.date || localToday;

      const results = await Promise.all(
        data.items.map(async (item) => {
          const jpy = item.quantity * item.unit_price;
          const twd = jpyToTwd(jpy, rate);

          const res = await fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              trip_id: currentTrip.id,
              paid_by: user.id,
              owner_id: item.owner_id,
              title: item.name,
              title_ja: item.name_ja || null,
              amount_jpy: jpy,
              amount_twd: twd,
              exchange_rate: rate,
              category: item.category,
              payment_method: data.paymentMethod,
              store_name: data.storeName,
              store_name_ja: data.storeNameJa || null,
              expense_date: expenseDate,
              split_type: item.split_type,
              credit_card_id: data.creditCardId,
            }),
          });

          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "儲存失敗");
          return result;
        })
      );

      toast.success(`已儲存 ${results.length} 筆消費`);
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

  if (isGuest || !user) {
    return (
      <div className="pb-4">
        <PageHeader title="掃描收據" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
            <CameraIcon className="h-8 w-8 text-blue-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">
            AI 收據辨識需要登入才能使用
          </h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            登入後可拍照上傳日文收據，<br />
            AI 自動辨識店名、金額、品項並翻譯成中文
          </p>
          <Link
            href="/auth/login"
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-medium transition-colors"
          >
            登入 / 註冊
          </Link>
          <Link
            href="/"
            className="mt-3 text-sm text-muted-foreground hover:text-slate-700 transition-colors"
          >
            返回首頁
          </Link>
        </div>
      </div>
    );
  }

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
