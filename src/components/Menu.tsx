"use client";

import React from "react";
import Link from "next/link";
import {
  FaBars,
  FaHome,
  FaQuestionCircle,
  FaBell,
  FaUsers,
  FaSun,
  FaMoon,
  FaRegNewspaper,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings, type ThemeOption } from "@/context/SettingsContext";

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
  hasNewUpdates?: boolean;
  onUpdatesViewed?: () => void;
}

const THEME_OPTIONS: Array<{ value: ThemeOption; label: string; icon: React.ReactNode }> = [
  { value: "dark", label: "تاریک", icon: <FaMoon /> },
  { value: "light", label: "روشن", icon: <FaSun /> },
  { value: "paper", label: "کاغذی", icon: <FaRegNewspaper /> },
];

const Menu: React.FC<MenuProps> = ({ isOpen, onClose, hasNewUpdates = false, onUpdatesViewed }) => {
  const { settings, setTheme, toggleLineNumbers } = useSettings();

  const menuItems = [
    { href: "/", icon: <FaHome />, label: "صفحه اصلی" },
    { href: "/poets", icon: <FaUsers />, label: "شاعران" },
    { href: "/faq", icon: <FaQuestionCircle />, label: "پرسش‌های متداول" },
    {
      href: "/updates",
      icon: <FaBell />,
      label: "بروزرسانی‌ها",
      showBadge: hasNewUpdates,
      onClick: () => onUpdatesViewed?.(),
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="menu-backdrop fixed inset-0 bg-black bg-opacity-30 z-40"
          />

          {/* Menu popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
            className="menu-drawer fixed top-16 right-4 w-72 rounded-2xl p-4 shadow-2xl"
          >
            <nav>
              <ul className="space-y-1">
                {menuItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="menu-link"
                      onClick={() => {
                        item.onClick?.();
                        onClose();
                      }}
                    >
                      <span className="menu-link-icon">{item.icon}</span>
                      <span className="menu-item-text">{item.label}</span>
                      {item.showBadge && <span className="menu-badge" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="menu-section">
              <h3 className="menu-section-title">تنظیمات ظاهر</h3>
              <div className="menu-theme-options">
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`menu-theme-button ${settings.theme === option.value ? "active" : ""}`}
                    onClick={() => setTheme(option.value)}
                  >
                    <span className="menu-theme-icon">{option.icon}</span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="menu-section">
              <label className="menu-toggle">
                <input
                  type="checkbox"
                  checked={settings.showLineNumbers}
                  onChange={toggleLineNumbers}
                />
                <span className="menu-toggle-indicator" aria-hidden="true" />
                <span className="menu-toggle-label">نمایش شماره مصرع</span>
              </label>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export function MenuButton({ onClick, hasNotification = false }: { onClick: () => void; hasNotification?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="menu-button fixed top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full text-foreground transition-all"
      aria-label="Open menu"
    >
      <FaBars size={16} />
      {hasNotification && <span className="menu-button-indicator" aria-hidden="true" />}
    </button>
  );
}

export default Menu;
