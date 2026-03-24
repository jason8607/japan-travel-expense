"use client";

import { ClipboardList } from "lucide-react";
import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import Link from "next/link";

interface TripSummaryProps {
  totalJpy: number;
  totalTwd: number;
  count: number;
  tripName?: string;
}

export function TripSummary({
  totalJpy,
  totalTwd,
  count,
  tripName,
}: TripSummaryProps) {
  return (
    <div className="mx-4 rounded-2xl bg-white p-5 shadow-sm border">
      <Link href="/records" className="block">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5">
            <ClipboardList className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {tripName || "旅行"}總支出
            </p>
            <p className="text-3xl font-bold tracking-tight mt-0.5">
              {formatJPY(totalJpy)}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              ≈ {formatTWD(totalTwd)} · {count} 筆
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}
