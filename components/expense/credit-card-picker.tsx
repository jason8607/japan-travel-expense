"use client";

import { useCreditCards } from "@/hooks/use-credit-cards";
import { cn } from "@/lib/utils";
import { Settings } from "lucide-react";
import Link from "next/link";

interface CreditCardPickerProps {
  value: string | null;
  onChange: (cardId: string | null) => void;
}

export function CreditCardPicker({ value, onChange }: CreditCardPickerProps) {
  const { cards, loading } = useCreditCards();

  if (loading) return null;

  if (cards.length === 0) {
    return (
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 flex items-center justify-between">
        <p className="text-xs text-blue-600">尚未設定信用卡</p>
        <Link
          href="/settings"
          className="text-xs text-blue-500 font-medium flex items-center gap-1 hover:underline"
        >
          <Settings className="h-3 w-3" />
          前往設定
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          onClick={() => onChange(value === card.id ? null : card.id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-full border-2 transition-all duration-200 text-sm",
            value === card.id
              ? "border-blue-400 bg-blue-50 text-blue-700 font-medium"
              : "border-slate-100 bg-white text-slate-500 hover:bg-slate-50"
          )}
        >
          <span className="text-base leading-none">💳</span>
          <span className="leading-none">{card.name}</span>
          <span className="text-[10px] text-slate-400 leading-none self-center">
            {card.cashback_rate}%
          </span>
        </button>
      ))}
    </div>
  );
}
