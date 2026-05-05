"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { AuthRequiredState } from "@/components/layout/auth-required-state";
import { EmptyState } from "@/components/layout/empty-state";
import { ReceiptUpload } from "@/components/scan/receipt-upload";
import { ReceiptConfirm } from "@/components/scan/receipt-confirm";
import type { ReceiptItemWithOwner } from "@/components/scan/receipt-confirm";
import { getExchangeRate, jpyToTwd } from "@/lib/exchange-rate";
import { toast } from "sonner";
import type { OCRResult, PaymentMethod } from "@/types";
import { Camera as CameraIcon } from "lucide-react";
import { addGuestExpense, getGuestOcrCount, getGuestOcrLimit, incrementGuestOcrCount } from "@/lib/guest-storage";

export default function ScanPage() {
  const { user, currentTrip, isGuest } = useApp();
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [receiptImageFile, setReceiptImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleImageSelected = async (base64: string, mimeType: string, file: File) => {
    setReceiptImageFile(file);
    if (!currentTrip) {
      toast.error("請先建立一個旅程");
      return;
    }

    if (isGuest) {
      const count = getGuestOcrCount();
      const limit = getGuestOcrLimit();
      if (count >= limit) {
        toast.error(`訪客模式掃描已達上限（${limit} 次），登入後可享每日 50 次`);
        return;
      }
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
      if (isGuest) incrementGuestOcrCount();
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
    creditCardPlanId: string | null;
    storeName: string;
    storeNameJa: string;
    date: string;
  }) => {
    if (!currentTrip) return;
    if (!isGuest && !user) return;
    setSaving(true);

    try {
      const rate = await getExchangeRate();
      const now = new Date();
      const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const expenseDate = data.date || localToday;

      if (isGuest) {
        let savedCount = 0;
        for (const item of data.items) {
          const jpy = item.quantity * item.unit_price;
          const twd = jpyToTwd(jpy, rate);
          const result = addGuestExpense({
            title: item.name,
            amount_jpy: jpy,
            amount_twd: twd,
            exchange_rate: rate,
            category: item.category,
            payment_method: data.paymentMethod,
            store_name: data.storeName || null,
            expense_date: expenseDate,
            credit_card_id: data.creditCardId,
            credit_card_plan_id: data.creditCardPlanId,
          });
          if (!result) {
            toast.error("儲存空間不足，請清理部分紀錄");
            break;
          }
          savedCount++;
        }
        if (savedCount > 0) {
          toast.success(`已儲存 ${savedCount} 筆消費`);
          router.push("/records");
        }
      } else {
        let receiptImageUrl: string | null = null;
        if (receiptImageFile) {
          try {
            const formData = new FormData();
            formData.append("file", receiptImageFile);
            const uploadRes = await fetch("/api/receipt-image", { method: "POST", body: formData });
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              receiptImageUrl = uploadData.imageUrl;
            } else {
              console.error("Receipt upload failed:", uploadRes.status);
              toast.warning("收據照片上傳失敗，消費紀錄仍會保存");
            }
          } catch (err) {
            console.error("Receipt upload error:", err);
            toast.warning("收據照片上傳失敗，消費紀錄仍會保存");
          }
        }

        const results = await Promise.all(
          data.items.map(async (item) => {
            const jpy = item.quantity * item.unit_price;
            const twd = jpyToTwd(jpy, rate);

            const res = await fetch("/api/expenses", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                trip_id: currentTrip.id,
                paid_by: user!.id,
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
                credit_card_plan_id: data.creditCardPlanId,
                receipt_image_url: receiptImageUrl,
                // Subset participants for split items; ignored by API for personal.
                participants:
                  item.split_type === "split" ? item.participants : undefined,
              }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "儲存失敗");
            return result;
          })
        );

        toast.success(`已儲存 ${results.length} 筆消費`);
        router.push("/records");
      }
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

  if (!isGuest && !user) {
    return (
      <AuthRequiredState
        icon={CameraIcon}
        description="登入或使用訪客模式後，就能掃描收據並自動建立消費紀錄。"
      />
    );
  }

  const guestOcrCount = isGuest ? getGuestOcrCount() : 0;
  const guestOcrLimit = getGuestOcrLimit();
  const guestOcrRemaining = guestOcrLimit - guestOcrCount;

  return (
    <div className="flex min-h-full flex-col pb-4">
      {isGuest && guestOcrRemaining <= 0 && !ocrResult ? (
        <EmptyState
          icon={CameraIcon}
          title="訪客掃描次數已用完"
          description={`訪客模式最多可掃描 ${guestOcrLimit} 張收據，登入後可享每日 50 次掃描額度。`}
          action={{ label: "登入 / 註冊", href: "/auth/login" }}
          className="flex-1"
        />
      ) : ocrResult ? (
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
        <div className="flex flex-1 items-center">
          <ReceiptUpload
            onImageSelected={handleImageSelected}
            isProcessing={isProcessing}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
