"use client";

import React, { useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import {
  DEFAULT_SUGGESTED_INTEREST_KEYS,
  POEM_INTERESTS,
} from "@/data/interests";

interface InterestPickerDialogProps {
  selectedKeys: string[];
  isFirstRun?: boolean;
  onSave: (keys: string[]) => void;
  onClose: () => void;
}

const persianNumber = new Intl.NumberFormat("fa-IR");

const InterestPickerDialog: React.FC<InterestPickerDialogProps> = ({
  selectedKeys,
  isFirstRun = false,
  onSave,
  onClose,
}) => {
  const [pendingKeys, setPendingKeys] = useState<string[]>(selectedKeys);
  const pendingKeySet = useMemo(() => new Set(pendingKeys), [pendingKeys]);

  const toggleInterest = (key: string) => {
    setPendingKeys((currentKeys) =>
      currentKeys.includes(key)
        ? currentKeys.filter((currentKey) => currentKey !== key)
        : [...currentKeys, key],
    );
  };

  return (
    <div className="settings-backdrop" dir="rtl">
      <div className="settings-dialog">
        <section
          className="settings-panel max-w-3xl text-right"
          role="dialog"
          aria-modal="true"
          aria-labelledby="interest-picker-title"
        >
          <header className="settings-header">
            <h2 id="interest-picker-title" className="settings-title">
              علاقه‌مندی‌های شما
            </h2>
            <button
              type="button"
              className="settings-close"
              onClick={onClose}
              aria-label="بستن"
            >
              <FaTimes />
            </button>
          </header>
          <div className="settings-body">
            <div className="settings-form">
              <section className="settings-section">
                <p className="interest-picker-hint">
                  {isFirstRun
                    ? "چه نوع شعرهایی دوست دارید؟ چند مورد را انتخاب کنید تا دسته‌بندی‌ها بالای صفحه اصلی پیشنهاد شوند."
                    : "دسته‌بندی‌های انتخاب‌شده بالای صفحه اصلی نمایش داده می‌شوند."}
                </p>
                <div className="interest-picker-summary">
                  <span>
                    <strong>{persianNumber.format(pendingKeys.length)}</strong> دسته
                    انتخاب شده
                  </span>
                  <span>
                    از <strong>{persianNumber.format(POEM_INTERESTS.length)}</strong>{" "}
                    دسته
                  </span>
                </div>
                <div className="interest-picker-grid">
                  {POEM_INTERESTS.map((interest) => {
                    const isSelected = pendingKeySet.has(interest.key);
                    return (
                      <button
                        type="button"
                        key={interest.key}
                        className={`interest-picker-option${isSelected ? " is-active" : ""}`}
                        onClick={() => toggleInterest(interest.key)}
                        aria-pressed={isSelected}
                      >
                        <span
                          className="interest-picker-option-emoji"
                          aria-hidden="true"
                        >
                          {interest.emoji}
                        </span>
                        <span className="interest-picker-option-label">
                          {interest.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
          <footer className="settings-actions">
            <button
              type="button"
              className="settings-action-button secondary"
              onClick={() => setPendingKeys(DEFAULT_SUGGESTED_INTEREST_KEYS)}
            >
              پیشنهاد گنجورک
            </button>
            <button
              type="button"
              className="settings-action-button secondary"
              onClick={() => setPendingKeys([])}
            >
              پاک کردن
            </button>
            <button
              type="button"
              className="settings-action-button primary"
              onClick={() => onSave(pendingKeys)}
            >
              ذخیره
            </button>
          </footer>
        </section>
      </div>
    </div>
  );
};

export default InterestPickerDialog;
