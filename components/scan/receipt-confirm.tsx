"use client";

import { useCategories } from "@/hooks/use-categories";
import { useCreditCards } from "@/hooks/use-credit-cards";
import { useApp } from "@/lib/context";
import type { Category, OCRResult, PaymentMethod } from "@/types";
import Link from "next/link";
import { useState } from "react";

const PAYMENTS: PaymentMethod[] = ["現金", "信用卡", "PayPay", "Suica"];

export interface ReceiptItemWithOwner {
  _id: string;
  name: string;
  name_ja: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_type: string;
  owner_id: string | null;
  split_type: "personal" | "split";
  category: Category;
}

interface ReceiptConfirmProps {
  result: OCRResult;
  onConfirm: (data: {
    items: ReceiptItemWithOwner[];
    paymentMethod: PaymentMethod;
    creditCardId: string | null;
    creditCardPlanId: string | null;
    storeName: string;
    storeNameJa: string;
    date: string;
  }) => void;
  onCancel: () => void;
  saving: boolean;
}

export function ReceiptConfirm({
  result: initialResult,
  onConfirm,
  onCancel,
  saving,
}: ReceiptConfirmProps) {
  const { user, profile: myProfile, tripMembers } = useApp();
  const { categories: CATEGORIES } = useCategories();
  const { cards: creditCards } = useCreditCards();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initialResult.payment_method === "cash"
      ? "現金"
      : initialResult.payment_method === "credit_card"
        ? "信用卡"
        : initialResult.payment_method === "paypay"
          ? "PayPay"
          : initialResult.payment_method === "suica"
            ? "Suica"
            : "現金",
  );

  const [creditCardId, setCreditCardId] = useState<string | null>(null);
  const [creditCardPlanId, setCreditCardPlanId] = useState<string | null>(null);

  const defaultCategory = (CATEGORIES[0]?.value ?? "餐飲") as Category;
  const [items, setItems] = useState<ReceiptItemWithOwner[]>(
    initialResult.items.map((item) => ({
      ...item,
      _id: crypto.randomUUID(),
      owner_id: null,
      split_type: "personal" as const,
      category: defaultCategory,
    })),
  );

  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const [storeName] = useState(initialResult.store_name);
  const [storeNameJa] = useState(initialResult.store_name_ja);
  const [date] = useState(initialResult.date);

  const updateItem = (index: number, field: string, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        _id: crypto.randomUUID(),
        name_ja: "",
        name: "新品項",
        quantity: 1,
        unit_price: 0,
        tax_rate: 0.08,
        tax_type: "reduced",
        owner_id: null,
        split_type: "personal" as const,
        category: defaultCategory,
      },
    ]);
  };

  const setItemOwner = (
    index: number,
    ownerId: string | null,
    splitType: "personal" | "split",
  ) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, owner_id: ownerId, split_type: splitType } : item,
      ),
    );
  };

  const setAllOwner = (ownerId: string | null, splitType: "personal" | "split") => {
    setItems((prev) =>
      prev.map((item) => ({ ...item, owner_id: ownerId, split_type: splitType })),
    );
  };

  const setItemCategory = (index: number, cat: Category) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, category: cat } : item)),
    );
    setExpandedCategoryId(null);
  };

  const setAllCategory = (cat: Category) => {
    setItems((prev) => prev.map((item) => ({ ...item, category: cat })));
  };

  const hasMultipleMembers = tripMembers.length > 1;
  const totalJpy = items.reduce(
    (sum, it) => sum + it.quantity * it.unit_price,
    0,
  );

  const allSameCat =
    items.length > 0 &&
    items.every((it) => it.category === items[0].category)
      ? items[0].category
      : null;
  const allSameOwner =
    items.length > 0 &&
    items.every(
      (it) =>
        it.split_type === items[0].split_type && it.owner_id === items[0].owner_id,
    )
      ? items[0]
      : null;

  return (
    <div>
      {/* Store info — magazine masthead */}
      <div style={{ padding: "0 24px" }}>
        <div className="ed-kicker">N°02 · RECEIPT VERIFIED</div>
        <div
          className="ed-serif"
          style={{
            fontSize: 28,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: 1,
            marginTop: 4,
          }}
        >
          {storeName || "未指定店家"}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 6,
            paddingBottom: 10,
            borderBottom: "1px solid var(--ed-ink)",
          }}
        >
          <span
            className="ed-serif"
            style={{
              fontSize: 12,
              fontStyle: "italic",
              color: "var(--ed-muted)",
            }}
          >
            {storeNameJa || "—"}
          </span>
          <span
            className="ed-mono"
            style={{
              fontSize: 10,
              letterSpacing: 1.5,
              color: "var(--ed-muted)",
            }}
          >
            {date || "—"}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginTop: 12,
          }}
        >
          <span className="ed-kicker">合計</span>
          <span
            className="ed-serif"
            style={{ fontSize: 24, fontWeight: 700, letterSpacing: -1 }}
          >
            ¥{totalJpy.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Quick assign — only when there are members */}
      {hasMultipleMembers ? (
        <div className="ed-scan-section">
          <div className="ed-scan-section-h">
            一鍵指定 <span className="meta">適用全部品項</span>
          </div>
          <div className="ed-kicker" style={{ marginBottom: 6 }}>歸屬</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <button
              type="button"
              onClick={() => setAllOwner(null, "personal")}
              className={
                "ed-chip" +
                (allSameOwner?.split_type === "personal" &&
                allSameOwner?.owner_id === null
                  ? " on"
                  : "")
              }
            >
              全部我的
            </button>
            {tripMembers
              .filter((m) => m.user_id !== user?.id)
              .map((m) => (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => setAllOwner(m.user_id, "personal")}
                  className={
                    "ed-chip" +
                    (allSameOwner?.split_type === "personal" &&
                    allSameOwner?.owner_id === m.user_id
                      ? " on"
                      : "")
                  }
                >
                  全部 {m.profile?.display_name || "成員"} 的
                </button>
              ))}
            <button
              type="button"
              onClick={() => setAllOwner(null, "split")}
              className={
                "ed-chip" +
                (allSameOwner?.split_type === "split" ? " on" : "")
              }
            >
              全部均分
            </button>
          </div>

          <div className="ed-kicker" style={{ marginTop: 12, marginBottom: 6 }}>
            分類
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setAllCategory(cat.value)}
                className={"ed-chip" + (allSameCat === cat.value ? " on" : "")}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Items */}
      <div className="ed-scan-section">
        <div className="ed-scan-section-h">
          購買明細
          <span className="meta">{items.length} 項</span>
        </div>

        {items.map((item, index) => {
          const currentCat =
            CATEGORIES.find((c) => c.value === item.category) ?? CATEGORIES[0];
          const isExpanded = expandedCategoryId === item._id;
          const lineTotal = item.quantity * item.unit_price;

          return (
            <div key={item._id} className="ed-item">
              <div className="ed-item-head">
                <div className="ed-item-num">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <input
                  className="ed-item-name"
                  value={item.name}
                  onChange={(e) => updateItem(index, "name", e.target.value)}
                />
                <div className="ed-item-amt">
                  ¥{lineTotal.toLocaleString()}
                </div>
              </div>
              <div className="ed-item-meta">
                {[
                  item.name_ja || null,
                  `${item.quantity} × ¥${item.unit_price.toLocaleString()}`,
                  `稅 ${(item.tax_rate * 100).toFixed(0)}%`,
                ]
                  .filter(Boolean)
                  .join("　·　")}
              </div>

              <div className="ed-item-actions">
                {/* Category chip */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedCategoryId(isExpanded ? null : item._id)
                  }
                  className="ed-chip-sm"
                >
                  {currentCat?.icon} {currentCat?.label}
                </button>

                {/* Per-item owner chips */}
                {hasMultipleMembers ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setItemOwner(index, null, "personal")}
                      className={
                        "ed-chip-sm" +
                        (item.split_type === "personal" && item.owner_id === null
                          ? " on"
                          : "")
                      }
                    >
                      {myProfile?.avatar_emoji || "👤"} 我
                    </button>
                    {tripMembers
                      .filter((m) => m.user_id !== user?.id)
                      .map((m) => (
                        <button
                          key={m.user_id}
                          type="button"
                          onClick={() =>
                            setItemOwner(index, m.user_id, "personal")
                          }
                          className={
                            "ed-chip-sm" +
                            (item.split_type === "personal" &&
                            item.owner_id === m.user_id
                              ? " on"
                              : "")
                          }
                        >
                          {m.profile?.avatar_emoji || "👤"}{" "}
                          {m.profile?.display_name || "成員"}
                        </button>
                      ))}
                    <button
                      type="button"
                      onClick={() => setItemOwner(index, null, "split")}
                      className={
                        "ed-chip-sm split" +
                        (item.split_type === "split" ? " on" : "")
                      }
                    >
                      均分
                    </button>
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="ed-item-del"
                  aria-label="刪除"
                >
                  ✕ 刪除
                </button>
              </div>

              {isExpanded ? (
                <div
                  style={{
                    marginLeft: 36,
                    marginTop: 8,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setItemCategory(index, cat.value)}
                      className={
                        "ed-chip-sm" +
                        (item.category === cat.value ? " on" : "")
                      }
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}

        <button
          type="button"
          onClick={addItem}
          className="ed-mono"
          style={{
            marginTop: 12,
            background: "transparent",
            border: "1px dashed var(--ed-line)",
            padding: "10px 0",
            width: "100%",
            color: "var(--ed-ink-soft)",
            fontSize: 11,
            letterSpacing: 3,
            cursor: "pointer",
          }}
        >
          + 新增品項
        </button>
      </div>

      {/* Payment method */}
      <div className="ed-scan-section">
        <div className="ed-scan-section-h">付款方式</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PAYMENTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPaymentMethod(p);
                if (p !== "信用卡") {
                  setCreditCardId(null);
                  setCreditCardPlanId(null);
                }
              }}
              className={"ed-chip" + (paymentMethod === p ? " on" : "")}
            >
              {p}
            </button>
          ))}
        </div>

        {paymentMethod === "信用卡" ? (
          <div style={{ marginTop: 14 }}>
            <div className="ed-kicker" style={{ marginBottom: 8 }}>
              信用卡 · 回饋
            </div>
            {creditCards.length === 0 ? (
              <Link
                href="/settings"
                className="ed-serif"
                style={{
                  display: "inline-block",
                  fontSize: 13,
                  color: "var(--ed-vermillion)",
                  borderBottom: "1px solid var(--ed-vermillion)",
                  textDecoration: "none",
                  paddingBottom: 1,
                }}
              >
                尚未設定信用卡 → 前往設定
              </Link>
            ) : (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {creditCards.map((card) => {
                    const rates = card.plans?.map((p) => p.cashback_rate) ?? [];
                    const rateLabel =
                      rates.length === 0
                        ? `${card.cashback_rate}%`
                        : Math.min(...rates) === Math.max(...rates)
                          ? `${rates[0]}%`
                          : `${Math.min(...rates)}~${Math.max(...rates)}%`;
                    const isOn = creditCardId === card.id;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => {
                          if (isOn) {
                            setCreditCardId(null);
                            setCreditCardPlanId(null);
                          } else {
                            setCreditCardId(card.id);
                            setCreditCardPlanId(card.plans?.[0]?.id ?? null);
                          }
                        }}
                        className={"ed-chip" + (isOn ? " on" : "")}
                      >
                        {card.name}
                        <span
                          className="ed-mono"
                          style={{
                            marginLeft: 6,
                            fontSize: 10,
                            opacity: 0.7,
                          }}
                        >
                          {rateLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const selectedCard = creditCards.find(
                    (c) => c.id === creditCardId,
                  );
                  if (!selectedCard?.plans?.length) return null;
                  return (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 8,
                      }}
                    >
                      {selectedCard.plans.map((plan) => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setCreditCardPlanId(plan.id)}
                          className={
                            "ed-chip" +
                            (creditCardPlanId === plan.id ? " on" : "")
                          }
                          style={{ fontSize: 11, padding: "4px 10px" }}
                        >
                          {plan.name}
                          <span
                            className="ed-mono"
                            style={{ marginLeft: 4, opacity: 0.7 }}
                          >
                            {plan.cashback_rate}%
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Submit */}
      <div style={{ padding: "26px 24px 16px" }}>
        <button
          type="button"
          onClick={() =>
            onConfirm({
              items,
              paymentMethod,
              creditCardId: paymentMethod === "信用卡" ? creditCardId : null,
              creditCardPlanId:
                paymentMethod === "信用卡" ? creditCardPlanId : null,
              storeName,
              storeNameJa,
              date,
            })
          }
          className="ed-btn-primary"
          disabled={saving || items.length === 0}
          style={{
            opacity: saving || items.length === 0 ? 0.4 : 1,
            cursor: saving || items.length === 0 ? "default" : "pointer",
          }}
        >
          {saving ? "儲 存 中…" : `確 認 儲 存 (${items.length})`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="ed-mono"
          style={{
            marginTop: 12,
            width: "100%",
            background: "transparent",
            border: 0,
            padding: "10px 0",
            color: "var(--ed-muted)",
            fontSize: 10,
            letterSpacing: 3,
            cursor: saving ? "default" : "pointer",
          }}
        >
          ← 重新掃描
        </button>
      </div>
    </div>
  );
}
