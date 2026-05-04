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
            "flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl ring-1 transition-colors",
            value === cat.value
              ? "bg-accent ring-primary"
              : "bg-card ring-border hover:bg-muted"
          )}
        >
          <span className="text-2xl leading-none">{cat.icon}</span>
          <span
            className={cn(
              "text-xs font-medium",
              value === cat.value ? "text-accent-foreground" : "text-muted-foreground"
            )}
          >
            {cat.label}
          </span>
        </button>
      ))}
    </div>
  );
}
