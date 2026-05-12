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
type PoemFontSizeOption = number;
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
  poemFontSize: PoemFontSizeOption;
  poemViewerVisibility: PoemViewerComponentVisibility;
  randomizePoems: boolean;
  askRandomizePoemsOnPoetPages: boolean;
  followedPoetKeys: string[];
}

interface SettingsContextValue {
  settings: SettingsState;
  isHydrated: boolean;
  setTheme: (theme: ThemeOption) => void;
  toggleLineNumbers: () => void;
  setShowLineNumbers: (show: boolean) => void;
  setFontFamily: (fontFamily: FontFamilyOption) => void;
  setPoemFontSize: (fontSize: PoemFontSizeOption) => void;
  setPoemViewerVisibility: (
    visibility: Partial<PoemViewerComponentVisibility>,
  ) => void;
  setRandomizePoems: (randomize: boolean) => void;
  setAskRandomizePoemsOnPoetPages: (ask: boolean) => void;
  setFollowedPoetKeys: (keys: string[]) => void;
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
const POEM_FONT_SIZE_MIN = 85;
const POEM_FONT_SIZE_MAX = 125;
const POEM_FONT_SIZE_STEP = 5;
const DEFAULT_POEM_FONT_SIZE = 100;
const LEGACY_POEM_FONT_SIZE_VALUES: Record<string, number> = {
  compact: 90,
  normal: 100,
  large: 112,
  extra: 125,
};

const clampPoemFontSize = (value: unknown): PoemFontSizeOption => {
  const rawValue =
    typeof value === "string" && value in LEGACY_POEM_FONT_SIZE_VALUES
      ? LEGACY_POEM_FONT_SIZE_VALUES[value]
      : Number(value);

  if (!Number.isFinite(rawValue)) {
    return DEFAULT_POEM_FONT_SIZE;
  }

  const stepped =
    Math.round(rawValue / POEM_FONT_SIZE_STEP) * POEM_FONT_SIZE_STEP;
  return Math.min(POEM_FONT_SIZE_MAX, Math.max(POEM_FONT_SIZE_MIN, stepped));
};

const getPoemFontSizeVars = (fontSize: PoemFontSizeOption) => {
  const scale = clampPoemFontSize(fontSize) / 100;
  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  return {
    text: `${clamp(1.2 * scale, 1.05, 1.5).toFixed(3)}rem`,
    verse: `${clamp(1.5 * scale, 1.3, 1.85).toFixed(3)}rem`,
    title: `${clamp(2.5 * scale, 2.15, 3.1).toFixed(3)}rem`,
  };
};

const applyPoemFontSize = (fontSize: PoemFontSizeOption) => {
  if (typeof document === "undefined") return;

  const safeFontSize = clampPoemFontSize(fontSize);
  const variables = getPoemFontSizeVars(safeFontSize);
  document.documentElement.setAttribute(
    "data-poem-font-size",
    String(safeFontSize),
  );
  document.documentElement.style.setProperty(
    "--poem-text-font-size",
    variables.text,
  );
  document.documentElement.style.setProperty(
    "--poem-verse-font-size",
    variables.verse,
  );
  document.documentElement.style.setProperty(
    "--poem-title-font-size",
    variables.title,
  );
};

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
  poemFontSize: DEFAULT_POEM_FONT_SIZE,
  poemViewerVisibility: DEFAULT_POEM_VIEWER_VISIBILITY,
  randomizePoems: true,
  askRandomizePoemsOnPoetPages: true,
  followedPoetKeys: [],
};

const STORAGE_KEY = "ganjoorak:settings";

const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined,
);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsHydrated(true);
      return;
    }

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
        const nextPoemFontSize = clampPoemFontSize(parsed.poemFontSize);
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
        const nextFollowedPoetKeys = Array.isArray(parsed.followedPoetKeys)
          ? parsed.followedPoetKeys.filter(
              (key): key is string => typeof key === "string" && key.length > 0,
            )
          : DEFAULT_SETTINGS.followedPoetKeys;

        setSettings((prev) => ({
          ...prev,
          theme: nextTheme,
          fontFamily: nextFontFamily,
          poemFontSize: nextPoemFontSize,
          showLineNumbers: nextShowLineNumbers,
          poemViewerVisibility: nextVisibility,
          randomizePoems: nextRandomizePoems,
          askRandomizePoemsOnPoetPages: nextAskRandomizePoemsOnPoetPages,
          followedPoetKeys: nextFollowedPoetKeys,
        }));

        document.documentElement.setAttribute("data-theme", nextTheme);
        document.documentElement.setAttribute("data-font", nextFontFamily);
        applyPoemFontSize(nextPoemFontSize);
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
      applyPoemFontSize(DEFAULT_SETTINGS.poemFontSize);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isHydrated) return;

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.localStorage.setItem("theme", settings.theme);
  }, [isHydrated, settings]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-font", settings.fontFamily);
  }, [settings.fontFamily]);

  useEffect(() => {
    applyPoemFontSize(settings.poemFontSize);
  }, [settings.poemFontSize]);

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

  const setPoemFontSize = useCallback((fontSize: PoemFontSizeOption) => {
    setSettings((prev) => ({
      ...prev,
      poemFontSize: clampPoemFontSize(fontSize),
    }));
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

  const setFollowedPoetKeys = useCallback((keys: string[]) => {
    const uniqueKeys = Array.from(
      new Set(keys.filter((key) => typeof key === "string" && key.length > 0)),
    );
    setSettings((prev) => ({ ...prev, followedPoetKeys: uniqueKeys }));
  }, []);

  const value = useMemo(
    () => ({
      settings,
      isHydrated,
      setTheme,
      toggleLineNumbers,
      setShowLineNumbers,
      setFontFamily,
      setPoemFontSize,
      setPoemViewerVisibility,
      setRandomizePoems,
      setAskRandomizePoemsOnPoetPages,
      setFollowedPoetKeys,
    }),
    [
      settings,
      isHydrated,
      setTheme,
      toggleLineNumbers,
      setShowLineNumbers,
      setFontFamily,
      setPoemFontSize,
      setPoemViewerVisibility,
      setRandomizePoems,
      setAskRandomizePoemsOnPoetPages,
      setFollowedPoetKeys,
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

export type { ThemeOption, FontFamilyOption, PoemFontSizeOption };
export type { PoemViewerComponentVisibility, PoemViewerComponentKey };
export {
  FONT_STACKS,
  FONT_OPTIONS,
  POEM_FONT_SIZE_MIN,
  POEM_FONT_SIZE_MAX,
  POEM_FONT_SIZE_STEP,
  DEFAULT_POEM_FONT_SIZE,
  clampPoemFontSize,
  applyPoemFontSize,
  DEFAULT_POEM_VIEWER_VISIBILITY,
};
