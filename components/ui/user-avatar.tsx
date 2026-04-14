"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  avatarUrl?: string | null;
  avatarEmoji?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  xs: "w-6 h-6 text-xs",
  sm: "w-7 h-7 text-sm",
  md: "w-11 h-11 text-xl",
  lg: "w-14 h-14 text-2xl",
  xl: "w-20 h-20 text-4xl",
};

const imgSizeMap = {
  xs: 24,
  sm: 28,
  md: 44,
  lg: 56,
  xl: 80,
};

export function UserAvatar({
  avatarUrl,
  avatarEmoji,
  size = "md",
  className,
}: UserAvatarProps) {
  const hasImage = !!avatarUrl;

  return (
    <div
      className={cn(
        "rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden",
        sizeMap[size],
        className
      )}
    >
      {hasImage ? (
        <Image
          src={avatarUrl}
          alt="avatar"
          width={imgSizeMap[size]}
          height={imgSizeMap[size]}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{avatarEmoji || "🧑"}</span>
      )}
    </div>
  );
}
