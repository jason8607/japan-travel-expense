"use client";

import { useCreditCards } from "@/hooks/use-credit-cards";
import { cn } from "@/lib/utils";
import { CreditCard, Settings } from "lucide-react";
import Link from "next/link";

interface CreditCardPickerProps {
  value: string | null;
  onChange: (cardId: string | null) => void;
  planValue?: string | null;
  onPlanChange?: (planId: string | null) => void;
}

export function CreditCardPicker({ value, onChange, planValue, onPlanChange }: CreditCardPickerProps) {
  const { cards, loading } = useCreditCards();

  if (loading) return null;

  if (cards.length === 0) {
    return (
      <div className="rounded-xl bg-muted ring-1 ring-border p-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">尚未設定信用卡</p>
        <Link
          href="/settings"
          className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
        >
          <Settings className="h-3 w-3" />
          前往設定
        </Link>
      </div>
    );
  }

  const selectedCard = cards.find((c) => c.id === value);
  const hasPlans = selectedCard?.plans && selectedCard.plans.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {cards.map((card) => {
          const isSelected = value === card.id;
          const displayRate =
            card.plans && card.plans.length > 0
              ? (() => {
                  const rates = card.plans.map((p) => p.cashback_rate);
                  const min = Math.min(...rates);
                  const max = Math.max(...rates);
                  return min === max ? `${min}%` : `${min}~${max}%`;
                })()
              : `${card.cashback_rate}%`;

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                if (isSelected) {
                  onChange(null);
                  onPlanChange?.(null);
                } else {
                  onChange(card.id);
                  // Auto-select first plan if card has plans
                  if (card.plans && card.plans.length > 0) {
                    onPlanChange?.(card.plans[0].id);
                  } else {
                    onPlanChange?.(null);
                  }
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl ring-1 transition-colors text-sm",
                isSelected
                  ? "bg-accent ring-primary text-accent-foreground font-medium"
                  : "bg-card ring-border text-muted-foreground hover:bg-muted"
              )}
            >
              <CreditCard className="h-4 w-4" />
              <span className="leading-none">{card.name}</span>
              <span
                className={cn(
                  "text-xs leading-none self-center",
                  isSelected ? "text-accent-foreground/80" : "text-muted-foreground"
                )}
              >
                {displayRate}
              </span>
            </button>
          );
        })}
      </div>

      {/* Plan selection */}
      {hasPlans && (
        <div className="flex flex-wrap gap-1.5 pl-1">
          {selectedCard!.plans!.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => onPlanChange?.(plan.id)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg ring-1 transition-colors text-xs",
                planValue === plan.id
                  ? "bg-accent ring-primary text-accent-foreground font-medium"
                  : "bg-card ring-border text-muted-foreground hover:bg-muted"
              )}
            >
              {plan.name}
              <span className="ml-1 text-xs opacity-70">{plan.cashback_rate}%</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
