"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { PAYMENT_METHODS, type PaymentMethod } from "@/types";

const IMAGE_MAP: Partial<
  Record<PaymentMethod, { src: string; alt: string; aspectRatio: number }>
> = {
  PayPay: { src: "/paypay.png", alt: "PayPay", aspectRatio: 1 },
  Suica: { src: "/suica.jpg", alt: "Suica", aspectRatio: 1072 / 669 },
};

interface PaymentIconProps {
  method: PaymentMethod;
  size?: number;
  className?: string;
}

export function PaymentIcon({ method, size = 14, className }: PaymentIconProps) {
  const img = IMAGE_MAP[method];
  if (img) {
    const w = Math.round(size * img.aspectRatio);
    return (
      <Image
        src={img.src}
        alt={img.alt}
        width={w}
        height={size}
        className={cn("inline-block align-middle rounded-[3px] object-contain", className)}
        style={{ height: size, width: w }}
      />
    );
  }

  const pm = PAYMENT_METHODS.find((p) => p.value === method);
  return (
    <span
      className={cn("inline-flex items-center leading-none align-middle", className)}
      style={{ fontSize: size }}
    >
      {pm?.icon ?? "💰"}
    </span>
  );
}
