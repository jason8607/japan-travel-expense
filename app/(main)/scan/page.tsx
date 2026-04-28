"use client";

import { ReceiptConfirm } from "@/components/scan/receipt-confirm";
import type { ReceiptItemWithOwner } from "@/components/scan/receipt-confirm";
import { ReceiptUpload } from "@/components/scan/receipt-upload";
import { useApp } from "@/lib/context";
import { getExchangeRate, jpyToTwd } from "@/lib/exchange-rate";
import {
  addGuestExpense,
  getGuestOcrCount,
  getGuestOcrLimit,
  incrementGuestOcrCount,
} from "@/lib/guest-storage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { OCRResult, PaymentMethod } from "@/types";

export default function ScanPage() {
  const { user, currentTrip, isGuest } = useApp();
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [receiptImageFile, setReceiptImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  const resetUpload = () => {
    setReceiptImageFile(null);
    setScanError(null);
    setOcrResult(null);
    setResetSignal((n) => n + 1);
  };

  const handleImageSelected = async (
    base64: string,
    mimeType: string,
    file: File,
  ) => {
    setReceiptImageFile(file);
    setScanError(null);
    if (!currentTrip) {
      const msg = "請先建立一個旅程";
      setScanError(msg);
      toast.error(msg);
      return;
    }

    if (isGuest) {
      const count = getGuestOcrCount();
      const limit = getGuestOcrLimit();
      if (count >= limit) {
        const msg = `訪客模式掃描已達上限（${limit} 次），登入後可享每日 50 次`;
        setScanError(msg);
        toast.error(msg);
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
      setScanError(message);
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
      const localToday = `${now.getFullYear()}-${String(
        now.getMonth() + 1,
      ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
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
            const uploadRes = await fetch("/api/receipt-image", {
              method: "POST",
              body: formData,
            });
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
              }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "儲存失敗");
            return result;
          }),
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
    resetUpload();
  };

  // Header strip — magazine masthead style
  const Masthead = ({
    kicker,
    title,
    sub,
  }: {
    kicker: string;
    title: React.ReactNode;
    sub?: string;
  }) => (
    <>
      <div className="ed-runhdr">
        <span>N°SCAN · OCR</span>
        <span>{new Date().getFullYear()} 旅 帳</span>
      </div>
      <div className="ed-rule" />
      <div className="ed-rule2" />
      <div style={{ padding: "20px 24px 0" }}>
        <div className="ed-page-title-kicker">{kicker}</div>
        <div className="ed-page-title-h">
          {title}
          <span className="ed-page-title-dot">.</span>
        </div>
        {sub ? (
          <div
            className="ed-mono"
            style={{
              marginTop: 8,
              fontSize: 10,
              letterSpacing: 2,
              color: "var(--ed-muted)",
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>
    </>
  );

  // Not signed in (and not guest)
  if (!isGuest && !user) {
    return (
      <div className="relative flex h-full flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ paddingBottom: 32 }}>
          <Masthead kicker="登 入 提 示" title={<>請先登入<br />或以訪客模式</>} />
          <div style={{ padding: "32px 24px 0" }}>
            <Link
              href="/auth/login"
              className="ed-btn-primary"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              登 入 ／ 註 冊
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const guestOcrCount = isGuest ? getGuestOcrCount() : 0;
  const guestOcrLimit = getGuestOcrLimit();
  const guestOcrRemaining = guestOcrLimit - guestOcrCount;
  const guestOutOfQuota = isGuest && guestOcrRemaining <= 0 && !ocrResult;

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ paddingBottom: 96 }}>
        {ocrResult ? (
          <>
            <Masthead
              kicker="O C R · 確 認 內 容"
              title={
                <>
                  辨識完成，
                  <br />
                  請確認
                </>
              }
              sub="可即時編輯品項、分類與分帳"
            />
            <div style={{ marginTop: 22 }}>
              <ReceiptConfirm
                result={ocrResult}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                saving={saving}
              />
            </div>
          </>
        ) : guestOutOfQuota ? (
          <>
            <Masthead
              kicker="額 度 用 罄"
              title={
                <>
                  訪客掃描
                  <br />
                  次數用完
                </>
              }
              sub={`訪客模式上限 ${guestOcrLimit} 次 · 登入後每日 50 次`}
            />
            <div style={{ padding: "32px 24px 0" }}>
              <Link
                href="/auth/login"
                className="ed-btn-primary"
                style={{
                  display: "block",
                  textAlign: "center",
                  textDecoration: "none",
                }}
              >
                登 入 ／ 註 冊
              </Link>
            </div>
          </>
        ) : (
          <>
            <Masthead
              kicker="O C R · 收 據 辨 識"
              title={
                <>
                  掃描，
                  <br />
                  記下這一筆
                </>
              }
              sub={
                isGuest
                  ? `訪 客 模 式 · 剩 餘 ${guestOcrRemaining} 次`
                  : "拍 照 或 上 傳 · A I 自 動 辨 識"
              }
            />
            <div style={{ marginTop: 18 }}>
              <ReceiptUpload
                onImageSelected={handleImageSelected}
                isProcessing={isProcessing}
                error={scanError}
                onReset={resetUpload}
                resetSignal={resetSignal}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
