"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FaBars, FaHome, FaQuestionCircle, FaBell, FaUsers, FaSlidersH } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import SettingsDialog from "@/components/SettingsDialog";
import { useRouter } from "next/navigation";

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
  hasNewUpdates?: boolean;
  onUpdatesViewed?: () => void;
}

const Menu: React.FC<MenuProps> = ({ isOpen, onClose, hasNewUpdates = false, onUpdatesViewed }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const router = useRouter();

  const menuItems = useMemo(
    () => [
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
    ],
    [hasNewUpdates, onUpdatesViewed],
  );

  useEffect(() => {
    menuItems.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [menuItems, router]);

  return (
    <>
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
                        prefetch
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
                  <li>
                    <button
                      type="button"
                      className="menu-link menu-link-button"
                      onClick={() => {
                        setIsSettingsOpen(true);
                        onClose();
                      }}
                    >
                      <span className="menu-link-icon">
                        <FaSlidersH />
                      </span>
                      <span className="menu-item-text">تنظیمات</span>
                    </button>
                  </li>
                </ul>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};

export function MenuButton({ onClick, hasNotification = false }: { onClick: () => void; hasNotification?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "menu-button fixed top-4 right-4 w-10 h-10",
        "flex items-center justify-center rounded-full",
        "text-foreground transition-all",
      ].join(" ")}
      aria-label="Open menu"
    >
      <FaBars size={16} />
      {hasNotification && <span className="menu-button-indicator" aria-hidden="true" />}
    </button>
  );
}

export default Menu;
