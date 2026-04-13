"use client";

import { useState, useEffect, useRef } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useCategories } from "@/hooks/use-categories";
import { PAYMENT_METHODS } from "@/types";
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋品名、店名..."
            className="w-full h-10 pl-9 pr-8 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
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
              ? "bg-blue-50 border-blue-200 text-blue-500"
              : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {chipCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 rounded-full bg-blue-500 text-[10px] text-white font-bold flex items-center justify-center px-1">
              {chipCount}
            </span>
          )}
        </button>
      </div>

      {/* Active filter summary */}
      {hasFilter && total !== undefined && filtered !== undefined && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            找到 {filtered} 筆
            {total !== filtered && <span className="text-slate-300"> / {total}</span>}
          </p>
          <button
            onClick={clearAll}
            className="text-xs text-blue-500 hover:text-blue-600 font-medium"
          >
            清除篩選
          </button>
        </div>
      )}

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-3">
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
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
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-150"
                    )}
                    style={active ? { backgroundColor: cat.color } : undefined}
                  >
                    {cat.icon} {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-200/60 pt-3">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
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
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-150"
                    )}
                    style={active ? { backgroundColor: pm.color } : undefined}
                  >
                    {pm.icon} {pm.label}
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
