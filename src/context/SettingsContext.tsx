"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type ThemeOption = "dark" | "light" | "paper";
type FontFamilyOption =
  | "vazirmatn"
  | "samim"
  | "tanha"
  | "shabnam"
  | "gandom"
  | "parastoo"
  | "sahel"
  | "vazircode"
  | "nahid";

interface SettingsState {
  theme: ThemeOption;
  showLineNumbers: boolean;
  fontFamily: FontFamilyOption;
}

interface SettingsContextValue {
  settings: SettingsState;
  setTheme: (theme: ThemeOption) => void;
  toggleLineNumbers: () => void;
  setFontFamily: (fontFamily: FontFamilyOption) => void;
}

const FONT_STACKS: Record<FontFamilyOption, string> = {
  vazirmatn: "'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif",
  samim: "'Samim', 'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif",
  tanha: "'Tanha', 'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif",
  shabnam: "'Shabnam', 'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif",
  gandom: "'Gandom', 'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif",
  parastoo: "'Parastoo', 'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif",
  sahel: "'Sahel', 'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif",
  vazircode: "'Vazir Code', 'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', monospace",
  nahid: "'Nahid', 'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif",
};

const FONT_OPTIONS = Object.keys(FONT_STACKS) as FontFamilyOption[];

const DEFAULT_SETTINGS: SettingsState = {
  theme: "dark",
  showLineNumbers: false,
  fontFamily: "vazirmatn",
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
          fontFamily: parsed.fontFamily && FONT_OPTIONS.includes(parsed.fontFamily)
            ? parsed.fontFamily
            : prev.fontFamily,
        }));
        if (parsed.theme) {
          document.documentElement.setAttribute("data-theme", parsed.theme);
          window.localStorage.setItem("theme", parsed.theme);
        }
        if (parsed.fontFamily && FONT_OPTIONS.includes(parsed.fontFamily)) {
          document.documentElement.setAttribute("data-font", parsed.fontFamily);
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
      document.documentElement.setAttribute("data-font", DEFAULT_SETTINGS.fontFamily);
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

  useEffect(() => {
    document.documentElement.setAttribute("data-font", settings.fontFamily);
  }, [settings.fontFamily]);

  const setTheme = useCallback((theme: ThemeOption) => {
    setSettings((prev) => ({ ...prev, theme }));
  }, []);

  const toggleLineNumbers = useCallback(() => {
    setSettings((prev) => ({ ...prev, showLineNumbers: !prev.showLineNumbers }));
  }, []);

  const setFontFamily = useCallback((fontFamily: FontFamilyOption) => {
    if (!FONT_OPTIONS.includes(fontFamily)) {
      return;
    }
    setSettings((prev) => ({ ...prev, fontFamily }));
  }, []);

  const value = useMemo(
    () => ({
      settings,
      setTheme,
      toggleLineNumbers,
      setFontFamily,
    }),
    [settings, setTheme, toggleLineNumbers, setFontFamily],
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

export type { ThemeOption, FontFamilyOption };
export { FONT_STACKS, FONT_OPTIONS };
