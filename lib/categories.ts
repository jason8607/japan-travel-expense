import type { CategoryItem } from "@/types";
import { DEFAULT_CATEGORIES } from "@/types";

const STORAGE_KEY = "custom_categories";
const SEEDED_KEY = "custom_categories_seeded";

function seedDefaults(): CategoryItem[] {
  const items = DEFAULT_CATEGORIES.map((c) => ({ ...c }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(SEEDED_KEY, "true");
  } catch { /* ignore */ }
  return items;
}

export function getCategories(): CategoryItem[] {
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
        c && typeof c === "object" && "id" in c && "value" in c && "label" in c && "icon" in c && "color" in c
    );
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function saveCategories(items: CategoryItem[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

export function addCategory(data: Omit<CategoryItem, "id">): CategoryItem | null {
  const items = getCategories();
  const item: CategoryItem = { id: crypto.randomUUID(), ...data };
  items.push(item);
  if (!saveCategories(items)) return null;
  return item;
}

export function updateCategory(
  id: string,
  updates: Partial<Omit<CategoryItem, "id">>
): CategoryItem | null {
  const items = getCategories();
  const idx = items.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...updates };
  if (updates.label !== undefined && updates.value === undefined) {
    items[idx].value = updates.label;
  }
  if (!saveCategories(items)) return null;
  return items[idx];
}

export function deleteCategory(id: string): boolean {
  const items = getCategories();
  const filtered = items.filter((c) => c.id !== id);
  if (filtered.length === items.length) return false;
  return saveCategories(filtered);
}
