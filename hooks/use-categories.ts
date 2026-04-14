"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useApp } from "@/lib/context";
import { DEFAULT_CATEGORIES } from "@/types";
import type { CategoryItem } from "@/types";
import {
  getCategories as getLocalCategories,
  addCategory as addLocalCategory,
  updateCategory as updateLocalCategory,
  deleteCategory as deleteLocalCategory,
} from "@/lib/categories";

// Module-level cache
let catCache: CategoryItem[] | null = null;
let catCacheUserId: string | null = null;

export function useCategories() {
  const { user, isGuest } = useApp();
  const uid = user?.id || null;

  const cached = uid && catCacheUserId === uid ? catCache : null;
  const [categories, setCategories] = useState<CategoryItem[]>(cached || DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(!cached);
  const [isDefault, setIsDefault] = useState(true);
  const isDefaultRef = useRef(true);
  const mountedRef = useRef(true);

  const fetchCategories = useCallback(async () => {
    if (isGuest || !user) {
      const local = getLocalCategories();
      setCategories(local);
      setIsDefault(false);
      isDefaultRef.current = false;
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        const fetched = data.categories || DEFAULT_CATEGORIES;
        const def = data.is_default ?? true;
        catCache = fetched;
        catCacheUserId = user.id;
        if (mountedRef.current) {
          setCategories(fetched);
          setIsDefault(def);
          isDefaultRef.current = def;
        }
      }
    } catch {
      // fallback to defaults
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [user?.id, isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isGuest && uid && catCacheUserId === uid && catCache) {
      setCategories(catCache);
      setLoading(false);
      fetchCategories(); // background refresh
    } else {
      fetchCategories();
    }
  }, [fetchCategories, isGuest, uid]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const initUserCategories = useCallback(async () => {
    if (isGuest || !user || !isDefaultRef.current) return;

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed: true }),
      });
      if (res.ok) {
        await fetchCategories();
      }
    } catch {
      // ignore
    }
  }, [isGuest, user, fetchCategories]);

  const addCat = useCallback(
    async (data: Omit<CategoryItem, "id">): Promise<CategoryItem | null> => {
      if (isDefaultRef.current) await initUserCategories();

      if (isGuest || !user) {
        const item = addLocalCategory(data);
        if (item) setCategories(getLocalCategories());
        return item;
      }

      try {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) return null;
        const { category } = await res.json();
        await fetchCategories();
        return category;
      } catch {
        return null;
      }
    },
    [isGuest, user, initUserCategories, fetchCategories]
  );

  const updateCat = useCallback(
    async (
      id: string,
      updates: Partial<Omit<CategoryItem, "id">>
    ): Promise<CategoryItem | null> => {
      if (isDefaultRef.current) await initUserCategories();

      if (isGuest || !user) {
        const item = updateLocalCategory(id, updates);
        if (item) setCategories(getLocalCategories());
        return item;
      }

      try {
        const res = await fetch("/api/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...updates }),
        });
        if (!res.ok) return null;
        const { category } = await res.json();
        await fetchCategories();
        return category;
      } catch {
        return null;
      }
    },
    [isGuest, user, initUserCategories, fetchCategories]
  );

  const deleteCat = useCallback(
    async (id: string): Promise<boolean> => {
      if (isDefaultRef.current) await initUserCategories();

      if (isGuest || !user) {
        const ok = deleteLocalCategory(id);
        if (ok) setCategories(getLocalCategories());
        return ok;
      }

      try {
        const res = await fetch(`/api/categories?id=${id}`, {
          method: "DELETE",
        });
        if (!res.ok) return false;
        await fetchCategories();
        return true;
      } catch {
        return false;
      }
    },
    [isGuest, user, initUserCategories, fetchCategories]
  );

  return {
    categories,
    loading,
    addCategory: addCat,
    updateCategory: updateCat,
    deleteCategory: deleteCat,
    refresh: fetchCategories,
  };
}
