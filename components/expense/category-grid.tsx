"use client";

import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/types";
import type { Category } from "@/types";

interface CategoryGridProps {
  value: Category;
  onChange: (category: Category) => void;
}

export function CategoryGrid({ value, onChange }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          type="button"
          onClick={() => onChange(cat.value)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border-2 transition-all duration-200",
            value === cat.value
              ? "border-blue-400 bg-blue-50 shadow-sm"
              : "border-slate-100 bg-white hover:bg-slate-50"
          )}
        >
          <span className="text-2xl leading-none">{cat.icon}</span>
          <span
            className={cn(
              "text-[11px] font-medium",
              value === cat.value ? "text-blue-700" : "text-slate-500"
            )}
          >
            {cat.label}
          </span>
        </button>
      ))}
    </div>
  );
}
