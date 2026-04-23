"use client";

import { Check, Palette } from "lucide-react";
import { THEME_OPTIONS, useTheme, type Theme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          外觀主題
        </h2>
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">
        {THEME_OPTIONS.map((opt) => {
          const isActive = theme === opt.value;
          return (
            <ThemeOption
              key={opt.value}
              value={opt.value}
              label={opt.label}
              swatches={opt.swatches}
              isActive={isActive}
              onSelect={() => setTheme(opt.value)}
            />
          );
        })}
      </div>
      <p className="px-4 pb-3 text-[11px] text-muted-foreground">
        {THEME_OPTIONS.find((o) => o.value === theme)?.description}
      </p>
    </div>
  );
}

interface ThemeOptionProps {
  value: Theme;
  label: string;
  swatches: [string, string, string];
  isActive: boolean;
  onSelect: () => void;
}

function ThemeOption({
  value,
  label,
  swatches,
  isActive,
  onSelect,
}: ThemeOptionProps) {
  const [bg, primary, accent] = swatches;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      aria-label={`切換為${label}主題`}
      className={cn(
        "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-2.5 transition-all",
        isActive
          ? "border-primary bg-primary/5"
          : "border-border/60 hover:border-primary/40"
      )}
    >
      <div
        className="relative h-14 w-full rounded-lg overflow-hidden ring-1 ring-black/5"
        style={{ backgroundColor: bg }}
      >
        {/* Accent band that mimics a card surface */}
        <div
          className="absolute inset-x-2 top-2 h-3 rounded-sm"
          style={{ backgroundColor: accent }}
        />
        {/* Primary button-ish block */}
        <div
          className="absolute bottom-2 left-2 h-4 w-8 rounded-sm"
          style={{ backgroundColor: primary }}
        />
        {/* Text line */}
        <div
          className="absolute bottom-2.5 right-2 h-1.5 w-6 rounded-full opacity-60"
          style={{
            backgroundColor: value === "dark" ? "#EDEDF0" : "#0F172A",
          }}
        />
      </div>
      <span
        className={cn(
          "text-xs font-medium",
          isActive ? "text-primary" : "text-foreground"
        )}
      >
        {label}
      </span>
      {isActive && (
        <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
