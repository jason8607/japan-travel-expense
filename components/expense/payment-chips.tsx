"use client";

import { cn } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/types";
import type { PaymentMethod } from "@/types";

interface PaymentChipsProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

export function PaymentChips({ value, onChange }: PaymentChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PAYMENT_METHODS.map((pm) => (
        <button
          key={pm.value}
          type="button"
          onClick={() => onChange(pm.value)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-full border-2 transition-all duration-200 text-sm",
            value === pm.value
              ? "border-blue-400 bg-blue-50 text-blue-700 font-medium"
              : "border-slate-100 bg-white text-slate-500 hover:bg-slate-50"
          )}
        >
          <span className="text-base leading-none">{pm.icon}</span>
          <span>{pm.label}</span>
        </button>
      ))}
    </div>
  );
}
