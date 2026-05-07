"use client";

import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  size?: "lg" | "sm";
  className?: string;
}

// Renders a YYYY / MM / DD face on top of an opacity-0 native date input so
// the platform picker still opens on tap, but the visible text is platform-
// stable (avoids iOS's verbose "2026年5月24日" rendering when the system
// locale is zh-TW/zh-CN/ja). Stores ISO YYYY-MM-DD just like a regular date
// input.
function formatFace(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y} / ${m} / ${d}`;
}

const SIZE_CLASSES = {
  lg: "h-12 text-base",
  sm: "h-10 text-sm",
} as const;

export function DateInput({
  value,
  onChange,
  id,
  min,
  max,
  required,
  disabled,
  placeholder = "選擇日期",
  ariaLabel,
  size = "lg",
  className,
}: DateInputProps) {
  const face = formatFace(value);

  return (
    <div className={cn("relative", SIZE_CLASSES[size], className)}>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          // Desktop browsers only open the picker when the calendar glyph is
          // clicked; since native chrome is hidden, force-open on any tap
          // within the field. Wrapped in try/catch because non-user-gesture
          // invocations throw.
          try {
            e.currentTarget.showPicker?.();
          } catch {
            /* fall back to native focus behaviour */
          }
        }}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        aria-label={ariaLabel}
        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none opacity-0 outline-none disabled:cursor-not-allowed"
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none flex h-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 tabular-nums transition-colors",
          "peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
          disabled && "opacity-50",
          !face && "text-muted-foreground",
        )}
      >
        <span className="truncate">{face || placeholder}</span>
        <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </div>
  );
}
