import { NextResponse } from "next/server";

const FREE_APIS = [
  {
    url: "https://open.er-api.com/v6/latest/JPY",
    extract: (data: Record<string, unknown>) =>
      (data.rates as Record<string, number>)?.TWD,
  },
  {
    url: "https://api.exchangerate-api.com/v4/latest/JPY",
    extract: (data: Record<string, unknown>) =>
      (data.rates as Record<string, number>)?.TWD,
  },
  {
    url: "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/jpy.json",
    extract: (data: Record<string, unknown>) =>
      (data.jpy as Record<string, number>)?.twd,
  },
];

let cachedRate: { rate: number; timestamp: number } | null = null;
const CACHE_TTL = 6 * 60 * 60 * 1000;

export async function GET() {
  if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_TTL) {
    return NextResponse.json({ rate: cachedRate.rate, cached: true });
  }

  for (const api of FREE_APIS) {
    try {
      const res = await fetch(api.url, {
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 21600 },
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

  return NextResponse.json({ rate: 0.206, fallback: true });
}
