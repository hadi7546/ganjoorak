"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaMoon, FaSun, FaRegNewspaper, FaTimes } from "react-icons/fa";
import {
  useSettings,
  type ThemeOption,
  type FontFamilyOption,
  type PoemViewerComponentKey,
  type PoemViewerComponentVisibility,
  FONT_STACKS,
} from "@/context/SettingsContext";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const THEME_OPTIONS: Array<{
  value: ThemeOption;
  label: string;
  icon: React.ReactNode;
}> = [
    { value: "dark", label: "تاریک", icon: <FaMoon /> },
    { value: "light", label: "روشن", icon: <FaSun /> },
    { value: "paper", label: "کاغذی", icon: <FaRegNewspaper /> },
  ];

const FONT_CHOICES: Array<{
  value: FontFamilyOption;
  label: string;
  note?: string;
}> = [
    { value: "vazirmatn", label: "وزیرمتن" },
    { value: "samim", label: "صمیم" },
    { value: "tanha", label: "تنها" },
    { value: "shabnam", label: "شبنم" },
    { value: "gandom", label: "گندم" },
    { value: "parastoo", label: "پرستو" },
    { value: "sahel", label: "ساحل" },
    { value: "nahid", label: "سناهید" },
  ];

const POEM_VIEWER_COMPONENT_OPTIONS: Array<{
  key: Exclude<PoemViewerComponentKey, "titleSection">;
  label: string;
}> = [
    { key: "audioPlayer", label: "پخش‌کننده صوت" },
    { key: "actionButtons", label: "دکمه‌های اشتراک و شاعر" },
    { key: "navigationControls", label: "دکمه‌های جابه‌جایی" },
  ];

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const {
    settings,
    setTheme,
    setShowLineNumbers,
    setFontFamily,
    setPoemViewerVisibility,
  } = useSettings();
  const [pendingTheme, setPendingTheme] = useState<ThemeOption>(settings.theme);
  const [pendingShowLineNumbers, setPendingShowLineNumbers] = useState<boolean>(
    settings.showLineNumbers,
  );
  const [pendingFontFamily, setPendingFontFamily] = useState<FontFamilyOption>(
    settings.fontFamily,
  );
  const [pendingVisibility, setPendingVisibility] =
    useState<PoemViewerComponentVisibility>({
      ...settings.poemViewerVisibility,
    });
  const originalThemeRef = useRef<ThemeOption>(settings.theme);
  const originalFontRef = useRef<FontFamilyOption>(settings.fontFamily);
  const originalLineNumbersRef = useRef<boolean>(settings.showLineNumbers);
  const originalVisibilityRef = useRef<PoemViewerComponentVisibility>({
    ...settings.poemViewerVisibility,
  });
  const hasSavedRef = useRef(false);
  const latestOnCloseRef = useRef(onClose);

  useEffect(() => {
    latestOnCloseRef.current = onClose;
  }, [onClose]);

  const restoreAppearance = useCallback(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute(
      "data-theme",
      originalThemeRef.current,
    );
    document.documentElement.setAttribute("data-font", originalFontRef.current);
    setShowLineNumbers(originalLineNumbersRef.current);
    setPoemViewerVisibility(originalVisibilityRef.current);
  }, [setShowLineNumbers, setPoemViewerVisibility]);

  const requestCloseWithoutSaving = useCallback(() => {
    hasSavedRef.current = false;
    restoreAppearance();
    latestOnCloseRef.current();
  }, [restoreAppearance]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    originalThemeRef.current = settings.theme;
    originalFontRef.current = settings.fontFamily;
    originalLineNumbersRef.current = settings.showLineNumbers;
    originalVisibilityRef.current = { ...settings.poemViewerVisibility };
    setPendingTheme(settings.theme);
    setPendingShowLineNumbers(settings.showLineNumbers);
    setPendingFontFamily(settings.fontFamily);
    setPendingVisibility({ ...settings.poemViewerVisibility });
    hasSavedRef.current = false;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        requestCloseWithoutSaving();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (!hasSavedRef.current) {
        restoreAppearance();
      }
    };
    // We intentionally only depend on the open state so we capture a single snapshot of
    // the active settings when the dialog mounts, avoiding repeated resets while the user
    // interacts with the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", pendingTheme);
  }, [isOpen, pendingTheme]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-font", pendingFontFamily);
  }, [isOpen, pendingFontFamily]);

  useEffect(() => {
    if (!isOpen) return;
    setShowLineNumbers(pendingShowLineNumbers);
  }, [isOpen, pendingShowLineNumbers, setShowLineNumbers]);

  const handleSave = () => {
    hasSavedRef.current = true;
    setTheme(pendingTheme);
    setShowLineNumbers(pendingShowLineNumbers);
    setFontFamily(pendingFontFamily);
    setPoemViewerVisibility(pendingVisibility);
    latestOnCloseRef.current();
  };

  const handleCancel = () => {
    requestCloseWithoutSaving();
  };

  const handleVisibilityToggle = (component: PoemViewerComponentKey) => {
    setPendingVisibility((prev) => {
      const next = {
        ...prev,
        [component]: !prev[component],
      };
      setPoemViewerVisibility(next);
      return next;
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={requestCloseWithoutSaving}
          />
          <motion.div
            className="settings-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="settings-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-dialog-title"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.25 }}
            >
              <header className="settings-header">
                <h2 id="settings-dialog-title" className="settings-title">
                  تنظیمات
                </h2>
                <button
                  type="button"
                  className="settings-close"
                  onClick={requestCloseWithoutSaving}
                  aria-label="بستن تنظیمات"
                >
                  <FaTimes />
                </button>
              </header>

              <div className="settings-body">
                <div className="settings-form" aria-live="polite">
                  <section
                    className="settings-section"
                    aria-label="انتخاب حالت نمایش"
                  >
                    <h3 className="settings-section-title">حالت نمایش</h3>
                    <div className="settings-theme-grid">
                      {THEME_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`settings-theme-button ${pendingTheme === option.value ? "active" : ""
                            }`}
                          onClick={() => setPendingTheme(option.value)}
                          aria-pressed={pendingTheme === option.value}
                        >
                          {option.icon}
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section
                    className="settings-section"
                    aria-label="شماره‌گذاری شعر"
                  >
                    <h3 className="settings-section-title">نمایش شماره بیت</h3>
                    <div className="settings-toggle">
                      <span className="settings-toggle-label">
                        نمایش شماره بیت
                      </span>
                      <button
                        type="button"
                        className={`settings-toggle-button ${pendingShowLineNumbers ? "active" : ""
                          }`}
                        onClick={() =>
                          setPendingShowLineNumbers((prev) => !prev)
                        }
                        aria-pressed={pendingShowLineNumbers}
                      >
                        {pendingShowLineNumbers ? "روشن" : "خاموش"}
                      </button>
                    </div>
                  </section>

                  <section
                    className="settings-section"
                    aria-label="انتخاب قلم شعر"
                  >
                    <h3 className="settings-section-title">قلم شعر</h3>
                    <div className="settings-font-grid">
                      {FONT_CHOICES.map((font) => (
                        <button
                          key={font.value}
                          type="button"
                          className={`settings-font-button ${pendingFontFamily === font.value ? "active" : ""
                            }`}
                          style={{ fontFamily: FONT_STACKS[font.value] }}
                          onClick={() => setPendingFontFamily(font.value)}
                          aria-pressed={pendingFontFamily === font.value}
                        >
                          <span className="font-label">{font.label}</span>
                          {font.note && (
                            <span className="font-note">({font.note})</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section
                    className="settings-section"
                    aria-label="اجزای نمایش شعر"
                  >
                    <h3 className="settings-section-title">نمایش اجزای شعر</h3>
                    <div className="settings-toggle-list">
                      {POEM_VIEWER_COMPONENT_OPTIONS.map((component) => (
                        <div key={component.key} className="settings-toggle">
                          <span className="settings-toggle-label">
                            {component.label}
                          </span>
                          <button
                            type="button"
                            className={`settings-toggle-button ${pendingVisibility[component.key] ? "active" : ""
                              }`}
                            onClick={() =>
                              handleVisibilityToggle(component.key)
                            }
                            aria-pressed={pendingVisibility[component.key]}
                          >
                            {pendingVisibility[component.key]
                              ? "نمایش"
                              : "مخفی"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
              <footer className="settings-actions">
                <button
                  type="button"
                  className="settings-action-button secondary"
                  onClick={handleCancel}
                >
                  لغو
                </button>
                <button
                  type="button"
                  className="settings-action-button primary"
                  onClick={handleSave}
                >
                  ذخیره
                </button>
              </footer>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsDialog;
