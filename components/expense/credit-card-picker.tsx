"use client";

import { useCreditCards } from "@/hooks/use-credit-cards";
import { cn } from "@/lib/utils";
import { Settings } from "lucide-react";
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
      <div className="flex items-center justify-between rounded-xl bg-muted p-3 ring-1 ring-border">
        <p className="text-xs text-muted-foreground">尚未設定信用卡</p>
        <Link
          href="/settings"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Settings className="h-3 w-3" />
          前往設定
        </Link>
      </div>
    );
  }

  const selectedCard = cards.find((c) => c.id === value);
  const hasPlans = !!selectedCard?.plans && selectedCard.plans.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {cards.map((card) => {
          const isSelected = value === card.id;
          const cardHasPlans = !!card.plans && card.plans.length > 0;
          const displayRate = cardHasPlans
            ? (() => {
                const rates = card.plans!.map((p) => p.cashback_rate);
                const min = Math.min(...rates);
                const max = Math.max(...rates);
                return min === max ? `${min}%` : `${min}~${max}%`;
              })()
            : `${card.cashback_rate}%`;

          // When this card is selected and has plans, hide the rate range on the
          // chip — the plan chip below shows the actual active rate, repeating
          // a "2~3.8%" range alongside a concrete "3.3%" plan reads as conflict.
          const showRate = !(isSelected && cardHasPlans);

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
                  if (card.plans && card.plans.length > 0) {
                    onPlanChange?.(card.plans[0].id);
                  } else {
                    onPlanChange?.(null);
                  }
                }
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 transition-colors",
                isSelected
                  ? "bg-accent ring-primary text-accent-foreground font-medium"
                  : "bg-card ring-border text-muted-foreground hover:bg-muted"
              )}
            >
              <span className="leading-none">{card.name}</span>
              {showRate && (
                <span
                  className={cn(
                    "text-xs leading-none tabular-nums",
                    isSelected ? "text-accent-foreground/70" : "text-muted-foreground/70"
                  )}
                >
                  {displayRate}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Plan selection — visually subordinate to the selected card.
          Plans drop ring-1 and bg-card so the row reads as "tags inside the
          selected card" rather than another row of peer buttons. */}
      {hasPlans && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCard!.plans!.map((plan) => {
            const isPlanSelected = planValue === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => onPlanChange?.(plan.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                  isPlanSelected
                    ? "bg-accent text-accent-foreground font-medium"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {plan.name}
                <span
                  className={cn(
                    "ml-1 tabular-nums",
                    isPlanSelected ? "opacity-80" : "opacity-60"
                  )}
                >
                  {plan.cashback_rate}%
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
