import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
  theme: "light",
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

const STORAGE_KEY = "psa_theme";

export function ThemeProvider({ children, defaultTheme = "light" }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark" || saved === "system") {
        return saved;
      }
    } catch {
      // Ignore localStorage read errors in sandboxed environments
    }
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (theme === "system") {
      return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
        ? "dark"
        : "light";
    }
    return theme;
  });

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (targetTheme) => {
      const isDarkMode =
        targetTheme === "dark" ||
        (targetTheme === "system" &&
          window.matchMedia?.("(prefers-color-scheme: dark)")?.matches);

      if (isDarkMode) {
        root.classList.add("dark");
        root.style.colorScheme = "dark";
        setResolvedTheme("dark");
      } else {
        root.classList.remove("dark");
        root.style.colorScheme = "light";
        setResolvedTheme("light");
      }
    };

    applyTheme(theme);

    // If system mode, listen for OS color-scheme changes
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [theme]);

  const setTheme = (newTheme) => {
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // Ignore localStorage write errors
    }
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: resolvedTheme === "dark",
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
