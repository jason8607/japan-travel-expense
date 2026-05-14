"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ImageIcon, Pencil } from "lucide-react";
import { UserAvatar } from "./user-avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const AVATAR_OPTIONS = [
  "🐱", "🐶", "🦊", "🐰", "🐻",
  "🐼", "🦁", "🐯", "🐸", "🐧",
  "🦉", "🦄", "🐨", "🐷", "🐮",
  "🐵", "🦋", "🐬", "🦈", "🐙",
];

interface AvatarPickerProps {
  avatarUrl: string | null;
  avatarEmoji: string;
  onChangeEmoji: (emoji: string) => void;
  onChangeUrl: (url: string | null) => void;
  onUpload?: (file: File) => Promise<string | null>;
}

export function AvatarPicker({
  avatarUrl,
  avatarEmoji,
  onChangeEmoji,
  onChangeUrl,
  onUpload,
}: AvatarPickerProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;

    setUploading(true);
    try {
      const url = await onUpload(file);
      if (url) {
        onChangeUrl(url);
        onChangeEmoji("🧑");
        setOpen(false);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    onChangeEmoji(emoji);
    onChangeUrl(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<button type="button" />}
        className="relative w-14 h-14 rounded-full shrink-0 group"
      >
        <UserAvatar avatarUrl={avatarUrl} avatarEmoji={avatarEmoji} size="lg" />
        <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition" />
        <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-muted flex items-center justify-center ring-2 ring-background">
          <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-xs rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">選擇頭像</DialogTitle>
        </DialogHeader>

        {/* Preview */}
        <div className="flex justify-center py-2">
          <UserAvatar avatarUrl={avatarUrl} avatarEmoji={avatarEmoji} size="xl" className="border-2 border-primary/25" />
        </div>

        {/* Upload button */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/30 hover:text-primary transition disabled:opacity-50"
        >
          <ImageIcon className="h-4 w-4" />
          {uploading ? "上傳中..." : "上傳自訂頭像"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Emoji grid */}
        <div className="grid grid-cols-5 gap-2">
          {AVATAR_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleSelectEmoji(emoji)}
              className={cn(
                "flex items-center justify-center p-2.5 rounded-xl border-2 transition-all",
                !avatarUrl && avatarEmoji === emoji
                  ? "border-primary/50 bg-primary/10 scale-105"
                  : "border-transparent bg-muted hover:bg-muted"
              )}
            >
              <span className="text-2xl leading-none">{emoji}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
