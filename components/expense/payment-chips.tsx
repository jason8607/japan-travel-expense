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
            "flex items-center gap-1.5 px-3 py-2 rounded-lg ring-1 transition-colors text-sm",
            value === pm.value
              ? "bg-accent ring-primary text-accent-foreground font-medium"
              : "bg-card ring-border text-muted-foreground hover:bg-muted"
          )}
        >
          <PaymentIcon method={pm.value} size={16} />
          <span>{pm.label}</span>
        </button>
      ))}
    </div>
  );
}
