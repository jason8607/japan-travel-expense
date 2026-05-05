"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface HeaderActionContextValue {
  action: ReactNode | null;
  setAction: (node: ReactNode | null) => void;
}

const HeaderActionContext = createContext<HeaderActionContextValue | null>(null);

export function HeaderActionProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<ReactNode | null>(null);
  return (
    <HeaderActionContext.Provider value={{ action, setAction }}>
      {children}
    </HeaderActionContext.Provider>
  );
}

export function useHeaderActionSlot() {
  const ctx = useContext(HeaderActionContext);
  if (!ctx) throw new Error("useHeaderActionSlot must be used within HeaderActionProvider");
  return ctx.action;
}

/**
 * Mounts the given node into the page header's right slot for the lifetime of
 * the calling component. Pass null/undefined to clear.
 */
export function useHeaderAction(node: ReactNode | null) {
  const ctx = useContext(HeaderActionContext);
  if (!ctx) throw new Error("useHeaderAction must be used within HeaderActionProvider");
  const { setAction } = ctx;
  useEffect(() => {
    setAction(node);
    return () => setAction(null);
  }, [node, setAction]);
}
