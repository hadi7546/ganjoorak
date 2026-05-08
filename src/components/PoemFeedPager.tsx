"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaLock, FaLockOpen } from "react-icons/fa";
import PoemViewer from "@/components/PoemViewer";
import type { Poem } from "@/types/poem";

const ZEN_STORAGE_KEY = "ganjoorak:zen-scroll-lock";
const STRONG_SWIPE_PX = 72;
const WHEEL_THRESHOLD_PX = 48;
const BOUNDARY_ARM_MS = 1500;
const NAVIGATION_COOLDOWN_MS = 650;
const EDGE_THRESHOLD_PX = 8;
const KEY_SCROLL_AMOUNT_PX = 110;
const TITLE_HIDE_SCROLL_TOP = 12;
const READING_CHROME_HIDE_MS = 850;
const CONTENT_TRANSITION_MS = 260;

type Direction = "next" | "previous";
type ContentTransition = "next" | "previous" | null;

interface PoemFeedPagerProps {
  poem: Poem;
  currentIndex: number;
  isFirst: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onOpenFeed?: () => void;
}

const isScrollable = (element: HTMLElement) => element.scrollHeight > element.clientHeight + 4;

const isAtTop = (element: HTMLElement) => element.scrollTop <= EDGE_THRESHOLD_PX;

const isAtBottom = (element: HTMLElement) =>
  element.scrollHeight - element.scrollTop - element.clientHeight <= EDGE_THRESHOLD_PX;

const getPoemText = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return null;
  return target.closest(".poem-text") as HTMLElement | null;
};

const getActivePoemText = (root: HTMLElement | null) =>
  root?.querySelector(".poem-text") as HTMLElement | null;

export default function PoemFeedPager({
  poem,
  currentIndex,
  isFirst,
  onNext,
  onPrevious,
  onOpenFeed,
}: PoemFeedPagerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef(0);
  const touchPoemTextRef = useRef<HTMLElement | null>(null);
  const touchStartedAtTopRef = useRef(false);
  const touchStartedAtBottomRef = useRef(false);
  const armedDirectionRef = useRef<Direction | null>(null);
  const armedUntilRef = useRef(0);
  const lastNavigationAtRef = useRef(0);
  const readingChromeTimeoutRef = useRef<number | null>(null);
  const previousIndexRef = useRef(currentIndex);
  const contentTransitionTimeoutRef = useRef<number | null>(null);
  const [isZenLocked, setIsZenLocked] = useState(false);
  const [contentTransition, setContentTransition] = useState<ContentTransition>(null);

  useEffect(() => {
    const previousIndex = previousIndexRef.current;
    previousIndexRef.current = currentIndex;

    if (previousIndex === currentIndex) return;

    setContentTransition(currentIndex > previousIndex ? "next" : "previous");

    if (contentTransitionTimeoutRef.current !== null) {
      window.clearTimeout(contentTransitionTimeoutRef.current);
    }

    contentTransitionTimeoutRef.current = window.setTimeout(() => {
      setContentTransition(null);
      contentTransitionTimeoutRef.current = null;
    }, CONTENT_TRANSITION_MS);
  }, [currentIndex]);

  useEffect(() => {
    setIsZenLocked(localStorage.getItem(ZEN_STORAGE_KEY) === "1");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("poem-zen-mode", isZenLocked);
    localStorage.setItem(ZEN_STORAGE_KEY, isZenLocked ? "1" : "0");
  }, [isZenLocked]);

  const resetArm = useCallback(() => {
    armedDirectionRef.current = null;
    armedUntilRef.current = 0;
    document.documentElement.classList.remove("poem-feed-boundary-armed");
  }, []);

  const arm = useCallback((direction: Direction) => {
    armedDirectionRef.current = direction;
    armedUntilRef.current = Date.now() + BOUNDARY_ARM_MS;
    document.documentElement.classList.add("poem-feed-boundary-armed");
  }, []);

  const updateTitleVisibility = useCallback((poemText: HTMLElement) => {
    const poemContent = poemText.closest(".poem-content");
    if (!poemContent) return;

    poemContent.classList.toggle(
      "poem-content--title-hidden",
      poemText.scrollTop > TITLE_HIDE_SCROLL_TOP,
    );
  }, []);

  const hideReadingChromeTemporarily = useCallback(() => {
    document.documentElement.classList.add("poem-feed-is-reading");

    if (readingChromeTimeoutRef.current !== null) {
      window.clearTimeout(readingChromeTimeoutRef.current);
    }

    readingChromeTimeoutRef.current = window.setTimeout(() => {
      document.documentElement.classList.remove("poem-feed-is-reading");
      readingChromeTimeoutRef.current = null;
    }, READING_CHROME_HIDE_MS);
  }, []);

  const canNavigate = useCallback(() => {
    const now = Date.now();
    if (now - lastNavigationAtRef.current < NAVIGATION_COOLDOWN_MS) {
      return false;
    }

    lastNavigationAtRef.current = now;
    return true;
  }, []);

  const navigate = useCallback((direction: Direction) => {
    if (isZenLocked || !canNavigate()) return;

    resetArm();

    if (direction === "next") {
      onNext();
      return;
    }

    if (!isFirst) {
      onPrevious();
    }
  }, [canNavigate, isFirst, isZenLocked, onNext, onPrevious, resetArm]);

  const requestBoundaryNavigation = useCallback((direction: Direction, isTouch: boolean) => {
    if (isZenLocked) return;

    const now = Date.now();
    const isSecondIntent = armedDirectionRef.current === direction && now <= armedUntilRef.current;

    if (isTouch && !isSecondIntent) {
      arm(direction);
      return;
    }

    navigate(direction);
  }, [arm, isZenLocked, navigate]);

  useEffect(() => {
    resetArm();
    document.documentElement.classList.remove("poem-feed-is-reading");

    const poemText = getActivePoemText(rootRef.current);
    if (poemText) {
      poemText.scrollTop = 0;
      updateTitleVisibility(poemText);
    }
  }, [poem.id, resetArm, updateTitleVisibility]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const stop = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    const handlePoemScroll = (event: Event) => {
      const poemText = getPoemText(event.target);
      if (!poemText) return;

      updateTitleVisibility(poemText);
      hideReadingChromeTemporarily();
    };

    const handleWheel = (event: WheelEvent) => {
      const poemText = getPoemText(event.target);
      if (!poemText) return;

      updateTitleVisibility(poemText);
      hideReadingChromeTemporarily();

      const deltaY = event.deltaY;
      if (Math.abs(deltaY) < WHEEL_THRESHOLD_PX) return;

      const canScrollInside = isScrollable(poemText);
      const shouldGoNext = deltaY > 0 && (!canScrollInside || isAtBottom(poemText));
      const shouldGoPrevious = deltaY < 0 && (!canScrollInside || isAtTop(poemText));

      if (!shouldGoNext && !shouldGoPrevious) {
        resetArm();
        return;
      }

      stop(event);
      requestBoundaryNavigation(shouldGoNext ? "next" : "previous", false);
    };

    const handleTouchStart = (event: TouchEvent) => {
      const poemText = getPoemText(event.target);
      const touch = event.touches[0];
      if (!poemText || !touch) return;

      updateTitleVisibility(poemText);
      hideReadingChromeTemporarily();
      touchPoemTextRef.current = poemText;
      touchStartYRef.current = touch.clientY;
      touchStartedAtTopRef.current = isAtTop(poemText);
      touchStartedAtBottomRef.current = isAtBottom(poemText);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const poemText = touchPoemTextRef.current;
      const touch = event.changedTouches[0];
      touchPoemTextRef.current = null;

      if (!poemText || !touch) return;

      updateTitleVisibility(poemText);
      hideReadingChromeTemporarily();
      const diff = touchStartYRef.current - touch.clientY;
      if (Math.abs(diff) < STRONG_SWIPE_PX) return;

      const canScrollInside = isScrollable(poemText);
      const shouldGoNext = diff > 0 && (!canScrollInside || (touchStartedAtBottomRef.current && isAtBottom(poemText)));
      const shouldGoPrevious = diff < 0 && (!canScrollInside || (touchStartedAtTopRef.current && isAtTop(poemText)));

      if (!shouldGoNext && !shouldGoPrevious) {
        resetArm();
        return;
      }

      stop(event);
      requestBoundaryNavigation(shouldGoNext ? "next" : "previous", true);
    };

    root.addEventListener("scroll", handlePoemScroll, { capture: true, passive: true });
    root.addEventListener("wheel", handleWheel, { capture: true, passive: false });
    root.addEventListener("touchstart", handleTouchStart, { capture: true, passive: true });
    root.addEventListener("touchend", handleTouchEnd, { capture: true, passive: false });

    return () => {
      root.removeEventListener("scroll", handlePoemScroll, true);
      root.removeEventListener("wheel", handleWheel, true);
      root.removeEventListener("touchstart", handleTouchStart, true);
      root.removeEventListener("touchend", handleTouchEnd, true);
    };
  }, [hideReadingChromeTemporarily, requestBoundaryNavigation, resetArm, updateTitleVisibility]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.altKey || event.metaKey || event.ctrlKey) return;
      if (event.code !== "ArrowDown" && event.code !== "ArrowUp") return;

      const target = event.target as Element | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) {
        return;
      }

      const poemText = getActivePoemText(rootRef.current);
      if (!poemText) return;

      updateTitleVisibility(poemText);
      hideReadingChromeTemporarily();
      const direction: Direction = event.code === "ArrowDown" ? "next" : "previous";
      const canScrollInside = isScrollable(poemText);
      const shouldNavigate = direction === "next"
        ? !canScrollInside || isAtBottom(poemText)
        : !canScrollInside || isAtTop(poemText);

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (!shouldNavigate) {
        poemText.scrollBy({
          top: direction === "next" ? KEY_SCROLL_AMOUNT_PX : -KEY_SCROLL_AMOUNT_PX,
          behavior: "smooth",
        });
        resetArm();
        return;
      }

      requestBoundaryNavigation(direction, false);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [hideReadingChromeTemporarily, requestBoundaryNavigation, resetArm, updateTitleVisibility]);

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove("poem-feed-is-reading");
      if (readingChromeTimeoutRef.current !== null) {
        window.clearTimeout(readingChromeTimeoutRef.current);
      }
      if (contentTransitionTimeoutRef.current !== null) {
        window.clearTimeout(contentTransitionTimeoutRef.current);
      }
    };
  }, []);

  const transitionClassName = contentTransition
    ? ` poem-feed-viewer--transition-${contentTransition}`
    : "";

  return (
    <div ref={rootRef} className="poem-feed-pager">
      <style>{`
        .poem-feed-pager {
          position: fixed;
          inset: 0;
          overflow: hidden;
          background: rgb(var(--background));
          touch-action: pan-y;
          isolation: isolate;
        }

        .poem-feed-viewer {
          position: absolute;
          inset: 0;
          background: rgb(var(--background));
        }

        .poem-feed-viewer .poem-viewer {
          background: rgb(var(--background));
        }

        .poem-feed-viewer .poem-text {
          scrollbar-width: thin;
          scrollbar-color: rgb(var(--foreground) / 0.24) transparent;
          scrollbar-gutter: stable;
        }

        .poem-feed-viewer .poem-text::-webkit-scrollbar {
          width: 0.45rem;
        }

        .poem-feed-viewer .poem-text::-webkit-scrollbar-track {
          background: transparent;
        }

        .poem-feed-viewer .poem-text::-webkit-scrollbar-thumb {
          min-height: 3rem;
          border: 2px solid transparent;
          border-radius: 999px;
          background-clip: padding-box;
          background-color: rgb(var(--foreground) / 0.22);
        }

        .poem-feed-viewer .poem-text::-webkit-scrollbar-thumb:hover {
          background-color: rgb(var(--foreground) / 0.34);
        }

        .poem-feed-viewer--transition-next .poem-content,
        .poem-feed-viewer--transition-previous .poem-content {
          will-change: transform, opacity;
          animation-duration: ${CONTENT_TRANSITION_MS}ms;
          animation-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1);
          animation-fill-mode: both;
        }

        .poem-feed-viewer--transition-next .poem-content {
          animation-name: poem-feed-content-in-next;
        }

        .poem-feed-viewer--transition-previous .poem-content {
          animation-name: poem-feed-content-in-previous;
        }

        @keyframes poem-feed-content-in-next {
          from {
            opacity: 0.92;
            transform: translate3d(0, 1.1rem, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes poem-feed-content-in-previous {
          from {
            opacity: 0.92;
            transform: translate3d(0, -1.1rem, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        .poem-feed-lock-button {
          position: fixed;
          top: 7rem;
          right: 1rem;
          z-index: 1000;
          width: 2.5rem;
          height: 2.5rem;
          border: none;
          border-radius: 999px;
          background-color: rgba(255, 255, 255, 0.1);
          color: rgb(var(--foreground));
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .poem-feed-lock-button:hover {
          background-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .poem-feed-lock-button.is-active {
          background: rgb(var(--accent) / 0.86);
          color: rgb(var(--accent-foreground));
          box-shadow: 0 0 0 1px rgb(var(--accent) / 0.35), 0 4px 12px rgba(0, 0, 0, 0.24);
        }

        .poem-feed-lock-button svg {
          width: 1rem;
          height: 1rem;
        }

        .poem-zen-mode .navigation-controls,
        .poem-zen-mode .action-buttons,
        .poem-zen-mode .global-search-button,
        .poem-zen-mode .menu-button {
          opacity: 0 !important;
          pointer-events: none !important;
        }

        .poem-feed-boundary-armed .navigation-controls {
          opacity: 0.72 !important;
        }

        @media (prefers-reduced-motion: reduce) {
          .poem-feed-viewer--transition-next .poem-content,
          .poem-feed-viewer--transition-previous .poem-content {
            animation: none;
          }
        }

        @media (max-width: 768px) {
          .poem-feed-pager .navigation-controls,
          .poem-feed-pager .action-buttons {
            transition: opacity 0.2s ease;
          }

          .poem-feed-pager .poem-text {
            padding-top: 10.75rem !important;
          }

          .poem-feed-pager .poem-content--centered .poem-text {
            padding-top: 10.75rem !important;
          }

          .poem-feed-pager .poem-content--title-hidden .poem-text,
          .poem-feed-pager .poem-content--centered.poem-content--title-hidden .poem-text {
            padding-top: 4.25rem !important;
          }

          .poem-feed-pager .title-section {
            max-height: 9.75rem;
            overflow: hidden;
          }

          .poem-feed-viewer .poem-text {
            scrollbar-width: thin;
            scrollbar-color: rgb(var(--foreground) / 0.28) transparent;
          }

          .poem-feed-viewer .poem-text::-webkit-scrollbar {
            width: 0.35rem;
          }

          .poem-feed-lock-button {
            top: 7rem;
            right: 1rem;
            width: 2.5rem;
            height: 2.5rem;
          }
        }

        @media (max-width: 480px) {
          .poem-feed-pager .poem-text,
          .poem-feed-pager .poem-content--centered .poem-text {
            padding-top: 10rem !important;
          }

          .poem-feed-pager .poem-content--title-hidden .poem-text,
          .poem-feed-pager .poem-content--centered.poem-content--title-hidden .poem-text {
            padding-top: 4rem !important;
          }

          .poem-feed-pager .title-section {
            max-height: 9rem;
          }
        }
      `}</style>
      <div className={`poem-feed-viewer${transitionClassName}`}>
        <PoemViewer
          poem={poem}
          onNext={() => requestBoundaryNavigation("next", false)}
          onPrevious={() => requestBoundaryNavigation("previous", false)}
          isFirst={true}
          isLast={true}
          isModern={poem.source !== "ganjoor"}
          onOpenFeed={onOpenFeed}
        />
      </div>
      <button
        type="button"
        className={`poem-feed-lock-button${isZenLocked ? " is-active" : ""}`}
        onClick={() => setIsZenLocked((value) => !value)}
        aria-pressed={isZenLocked}
        aria-label={isZenLocked ? "باز کردن اسکرول شعر بعدی" : "قفل کردن اسکرول روی همین شعر"}
        title={isZenLocked ? "قفل اسکرول روشن است" : "قفل اسکرول روی همین شعر"}
      >
        {isZenLocked ? <FaLock aria-hidden="true" /> : <FaLockOpen aria-hidden="true" />}
      </button>
    </div>
  );
}
