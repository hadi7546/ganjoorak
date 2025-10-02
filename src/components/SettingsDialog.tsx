"use client";

import React, { useEffect, useState } from "react";
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

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const { settings, setTheme, setShowLineNumbers, setFontFamily } = useSettings();
  const [pendingTheme, setPendingTheme] = useState<ThemeOption>(settings.theme);
  const [pendingShowLineNumbers, setPendingShowLineNumbers] = useState<boolean>(
    settings.showLineNumbers,
  );
  const [pendingFontFamily, setPendingFontFamily] = useState<FontFamilyOption>(
    settings.fontFamily,
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    setPendingTheme(settings.theme);
    setPendingShowLineNumbers(settings.showLineNumbers);
    setPendingFontFamily(settings.fontFamily);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, settings.fontFamily, settings.showLineNumbers, settings.theme]);

  const handleSave = () => {
    setTheme(pendingTheme);
    setShowLineNumbers(pendingShowLineNumbers);
    setFontFamily(pendingFontFamily);
    onClose();
  };

  const handleCancel = () => {
    onClose();
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
                      className={`settings-theme-button ${
                        pendingTheme === option.value ? "active" : ""
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

              <section className="settings-section" aria-label="شماره‌گذاری شعر">
                <h3 className="settings-section-title">نمایش شماره بیت</h3>
                <div className="settings-toggle">
                  <span className="settings-toggle-label">نمایش شماره بیت</span>
                  <button
                    type="button"
                    className={`settings-toggle-button ${
                      pendingShowLineNumbers ? "active" : ""
                    }`}
                    onClick={() => setPendingShowLineNumbers((prev) => !prev)}
                    aria-pressed={pendingShowLineNumbers}
                  >
                    {pendingShowLineNumbers ? "روشن" : "خاموش"}
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
                      className={`settings-font-button ${
                        pendingFontFamily === font.value ? "active" : ""
                      }`}
                      style={{ fontFamily: FONT_STACKS[font.value] }}
                      onClick={() => setPendingFontFamily(font.value)}
                      aria-pressed={pendingFontFamily === font.value}
                    >
                      <span className="font-label">{font.label}</span>
                      {font.note && <span className="font-note">({font.note})</span>}
                    </button>
                  ))}
                </div>
              </section>
              <footer className="settings-actions">
                <button type="button" className="settings-action-button secondary" onClick={handleCancel}>
                  لغو
                </button>
                <button type="button" className="settings-action-button primary" onClick={handleSave}>
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
