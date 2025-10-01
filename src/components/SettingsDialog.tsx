"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaMoon, FaSun, FaRegNewspaper, FaTimes } from "react-icons/fa";
import {
  useSettings,
  type ThemeOption,
  type FontFamilyOption,
  FONT_STACKS,
} from "@/context/SettingsContext";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const THEME_OPTIONS: Array<{ value: ThemeOption; label: string; icon: React.ReactNode }> = [
  { value: "dark", label: "تاریک", icon: <FaMoon /> },
  { value: "light", label: "روشن", icon: <FaSun /> },
  { value: "paper", label: "کاغذی", icon: <FaRegNewspaper /> },
];

const FONT_CHOICES: Array<{ value: FontFamilyOption; label: string; note?: string }> = [
  { value: "vazirmatn", label: "فونت فارسی/عربی وزیرمتن" },
  { value: "samim", label: "فونت فارسی صمیم", note: "توقف توسعه" },
  { value: "tanha", label: "فونت فارسی تنها", note: "توقف توسعه" },
  { value: "shabnam", label: "فونت فارسی شبنم", note: "توقف توسعه" },
  { value: "gandom", label: "فونت فارسی گندم", note: "توقف توسعه" },
  { value: "parastoo", label: "فونت فارسی پرستو", note: "توقف توسعه" },
  { value: "sahel", label: "فونت فارسی ساحل" },
  { value: "vazircode", label: "فونت فارسی وزیرکد", note: "برای برنامه‌نویسی" },
  { value: "nahid", label: "فونت فارسی ناهید", note: "توقف توسعه" },
];

const COUPLET_PREVIEW: Array<[string, string]> = [
  ["به صحرا بنگرم صحرا ته وینم", "به دریا بنگرم دریا ته وینم"],
  ["به هر جا بنگرم کوه و در و دشت", "نشان روی زیبای ته وینم"],
];

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const { settings, setTheme, toggleLineNumbers, setFontFamily } = useSettings();

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
                <button type="button" className="settings-close" onClick={onClose} aria-label="بستن تنظیمات">
                  <FaTimes />
                </button>
              </header>

              <section className="settings-section" aria-label="انتخاب حالت نمایش">
                <h3 className="settings-section-title">حالت نمایش</h3>
                <div className="settings-theme-grid">
                  {THEME_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`settings-theme-button ${settings.theme === option.value ? "active" : ""}`}
                      onClick={() => setTheme(option.value)}
                      aria-pressed={settings.theme === option.value}
                    >
                      {option.icon}
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="settings-section" aria-label="شماره‌گذاری شعر">
                <h3 className="settings-section-title">نمایش شماره بیت</h3>
                <div className="settings-toggle">
                  <span className="settings-toggle-label">نمایش شماره بیت</span>
                  <button
                    type="button"
                    className={`settings-toggle-button ${settings.showLineNumbers ? "active" : ""}`}
                    onClick={toggleLineNumbers}
                    aria-pressed={settings.showLineNumbers}
                  >
                    {settings.showLineNumbers ? "روشن" : "خاموش"}
                  </button>
                </div>
              </section>

              <section className="settings-section" aria-label="انتخاب فونت شعر">
                <h3 className="settings-section-title">فونت شعر</h3>
                <div className="settings-font-grid">
                  {FONT_CHOICES.map((font) => (
                    <button
                      key={font.value}
                      type="button"
                      className={`settings-font-button ${settings.fontFamily === font.value ? "active" : ""}`}
                      style={{ fontFamily: FONT_STACKS[font.value] }}
                      onClick={() => setFontFamily(font.value)}
                      aria-pressed={settings.fontFamily === font.value}
                    >
                      <span className="font-label">{font.label}</span>
                      {font.note && <span className="font-note">({font.note})</span>}
                    </button>
                  ))}
                </div>
                <div className="settings-preview" style={{ fontFamily: FONT_STACKS[settings.fontFamily] }}>
                  {COUPLET_PREVIEW.map(([first, second], index) => (
                    <p key={index}>
                      {first}
                      <br />
                      {second}
                    </p>
                  ))}
                </div>
              </section>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsDialog;
