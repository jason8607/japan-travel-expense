"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "warm" | "dark";

export const THEME_OPTIONS: {
  value: Theme;
  label: string;
  description: string;
  swatches: [string, string, string];
}[] = [
  {
    value: "light",
    label: "淺色",
    description: "白底＋藍色，清爽簡約",
    swatches: ["#FFFFFF", "#2563EB", "#F1F5F9"],
  },
  {
    value: "warm",
    label: "日本",
    description: "暖粉色調，溫柔療癒",
    swatches: ["#FAF2EE", "#BC5568", "#F3D7D2"],
  },
  {
    value: "dark",
    label: "深色",
    description: "黑底＋靛藍，低調沉穩",
    swatches: ["#0B0B0F", "#818CF8", "#1C1C22"],
  },
];

const THEME_BG: Record<Theme, string> = {
  light: "#FFFFFF",
  warm: "#FAF2EE",
  dark: "#0B0B0F",
};

export const DEFAULT_THEME: Theme = "warm";
const STORAGE_KEY = "theme";

function isTheme(v: unknown): v is Theme {
  return v === "light" || v === "warm" || v === "dark";
}

/**
 * Serialisable init script that sets the theme before React hydrates.
 * Inlined into <head> to avoid a flash of unstyled content.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t!=='light'&&t!=='warm'&&t!=='dark')t='${DEFAULT_THEME}';var d=document.documentElement;d.setAttribute('data-theme',t);if(t==='dark')d.classList.add('dark');else d.classList.remove('dark');var bg=t==='light'?'#FFFFFF':t==='dark'?'#0B0B0F':'#FAF2EE';var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement('meta');m.setAttribute('name','theme-color');document.head.appendChild(m);}m.setAttribute('content',bg);}catch(e){}})();`;

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");

  // Keep the mobile browser chrome colour in sync with the active theme.
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", THEME_BG[theme]);
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  // Read the stored theme once on mount. The inline script has already
  // applied it to the DOM — here we just sync React state.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isTheme(stored)) setThemeState(stored);
    } catch {
      // ignore
    }
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    applyTheme(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
