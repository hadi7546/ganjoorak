"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  FaBars,
  FaBell,
  FaBookOpen,
  FaBookmark,
  FaChevronLeft,
  FaHome,
  FaLock,
  FaLockOpen,
  FaMinus,
  FaMoon,
  FaPlus,
  FaQuestionCircle,
  FaRegNewspaper,
  FaSearch,
  FaSlidersH,
  FaSun,
  FaTimes,
  FaUsers,
} from "react-icons/fa";
import {
  POEM_FONT_SIZE_MAX,
  POEM_FONT_SIZE_MIN,
  POEM_FONT_SIZE_STEP,
  useSettings,
  type ThemeOption,
} from "@/context/SettingsContext";

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
  hasNewUpdates?: boolean;
  onUpdatesViewed?: () => void;
  onOpenSettings: () => void;
  onOpenFeed?: () => void;
  onOpenFeedLabel?: string;
  onOpenSearch?: () => void;
  isZenLocked?: boolean;
  onToggleZenLock?: () => void;
}

type MenuLinkItem = {
  kind: "link";
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  onClick?: () => void;
};

type MenuButtonItem = {
  kind: "button";
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  ariaPressed?: boolean;
};

type MenuItem = MenuLinkItem | MenuButtonItem;

const THEME_OPTIONS: Array<{
  value: ThemeOption;
  label: string;
  icon: React.ReactNode;
}> = [
  { value: "dark", label: "تاریک", icon: <FaMoon aria-hidden="true" /> },
  { value: "light", label: "روشن", icon: <FaSun aria-hidden="true" /> },
  { value: "paper", label: "کاغذی", icon: <FaRegNewspaper aria-hidden="true" /> },
];

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const persianNumber = new Intl.NumberFormat("fa-IR");

const isRouteActive = (pathname: string | null, href: string) => {
  if (!pathname || href.includes("?")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
};

const Menu: React.FC<MenuProps> = ({
  isOpen,
  onClose,
  hasNewUpdates = false,
  onUpdatesViewed,
  onOpenSettings,
  onOpenFeed,
  onOpenFeedLabel = "شاعران صفحه اصلی",
  isZenLocked = false,
  onToggleZenLock,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { settings, setTheme, setPoemFontSize } = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastPathnameRef = useRef(pathname);

  const primaryItems = useMemo<MenuLinkItem[]>(
    () => [
      { kind: "link", href: "/", icon: <FaHome />, label: "صفحه اصلی" },
      { kind: "link", href: "/search", icon: <FaSearch />, label: "جستجو" },
      { kind: "link", href: "/poets", icon: <FaUsers />, label: "شاعران" },
      { kind: "link", href: "/saved", icon: <FaBookmark />, label: "نشان‌شده‌ها" },
      { kind: "link", href: "/today", icon: <FaSun />, label: "شعر روز" },
    ],
    [],
  );

  const secondaryItems = useMemo<MenuItem[]>(() => {
    const items: MenuItem[] = [
      {
        kind: "link",
        href: "/faq",
        icon: <FaQuestionCircle />,
        label: "پرسش‌های متداول",
      },
      {
        kind: "link",
        href: "/updates",
        icon: <FaBell />,
        label: "بروزرسانی‌ها",
        badge: hasNewUpdates ? "جدید" : undefined,
        onClick: () => onUpdatesViewed?.(),
      },
    ];

    if (onOpenFeed) {
      items.push({
        kind: "button",
        icon: <FaBookOpen />,
        label: onOpenFeedLabel,
        onClick: () => {
          onOpenFeed();
          onClose();
        },
      });
    } else {
      items.push({
        kind: "link",
        href: "/?feed=1",
        icon: <FaBookOpen />,
        label: "شاعران صفحه اصلی",
      });
    }

    if (onToggleZenLock) {
      items.push({
        kind: "button",
        icon: isZenLocked ? <FaLock /> : <FaLockOpen />,
        label: isZenLocked ? "باز کردن قفل شعر" : "قفل روی همین شعر",
        onClick: onToggleZenLock,
        ariaPressed: isZenLocked,
      });
    }

    return items;
  }, [
    hasNewUpdates,
    isZenLocked,
    onClose,
    onOpenFeed,
    onOpenFeedLabel,
    onToggleZenLock,
    onUpdatesViewed,
  ]);

  useEffect(() => {
    [...primaryItems, ...secondaryItems].forEach((item) => {
      if (item.kind === "link") {
        router.prefetch(item.href);
      }
    });
  }, [primaryItems, router, secondaryItems]);

  // Close when the route changes underneath the drawer (back/forward, in-page navigation).
  useEffect(() => {
    if (lastPathnameRef.current === pathname) return;
    lastPathnameRef.current = pathname;
    if (isOpen) onClose();
  }, [isOpen, onClose, pathname]);

  // Scroll lock, Escape, focus trap and focus restoration while open.
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const isInside = active instanceof Node && panel.contains(active);

      if (event.shiftKey) {
        if (!isInside || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!isInside || active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [isOpen, onClose]);

  const handleFontSizeStep = useCallback(
    (direction: 1 | -1) => {
      setPoemFontSize(settings.poemFontSize + direction * POEM_FONT_SIZE_STEP);
    },
    [setPoemFontSize, settings.poemFontSize],
  );

  const renderItem = (item: MenuItem) => {
    if (item.kind === "button") {
      return (
        <li key={item.label}>
          <button
            type="button"
            className="menu-link"
            onClick={item.onClick}
            aria-pressed={item.ariaPressed}
          >
            <span className="menu-link-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="menu-link-label">{item.label}</span>
          </button>
        </li>
      );
    }

    const active = isRouteActive(pathname, item.href);

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          prefetch
          className={`menu-link${active ? " is-active" : ""}`}
          aria-current={active ? "page" : undefined}
          onClick={() => {
            item.onClick?.();
            onClose();
          }}
        >
          <span className="menu-link-icon" aria-hidden="true">
            {item.icon}
          </span>
          <span className="menu-link-label">{item.label}</span>
          {item.badge && <span className="menu-link-badge">{item.badge}</span>}
        </Link>
      </li>
    );
  };

  const drawerMotion = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { x: "100%" },
        animate: { x: 0 },
        exit: { x: "100%" },
        transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] },
      };

  const canDecreaseFont = settings.poemFontSize > POEM_FONT_SIZE_MIN;
  const canIncreaseFont = settings.poemFontSize < POEM_FONT_SIZE_MAX;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="menu-backdrop"
            className="menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.15 : 0.22 }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            key="menu-drawer"
            ref={panelRef}
            className="menu-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-drawer-title"
            id="main-menu"
            {...drawerMotion}
          >
            <header className="menu-drawer-header">
              <div className="menu-brand">
                <Image
                  src="/icon-192.png"
                  alt=""
                  width={40}
                  height={40}
                  className="menu-brand-logo"
                  priority
                />
                <div className="menu-brand-text">
                  <span id="menu-drawer-title" className="menu-brand-title">
                    گنجورک
                  </span>
                  <span className="menu-brand-subtitle">
                    راحت‌تر شعر بخوانیم و شعر گوش دهیم
                  </span>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="menu-close"
                onClick={onClose}
                aria-label="بستن منو"
              >
                <FaTimes aria-hidden="true" />
              </button>
            </header>

            <nav className="menu-drawer-body" aria-label="منوی اصلی">
              <section className="menu-section">
                <ul className="menu-list">
                  {primaryItems.map((item) => renderItem(item))}
                </ul>
              </section>

              <section className="menu-section" aria-labelledby="menu-section-more">
                <h2 id="menu-section-more" className="menu-section-title">
                  بیشتر
                </h2>
                <ul className="menu-list">
                  {secondaryItems.map((item) => renderItem(item))}
                </ul>
              </section>
            </nav>

            <footer className="menu-drawer-footer">
              <div
                className="menu-theme-switch"
                role="radiogroup"
                aria-label="پوستهٔ نمایش"
              >
                {THEME_OPTIONS.map((option) => {
                  const active = settings.theme === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`menu-theme-option${active ? " is-active" : ""}`}
                      onClick={() => setTheme(option.value)}
                    >
                      <span className="menu-theme-option-icon">{option.icon}</span>
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="menu-footer-row">
                <button
                  type="button"
                  className="menu-settings-button"
                  onClick={() => {
                    onOpenSettings();
                    onClose();
                  }}
                >
                  <span className="menu-link-icon" aria-hidden="true">
                    <FaSlidersH />
                  </span>
                  <span className="menu-link-label">تنظیمات</span>
                  <span className="menu-settings-chevron" aria-hidden="true">
                    <FaChevronLeft />
                  </span>
                </button>

                <div
                  className="menu-font-stepper"
                  role="group"
                  aria-label="اندازهٔ متن شعر"
                >
                  <button
                    type="button"
                    onClick={() => handleFontSizeStep(-1)}
                    disabled={!canDecreaseFont}
                    aria-label="کوچک‌تر کردن متن"
                  >
                    <FaMinus aria-hidden="true" />
                  </button>
                  <span className="menu-font-stepper-value" aria-live="polite">
                    {persianNumber.format(settings.poemFontSize)}٪
                  </span>
                  <button
                    type="button"
                    onClick={() => handleFontSizeStep(1)}
                    disabled={!canIncreaseFont}
                    aria-label="بزرگ‌تر کردن متن"
                  >
                    <FaPlus aria-hidden="true" />
                  </button>
                </div>
              </div>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export function MenuButton({
  onClick,
  hasNotification = false,
  isHidden = false,
  isOpen,
}: {
  onClick: () => void;
  hasNotification?: boolean;
  isHidden?: boolean;
  isOpen?: boolean;
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
      aria-label="منو"
      aria-haspopup="dialog"
      aria-controls="main-menu"
      aria-expanded={isOpen}
    >
      <FaBars size={16} aria-hidden="true" />
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
      <FaSearch size={15} aria-hidden="true" />
    </button>
  );
}

export default Menu;
