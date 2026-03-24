import { NextResponse } from "next/server";
import { FREE_APIS, FALLBACK_RATE, CACHE_DURATION } from "@/lib/exchange-rate";

let cachedRate: { rate: number; timestamp: number } | null = null;

export async function GET() {
  if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_DURATION) {
    return NextResponse.json({ rate: cachedRate.rate, cached: true });
  }

  for (const api of FREE_APIS) {
    try {
      const res = await fetch(api.url, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const rate = api.extract(data);
      if (rate && rate > 0) {
        cachedRate = { rate, timestamp: Date.now() };
        return NextResponse.json({ rate, source: api.url });
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json({ rate: FALLBACK_RATE, fallback: true });
}
