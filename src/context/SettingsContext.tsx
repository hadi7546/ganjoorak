"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { logger } from "@/utils/logger";

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

type PoemViewerComponentVisibility = {
  titleSection: boolean;
  titleBreadcrumbs: boolean;
  audioPlayer: boolean;
  actionButtons: boolean;
  navigationControls: boolean;
};

type PoemViewerComponentKey = keyof PoemViewerComponentVisibility;

interface SettingsState {
  theme: ThemeOption;
  showLineNumbers: boolean;
  fontFamily: FontFamilyOption;
  poemViewerVisibility: PoemViewerComponentVisibility;
  randomizePoems: boolean;
  askRandomizePoemsOnPoetPages: boolean;
}

interface SettingsContextValue {
  settings: SettingsState;
  setTheme: (theme: ThemeOption) => void;
  toggleLineNumbers: () => void;
  setShowLineNumbers: (show: boolean) => void;
  setFontFamily: (fontFamily: FontFamilyOption) => void;
  setPoemViewerVisibility: (
    visibility: Partial<PoemViewerComponentVisibility>,
  ) => void;
  setRandomizePoems: (randomize: boolean) => void;
  setAskRandomizePoemsOnPoetPages: (ask: boolean) => void;
}

const FONT_STACKS: Record<FontFamilyOption, string> = {
  vazirmatn: "'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif",
  samim: "'Samim', 'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif",
  tanha: "'Tanha', 'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif",
  shabnam:
    "'Shabnam', 'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif",
  gandom: "'Gandom', 'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif",
  parastoo:
    "'Parastoo', 'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif",
  sahel: "'Sahel', 'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif",
  vazircode:
    "'Vazir Code', 'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', monospace",
  nahid: "'Nahid', 'Vazirmatn', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif",
};

const FONT_OPTIONS = Object.keys(FONT_STACKS) as FontFamilyOption[];

const DEFAULT_POEM_VIEWER_VISIBILITY: PoemViewerComponentVisibility = {
  titleSection: true,
  titleBreadcrumbs: true,
  audioPlayer: true,
  actionButtons: true,
  navigationControls: true,
};

const VALID_THEMES: ThemeOption[] = ["dark", "light", "paper"];

const POEM_VIEWER_COMPONENT_KEYS: PoemViewerComponentKey[] = [
  "titleSection",
  "titleBreadcrumbs",
  "audioPlayer",
  "actionButtons",
  "navigationControls",
];

const sanitizePoemViewerVisibility = (
  value?: Partial<PoemViewerComponentVisibility>,
): Partial<PoemViewerComponentVisibility> => {
  if (!value) {
    return {};
  }

  return POEM_VIEWER_COMPONENT_KEYS.reduce<
    Partial<PoemViewerComponentVisibility>
  >((accumulator, key) => {
    if (key === "titleSection") {
      return accumulator;
    }
    if (typeof value[key] === "boolean") {
      accumulator[key] = value[key] as boolean;
    }
    return accumulator;
  }, {});
};

const DEFAULT_SETTINGS: SettingsState = {
  theme: "dark",
  showLineNumbers: false,
  fontFamily: "vazirmatn",
  poemViewerVisibility: DEFAULT_POEM_VIEWER_VISIBILITY,
  randomizePoems: true,
  askRandomizePoemsOnPoetPages: true,
};

const STORAGE_KEY = "ganjoorak:settings";

const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined,
);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SettingsState>;
        const nextTheme =
          parsed.theme && VALID_THEMES.includes(parsed.theme)
            ? parsed.theme
            : DEFAULT_SETTINGS.theme;
        const nextFontFamily =
          parsed.fontFamily && FONT_OPTIONS.includes(parsed.fontFamily)
            ? parsed.fontFamily
            : DEFAULT_SETTINGS.fontFamily;
        const nextShowLineNumbers =
          typeof parsed.showLineNumbers === "boolean"
            ? parsed.showLineNumbers
            : DEFAULT_SETTINGS.showLineNumbers;
        const nextVisibility = {
          ...DEFAULT_POEM_VIEWER_VISIBILITY,
          ...sanitizePoemViewerVisibility(parsed.poemViewerVisibility),
        };
        nextVisibility.titleSection = true;
        const nextRandomizePoems =
          typeof parsed.randomizePoems === "boolean"
            ? parsed.randomizePoems
            : DEFAULT_SETTINGS.randomizePoems;
        const nextAskRandomizePoemsOnPoetPages =
          typeof parsed.askRandomizePoemsOnPoetPages === "boolean"
            ? parsed.askRandomizePoemsOnPoetPages
            : DEFAULT_SETTINGS.askRandomizePoemsOnPoetPages;

        setSettings((prev) => ({
          ...prev,
          theme: nextTheme,
          fontFamily: nextFontFamily,
          showLineNumbers: nextShowLineNumbers,
          poemViewerVisibility: nextVisibility,
          randomizePoems: nextRandomizePoems,
          askRandomizePoemsOnPoetPages: nextAskRandomizePoemsOnPoetPages,
        }));

        document.documentElement.setAttribute("data-theme", nextTheme);
        document.documentElement.setAttribute("data-font", nextFontFamily);
        window.localStorage.setItem("theme", nextTheme);
      } else {
        const legacyTheme = window.localStorage.getItem("theme");
        if (
          legacyTheme === "light" ||
          legacyTheme === "dark" ||
          legacyTheme === "paper"
        ) {
          setSettings((prev) => ({ ...prev, theme: legacyTheme }));
          document.documentElement.setAttribute("data-theme", legacyTheme);
        } else {
          document.documentElement.setAttribute(
            "data-theme",
            DEFAULT_SETTINGS.theme,
          );
        }
      }
    } catch (error) {
      logger.error("Failed to load settings", error);
      document.documentElement.setAttribute(
        "data-theme",
        DEFAULT_SETTINGS.theme,
      );
      document.documentElement.setAttribute(
        "data-font",
        DEFAULT_SETTINGS.fontFamily,
      );
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
    setSettings((prev) => ({
      ...prev,
      showLineNumbers: !prev.showLineNumbers,
    }));
  }, []);

  const setShowLineNumbers = useCallback((show: boolean) => {
    setSettings((prev) => ({ ...prev, showLineNumbers: show }));
  }, []);

  const setFontFamily = useCallback((fontFamily: FontFamilyOption) => {
    if (!FONT_OPTIONS.includes(fontFamily)) {
      return;
    }
    setSettings((prev) => ({ ...prev, fontFamily }));
  }, []);

  const setPoemViewerVisibility = useCallback(
    (visibility: Partial<PoemViewerComponentVisibility>) => {
      setSettings((prev) => ({
        ...prev,
        poemViewerVisibility: {
          ...prev.poemViewerVisibility,
          ...sanitizePoemViewerVisibility(visibility),
          titleSection: true,
        },
      }));
    },
    [],
  );

  const setRandomizePoems = useCallback((randomize: boolean) => {
    setSettings((prev) => ({ ...prev, randomizePoems: randomize }));
  }, []);

  const setAskRandomizePoemsOnPoetPages = useCallback((ask: boolean) => {
    setSettings((prev) => ({ ...prev, askRandomizePoemsOnPoetPages: ask }));
  }, []);

  const value = useMemo(
    () => ({
      settings,
      setTheme,
      toggleLineNumbers,
      setShowLineNumbers,
      setFontFamily,
      setPoemViewerVisibility,
      setRandomizePoems,
      setAskRandomizePoemsOnPoetPages,
    }),
    [
      settings,
      setTheme,
      toggleLineNumbers,
      setShowLineNumbers,
      setFontFamily,
      setPoemViewerVisibility,
      setRandomizePoems,
      setAskRandomizePoemsOnPoetPages,
    ],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

export type { ThemeOption, FontFamilyOption };
export type { PoemViewerComponentVisibility, PoemViewerComponentKey };
export { FONT_STACKS, FONT_OPTIONS, DEFAULT_POEM_VIEWER_VISIBILITY };
