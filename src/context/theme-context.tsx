"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_KEY = "vrebajpopust_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const initTheme = () => {
      // Check localStorage first
      const stored = localStorage.getItem(THEME_KEY) as Theme | null;
      if (stored === "light" || stored === "dark") {
        setThemeState(stored);
        document.documentElement.classList.toggle("dark", stored === "dark");
      } else {
        // Fall back to system preference
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setThemeState(prefersDark ? "dark" : "light");
        document.documentElement.classList.toggle("dark", prefersDark);
      }
      setMounted(true);
    };
    initTheme();
  }, []);

  // Update document class and localStorage when theme changes
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem(THEME_KEY, newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  // Prevent flash of wrong theme
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
