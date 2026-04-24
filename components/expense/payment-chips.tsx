"use client";

import { cn } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/types";
import type { PaymentMethod } from "@/types";
import { PaymentIcon } from "@/components/expense/payment-icon";

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
              ? "border-primary/50 bg-primary/10 text-primary font-medium"
              : "border-border/60 bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          <PaymentIcon method={pm.value} size={16} />
          <span>{pm.label}</span>
        </button>
      ))}
    </div>
  );
}
