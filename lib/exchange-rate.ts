const FALLBACK_RATE = 0.206;
const CACHE_KEY = "exchange_rate_jpy_twd";
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

interface CachedRate {
  rate: number;
  timestamp: number;
}

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

export async function getExchangeRate(): Promise<number> {
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed: CachedRate = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_DURATION) {
        return parsed.rate;
      }
    }
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
        if (typeof window !== "undefined") {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ rate, timestamp: Date.now() })
          );
        }
        return rate;
      }
    } catch {
      continue;
    }
  }

  return FALLBACK_RATE;
}

export function jpyToTwd(jpy: number, rate: number): number {
  return Math.round(jpy * rate);
}

export function formatJPY(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

export function formatTWD(amount: number): string {
  return `NT$${amount.toLocaleString()}`;
}

export function formatCompactJPY(amount: number): string {
  if (amount >= 1000) {
    return `¥${(amount / 1000).toFixed(1)}k`;
  }
  return `¥${amount.toLocaleString()}`;
}
