"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type ThemeOption = "dark" | "light" | "paper";

interface SettingsState {
  theme: ThemeOption;
  showLineNumbers: boolean;
}

interface SettingsContextValue {
  settings: SettingsState;
  setTheme: (theme: ThemeOption) => void;
  toggleLineNumbers: () => void;
}

const DEFAULT_SETTINGS: SettingsState = {
  theme: "dark",
  showLineNumbers: false,
};

const STORAGE_KEY = "ganjoorak:settings";

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SettingsState>;
        setSettings((prev) => ({
          ...prev,
          ...parsed,
        }));
        if (parsed.theme) {
          document.documentElement.setAttribute("data-theme", parsed.theme);
          window.localStorage.setItem("theme", parsed.theme);
        }
      } else {
        const legacyTheme = window.localStorage.getItem("theme");
        if (legacyTheme === "light" || legacyTheme === "dark" || legacyTheme === "paper") {
          setSettings((prev) => ({ ...prev, theme: legacyTheme }));
          document.documentElement.setAttribute("data-theme", legacyTheme);
        } else {
          document.documentElement.setAttribute("data-theme", DEFAULT_SETTINGS.theme);
        }
      }
    } catch (error) {
      console.error("Failed to load settings", error);
      document.documentElement.setAttribute("data-theme", DEFAULT_SETTINGS.theme);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.localStorage.setItem("theme", settings.theme);
  }, [settings]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  const setTheme = useCallback((theme: ThemeOption) => {
    setSettings((prev) => ({ ...prev, theme }));
  }, []);

  const toggleLineNumbers = useCallback(() => {
    setSettings((prev) => ({ ...prev, showLineNumbers: !prev.showLineNumbers }));
  }, []);

  const value = useMemo(
    () => ({
      settings,
      setTheme,
      toggleLineNumbers,
    }),
    [settings, setTheme, toggleLineNumbers],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

export type { ThemeOption };
