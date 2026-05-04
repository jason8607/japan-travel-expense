"use client";

import { useState, useEffect, useRef } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useCategories } from "@/hooks/use-categories";
import { PAYMENT_METHODS } from "@/types";
import { PaymentIcon } from "@/components/expense/payment-icon";
import { cn } from "@/lib/utils";

export interface ExpenseFilterState {
  query: string;
  categories: string[];
  paymentMethods: string[];
}

const EMPTY_FILTER: ExpenseFilterState = {
  query: "",
  categories: [],
  paymentMethods: [],
};

interface ExpenseFilterProps {
  onChange: (filter: ExpenseFilterState) => void;
  total?: number;
  filtered?: number;
}

export function ExpenseFilter({ onChange, total, filtered }: ExpenseFilterProps) {
  const { categories } = useCategories();
  const [query, setQuery] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedPay, setSelectedPay] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ query, categories: selectedCats, paymentMethods: selectedPay });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, selectedCats, selectedPay]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCat = (val: string) =>
    setSelectedCats((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );

  const togglePay = (val: string) =>
    setSelectedPay((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );

  const chipCount = selectedCats.length + selectedPay.length;
  const hasFilter = query || chipCount > 0;

  const clearAll = () => {
    setQuery("");
    setSelectedCats([]);
    setSelectedPay([]);
  };

  return (
    <div className="space-y-2">
      {/* Search row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋品名、店名..."
            className="w-full h-10 pl-9 pr-8 rounded-xl border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "relative shrink-0 h-10 w-10 rounded-xl border flex items-center justify-center transition-all",
            showFilters || chipCount > 0
              ? "bg-primary/10 border-primary/25 text-primary"
              : "bg-card border-border text-muted-foreground hover:bg-muted"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {chipCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 rounded-full bg-primary text-[10px] text-white font-bold flex items-center justify-center px-1">
              {chipCount}
            </span>
          )}
        </button>
      </div>

      {/* Active filter summary */}
      {hasFilter && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {total !== undefined && filtered !== undefined ? (
              <>
                找到 {filtered} 筆
                {total !== filtered && <span className="text-muted-foreground/60"> / {total}</span>}
              </>
            ) : (
              <>已套用篩選</>
            )}
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-md px-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
          >
            清除篩選
          </button>
        </div>
      )}

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-xl border border-border/60 bg-muted/60 p-3 space-y-3">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              分類
            </p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const active = selectedCats.includes(cat.value);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCat(cat.value)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                      active
                        ? "text-white shadow-sm"
                        : "bg-card text-muted-foreground hover:bg-muted border border-border/60"
                    )}
                    style={active ? { backgroundColor: cat.color } : undefined}
                  >
                    {cat.icon} {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border/60 pt-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              支付方式
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map((pm) => {
                const active = selectedPay.includes(pm.value);
                return (
                  <button
                    key={pm.value}
                    onClick={() => togglePay(pm.value)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                      active
                        ? "text-white shadow-sm"
                        : "bg-card text-muted-foreground hover:bg-muted border border-border/60"
                    )}
                    style={active ? { backgroundColor: pm.color } : undefined}
                  >
                    <span className="inline-flex items-center gap-1 align-middle">
                      <PaymentIcon method={pm.value} size={14} />
                      {pm.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { EMPTY_FILTER };
