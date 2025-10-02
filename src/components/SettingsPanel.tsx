import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaTimes, FaSave, FaUndo } from "react-icons/fa";

export type ThemeOption = "dark" | "light" | "paper";
export type FontOption = "vazirmatn" | "scheherazade" | "nastaliq";

export interface UserSettings {
  theme: ThemeOption;
  poemFont: FontOption;
  showCoupletNumbers: boolean;
}

export interface ThemeOptionConfig {
  value: ThemeOption;
  label: string;
  description: string;
  preview: {
    background: string;
    foreground: string;
    accent: string;
  };
}

export interface FontOptionConfig {
  value: FontOption;
  label: string;
  description: string;
  fontFamily: string;
}

interface SettingsPanelProps {
  isOpen: boolean;
  settings: UserSettings;
  onChange: (changes: Partial<UserSettings>) => void;
  onSave: () => void;
  onDiscard: () => void;
  themeOptions: ThemeOptionConfig[];
  fontOptions: FontOptionConfig[];
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  settings,
  onChange,
  onSave,
  onDiscard,
  themeOptions,
  fontOptions,
}) => {
  const activeTheme =
    themeOptions.find((option) => option.value === settings.theme) ||
    themeOptions[0];
  const activeFont =
    fontOptions.find((option) => option.value === settings.poemFont) ||
    fontOptions[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="settings-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onDiscard}
          />

          <motion.div
            className="settings-panel"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <div
              className="settings-preview"
              style={{
                background: activeTheme.preview.background,
                color: activeTheme.preview.foreground,
                borderColor: activeTheme.preview.foreground + "1a",
                fontFamily: activeFont.fontFamily,
              }}
            >
              <div className="preview-header">
                <span className="preview-title">پیش‌نمایش</span>
                <span className="preview-theme">{activeTheme.label}</span>
              </div>

              <div className="preview-body">
                <div className="preview-poet">نمونه شاعر</div>
                <div
                  className={`preview-poem ${
                    settings.showCoupletNumbers ? "with-numbers" : ""
                  }`}
                >
                  <div className="preview-couplet">
                    {settings.showCoupletNumbers && (
                      <span
                        className="preview-number"
                        style={{ background: activeTheme.preview.accent, color: activeTheme.preview.foreground }}
                      >
                        ۱
                      </span>
                    )}
                    <div className="preview-line">بشنو از نی چون حکایت می‌کند</div>
                    <div className="preview-line">از جدایی‌ها شکایت می‌کند</div>
                  </div>

                  <div className="preview-couplet">
                    {settings.showCoupletNumbers && (
                      <span
                        className="preview-number"
                        style={{ background: activeTheme.preview.accent, color: activeTheme.preview.foreground }}
                      >
                        ۲
                      </span>
                    )}
                    <div className="preview-line">کز نیستان تا مرا ببریده‌اند</div>
                    <div className="preview-line">در نفیرم مرد و زن نالیده‌اند</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-content" dir="rtl">
              <div className="settings-header">
                <h3>تنظیمات نمایش شعر</h3>
                <button className="settings-close" onClick={onDiscard}>
                  <FaTimes />
                </button>
              </div>

              <div className="settings-section">
                <h4>پوسته</h4>
                <p className="settings-description">
                  یکی از حالت‌های نمایش زیر را انتخاب کنید.
                </p>
                <div className="settings-options">
                  {themeOptions.map((option) => (
                    <label key={option.value} className="settings-option">
                      <input
                        type="radio"
                        name="theme"
                        value={option.value}
                        checked={settings.theme === option.value}
                        onChange={() => onChange({ theme: option.value })}
                      />
                      <div className="option-content">
                        <span className="option-title">{option.label}</span>
                        <span className="option-description">
                          {option.description}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="settings-section">
                <h4>فونت شعر</h4>
                <p className="settings-description">
                  فونت دلخواه خود را برای نمایش ابیات انتخاب کنید.
                </p>
                <div className="settings-options">
                  {fontOptions.map((option) => (
                    <label key={option.value} className="settings-option">
                      <input
                        type="radio"
                        name="poemFont"
                        value={option.value}
                        checked={settings.poemFont === option.value}
                        onChange={() => onChange({ poemFont: option.value })}
                      />
                      <div className="option-content">
                        <span className="option-title" style={{ fontFamily: option.fontFamily }}>
                          {option.label}
                        </span>
                        <span className="option-description">
                          {option.description}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="settings-section">
                <h4>نمایش شماره ابیات</h4>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.showCoupletNumbers}
                    onChange={(event) =>
                      onChange({ showCoupletNumbers: event.target.checked })
                    }
                  />
                  <span>
                    {settings.showCoupletNumbers
                      ? "شماره‌گذاری فعال است"
                      : "شماره‌گذاری غیرفعال است"}
                  </span>
                </label>
              </div>

              <div className="settings-actions">
                <button className="discard-button" onClick={onDiscard}>
                  <FaUndo />
                  <span>انصراف</span>
                </button>
                <button className="save-button" onClick={onSave}>
                  <FaSave />
                  <span>ذخیره تنظیمات</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsPanel;
