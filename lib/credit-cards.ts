import type { CreditCard } from "@/types";

const STORAGE_KEY = "credit_cards";
const SEEDED_KEY = "credit_cards_seeded";

const DEFAULT_CARDS: Omit<CreditCard, "id">[] = [
  { name: "中信 UNIOPEN",  cashback_rate: 11,  cashback_limit: 6250  },
  { name: "永豐 幣倍卡",  cashback_rate: 6,   cashback_limit: 7500  },
  { name: "玉山 熊本熊",  cashback_rate: 8.5, cashback_limit: 8333  },
  { name: "星展 eco",     cashback_rate: 5,   cashback_limit: 15000 },
  {
    name: "台新 Richart",
    cashback_rate: 0,
    cashback_limit: 300000,
    plans: [
      { id: "", credit_card_id: "", name: "Pay著刷",  cashback_rate: 3.8 },
      { id: "", credit_card_id: "", name: "天天刷",   cashback_rate: 3.3 },
      { id: "", credit_card_id: "", name: "大筆刷",   cashback_rate: 3.3 },
      { id: "", credit_card_id: "", name: "好饗刷",   cashback_rate: 3.3 },
      { id: "", credit_card_id: "", name: "數趣刷",   cashback_rate: 3.3 },
      { id: "", credit_card_id: "", name: "玩旅刷",   cashback_rate: 3.3 },
      { id: "", credit_card_id: "", name: "假日刷",   cashback_rate: 2   },
    ],
  },
  {
    name: "國泰 Cube",
    cashback_rate: 0,
    cashback_limit: 300000,
    plans: [
      { id: "", credit_card_id: "", name: "玩數位",  cashback_rate: 3   },
      { id: "", credit_card_id: "", name: "樂饗購",  cashback_rate: 3   },
      { id: "", credit_card_id: "", name: "趣旅行",  cashback_rate: 3   },
      { id: "", credit_card_id: "", name: "集精選",    cashback_rate: 2 },
      { id: "", credit_card_id: "", name: "慶生月",    cashback_rate: 10 },
    ],
  },
];

function seedDefaults(): CreditCard[] {
  const cards: CreditCard[] = DEFAULT_CARDS.map((c) => {
    const cardId = crypto.randomUUID();
    return {
      ...c,
      id: cardId,
      plans: c.plans?.map((p) => ({
        ...p,
        id: crypto.randomUUID(),
        credit_card_id: cardId,
      })),
    };
  });
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
  const card: CreditCard = {
    id: crypto.randomUUID(),
    name: data.name,
    cashback_rate: data.cashback_rate,
    cashback_limit: data.cashback_limit,
    plans: data.plans?.map((p) => ({ ...p, id: p.id || crypto.randomUUID(), credit_card_id: "" })),
  };
  if (card.plans) {
    card.plans = card.plans.map((p) => ({ ...p, credit_card_id: card.id }));
  }
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
  if (updates.plans) {
    updates.plans = updates.plans.map((p) => ({
      ...p,
      id: p.id || crypto.randomUUID(),
      credit_card_id: id,
    }));
  }
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
