"use client";

import React, { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  FaBars,
  FaBookOpen,
  FaHome,
  FaQuestionCircle,
  FaBell,
  FaUsers,
  FaSlidersH,
  FaLock,
  FaLockOpen,
  FaSearch,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
  hasNewUpdates?: boolean;
  onUpdatesViewed?: () => void;
  onOpenSettings: () => void;
  onOpenFeed?: () => void;
  onOpenSearch?: () => void;
  isZenLocked?: boolean;
  onToggleZenLock?: () => void;
}

const Menu: React.FC<MenuProps> = ({
  isOpen,
  onClose,
  hasNewUpdates = false,
  onUpdatesViewed,
  onOpenSettings,
  onOpenFeed,
  isZenLocked = false,
  onToggleZenLock,
}) => {
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

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <>
      <style>{`
        body:has(.menu-drawer) .poem-feed-lock-button,
        body:has(.menu-drawer) .sidebar-toggle-button {
          opacity: 0 !important;
          pointer-events: none !important;
          transform: translateX(0.35rem) scale(0.96) !important;
        }

        @media (max-width: 640px) {
          .menu-button {
            top: auto !important;
            right: 1rem !important;
            bottom: calc(1rem + env(safe-area-inset-bottom)) !important;
          }

          .global-search-button {
            top: auto !important;
            right: 1rem !important;
            bottom: calc(4.25rem + env(safe-area-inset-bottom)) !important;
          }

          .menu-backdrop {
            z-index: 1090 !important;
            background: rgb(0 0 0 / 0.46) !important;
            -webkit-backdrop-filter: blur(4px);
            backdrop-filter: blur(4px);
          }

          .menu-drawer {
            z-index: 1100 !important;
            top: auto !important;
            left: 0.75rem !important;
            right: 0.75rem !important;
            bottom: calc(0.75rem + env(safe-area-inset-bottom)) !important;
            width: auto !important;
            max-height: min(78dvh, 34rem);
            overflow: hidden;
            padding: 0.75rem !important;
            border-radius: 1.5rem 1.5rem 1.25rem 1.25rem !important;
            background: rgb(var(--background) / 0.92) !important;
            border: 1px solid rgb(var(--foreground) / 0.1);
            box-shadow: 0 24px 60px rgb(0 0 0 / 0.42) !important;
          }

          .menu-drawer::before {
            content: "";
            display: block;
            width: 2.75rem;
            height: 0.25rem;
            border-radius: 999px;
            background: rgb(var(--foreground) / 0.22);
            margin: 0.2rem auto 0.85rem;
          }

          .menu-drawer nav {
            max-height: calc(min(78dvh, 34rem) - 2rem);
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }

          .menu-link {
            min-height: 3.25rem;
            padding: 0.85rem 1rem !important;
            border-radius: 1rem !important;
            background: rgb(var(--foreground) / 0.035);
          }

          .menu-drawer li + li {
            margin-top: 0.35rem;
          }

          .menu-link-icon {
            width: 1.5rem;
            min-width: 1.5rem;
            display: inline-flex;
            justify-content: center;
            opacity: 0.82;
          }

          .menu-item-text {
            font-size: 1rem !important;
            letter-spacing: 0 !important;
          }
        }
      `}</style>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="menu-backdrop fixed inset-0 bg-black bg-opacity-30 z-40"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 28 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 28 }}
              transition={{ type: "spring", duration: 0.32, bounce: 0.16 }}
              className="menu-drawer fixed top-16 right-4 w-72 rounded-2xl p-4 shadow-2xl z-[1201]"
              role="dialog"
              aria-modal="true"
              aria-label="منوی اصلی"
            >
              <nav>
                <ul className="space-y-1">
                  {onToggleZenLock && (
                    <li>
                      <button
                        type="button"
                        className="menu-link menu-link-button"
                        onClick={onToggleZenLock}
                        aria-pressed={isZenLocked}
                      >
                        <span className="menu-link-icon">
                          {isZenLocked ? <FaLock /> : <FaLockOpen />}
                        </span>
                        <span className="menu-item-text">
                          {isZenLocked ? "باز کردن قفل شعر" : "قفل روی همین شعر"}
                        </span>
                      </button>
                    </li>
                  )}
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
                  {onOpenFeed && (
                    <li>
                      <button
                        type="button"
                        className="menu-link menu-link-button"
                        onClick={() => {
                          onOpenFeed();
                        }}
                      >
                        <span className="menu-link-icon">
                          <FaBookOpen />
                        </span>
                        <span className="menu-item-text">شاعرهای صفحه اصلی</span>
                      </button>
                    </li>
                  )}
                  {!onOpenFeed && (
                    <li>
                      <Link
                        href="/?feed=1"
                        prefetch
                        className="menu-link"
                        onClick={onClose}
                      >
                        <span className="menu-link-icon">
                          <FaBookOpen />
                        </span>
                        <span className="menu-item-text">شاعرهای صفحه اصلی</span>
                      </Link>
                    </li>
                  )}
                  <li>
                    <button
                      type="button"
                      className="menu-link menu-link-button"
                      onClick={() => {
                        onOpenSettings();
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
    </>
  );
};

export function MenuButton({
  onClick,
  hasNotification = false,
  isHidden = false,
}: {
  onClick: () => void;
  hasNotification?: boolean;
  isHidden?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "menu-button fixed top-4 right-4 w-10 h-10",
        "flex items-center justify-center rounded-full",
        "text-foreground transition-all",
        isHidden ? "is-hidden" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Open menu"
    >
      <FaBars size={16} />
      {hasNotification && (
        <span className="menu-button-indicator" aria-hidden="true" />
      )}
    </button>
  );
}

export function SearchButton({
  onClick,
  isHidden = false,
}: {
  onClick: () => void;
  isHidden?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "global-search-button fixed top-16 right-4 w-10 h-10",
        "flex items-center justify-center rounded-full",
        "text-foreground transition-all",
        isHidden ? "is-hidden" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="جستجو"
    >
      <FaSearch size={15} />
    </button>
  );
}

export default Menu;
