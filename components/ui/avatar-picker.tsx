"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const AVATAR_OPTIONS = [
  { emoji: "👨", label: "男生" },
  { emoji: "👩", label: "女生" },
  { emoji: "🧑", label: "中性" },
  { emoji: "👦", label: "男孩" },
  { emoji: "👧", label: "女孩" },
  { emoji: "🧔", label: "鬍子" },
  { emoji: "👱", label: "金髮" },
  { emoji: "👲", label: "帽子" },
  { emoji: "🦊", label: "狐狸" },
  { emoji: "🐱", label: "貓咪" },
  { emoji: "🐶", label: "狗狗" },
  { emoji: "🐰", label: "兔子" },
  { emoji: "🐻", label: "小熊" },
  { emoji: "🐼", label: "熊貓" },
  { emoji: "🦁", label: "獅子" },
  { emoji: "🐸", label: "青蛙" },
  { emoji: "🦄", label: "獨角獸" },
  { emoji: "🐧", label: "企鵝" },
  { emoji: "🦉", label: "貓頭鷹" },
  { emoji: "🌸", label: "櫻花" },
];

interface AvatarPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<button type="button" />}
        className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-2xl hover:bg-slate-200 transition shrink-0 ring-2 ring-transparent hover:ring-orange-200"
      >
        {value}
      </DialogTrigger>
      <DialogContent className="max-w-xs rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">選擇頭像</DialogTitle>
        </DialogHeader>

        {/* Preview */}
        <div className="flex justify-center py-2">
          <div className="w-20 h-20 rounded-full bg-orange-50 border-2 border-orange-200 flex items-center justify-center text-4xl">
            {value}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-5 gap-2">
          {AVATAR_OPTIONS.map((opt) => (
            <button
              key={opt.emoji}
              type="button"
              onClick={() => {
                onChange(opt.emoji);
                setOpen(false);
              }}
              className={cn(
                "flex flex-col items-center gap-0.5 p-2 rounded-xl border-2 transition-all",
                value === opt.emoji
                  ? "border-orange-400 bg-orange-50 scale-105"
                  : "border-transparent bg-slate-50 hover:bg-slate-100"
              )}
            >
              <span className="text-2xl leading-none">{opt.emoji}</span>
              <span className="text-[9px] text-muted-foreground">{opt.label}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
