"use client";

import { cn } from "@/lib/utils";
import { useCategories } from "@/hooks/use-categories";

interface CategoryGridProps {
  value: string;
  onChange: (category: string) => void;
}

export function CategoryGrid({ value, onChange }: CategoryGridProps) {
  const { categories } = useCategories();

  return (
    <div className="grid grid-cols-4 gap-2">
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onChange(cat.value)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border-2 transition-all duration-200",
            value === cat.value
              ? "border-primary/50 bg-primary/10 shadow-sm"
              : "border-border/60 bg-card hover:bg-muted"
          )}
        >
          <span className="text-2xl leading-none">{cat.icon}</span>
          <span
            className={cn(
              "text-[11px] font-medium",
              value === cat.value ? "text-primary" : "text-muted-foreground"
            )}
          >
            {cat.label}
          </span>
        </button>
      ))}
    </div>
  );
}
