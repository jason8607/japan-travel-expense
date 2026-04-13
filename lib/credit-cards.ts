import type { CreditCard } from "@/types";

const STORAGE_KEY = "credit_cards";
const SEEDED_KEY = "credit_cards_seeded";

const DEFAULT_CARDS: Omit<CreditCard, "id">[] = [
  { name: "中信 UNIONE",  cashback_rate: 11,  cashback_limit: 6250  },
  { name: "永豐 幣倍卡",  cashback_rate: 6,   cashback_limit: 7500  },
  { name: "玉山 熊本熊",  cashback_rate: 8.5, cashback_limit: 8333  },
  { name: "星展 eco",     cashback_rate: 5,   cashback_limit: 15000 },
];

function seedDefaults(): CreditCard[] {
  const cards: CreditCard[] = DEFAULT_CARDS.map((c) => ({
    id: crypto.randomUUID(),
    ...c,
  }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    localStorage.setItem(SEEDED_KEY, "true");
  } catch { /* ignore */ }
  return cards;
}

export function getCreditCards(): CreditCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (!localStorage.getItem(SEEDED_KEY)) return seedDefaults();
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    return parsed.filter(
      (c: unknown) =>
        c &&
        typeof c === "object" &&
        "id" in c &&
        "name" in c &&
        "cashback_rate" in c &&
        "cashback_limit" in c
    );
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function saveCreditCards(cards: CreditCard[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    return true;
  } catch {
    return false;
  }
}

export function addCreditCard(data: Omit<CreditCard, "id">): CreditCard | null {
  const cards = getCreditCards();
  const card: CreditCard = { id: crypto.randomUUID(), ...data };
  cards.push(card);
  if (!saveCreditCards(cards)) return null;
  return card;
}

export function updateCreditCard(
  id: string,
  updates: Partial<Omit<CreditCard, "id">>
): CreditCard | null {
  const cards = getCreditCards();
  const idx = cards.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  cards[idx] = { ...cards[idx], ...updates };
  if (!saveCreditCards(cards)) return null;
  return cards[idx];
}

export function deleteCreditCard(id: string): boolean {
  const cards = getCreditCards();
  const filtered = cards.filter((c) => c.id !== id);
  if (filtered.length === cards.length) return false;
  return saveCreditCards(filtered);
}
