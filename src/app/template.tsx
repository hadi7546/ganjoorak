'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

const TITLE_HIDE_SCROLL_TOP = 12;
const ZEN_STORAGE_KEY = 'ganjoorak:zen-scroll-lock';

const getPoemTextFromEvent = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return null;
    return target.closest('.poem-text') as HTMLElement | null;
};

const isAtTop = (element: HTMLElement) => element.scrollTop <= 2;

const isAtBottom = (element: HTMLElement) => (
    element.scrollHeight - element.scrollTop - element.clientHeight <= 2
);

export default function Template({ children }: { children: ReactNode }) {
    const [isZenLocked, setIsZenLocked] = useState(false);

    useEffect(() => {
        setIsZenLocked(localStorage.getItem(ZEN_STORAGE_KEY) === '1');
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('poem-zen-mode', isZenLocked);
        localStorage.setItem(ZEN_STORAGE_KEY, isZenLocked ? '1' : '0');
    }, [isZenLocked]);

    useEffect(() => {
        const updateTitleVisibility = (poemText: Element) => {
            const poemContent = poemText.closest('.poem-content');
            if (!poemContent) return;

            const scrollTop = (poemText as HTMLElement).scrollTop;
            poemContent.classList.toggle(
                'poem-content--title-hidden',
                scrollTop > TITLE_HIDE_SCROLL_TOP,
            );
        };

        const resetTitleVisibility = () => {
            document.querySelectorAll('.poem-text').forEach(updateTitleVisibility);
        };

        const handleScroll = (event: Event) => {
            const poemText = getPoemTextFromEvent(event);
            if (!poemText) return;

            updateTitleVisibility(poemText);
        };

        const stopBoundaryNavigation = (event: Event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
        };

        const handleWheel = (event: WheelEvent) => {
            if (!document.documentElement.classList.contains('poem-zen-mode')) {
                return;
            }

            const poemText = getPoemTextFromEvent(event);
            if (!poemText) return;

            const isLeavingDown = event.deltaY > 0 && isAtBottom(poemText);
            const isLeavingUp = event.deltaY < 0 && isAtTop(poemText);

            if (isLeavingDown || isLeavingUp) {
                stopBoundaryNavigation(event);
            }
        };

        let touchStartY = 0;
        let touchPoemText: HTMLElement | null = null;
        let touchStartedAtTop = false;
        let touchStartedAtBottom = false;

        const handleTouchStart = (event: TouchEvent) => {
            if (!document.documentElement.classList.contains('poem-zen-mode')) {
                return;
            }

            const poemText = getPoemTextFromEvent(event);
            const touch = event.touches[0];
            if (!poemText || !touch) return;

            touchPoemText = poemText;
            touchStartY = touch.clientY;
            touchStartedAtTop = isAtTop(poemText);
            touchStartedAtBottom = isAtBottom(poemText);
        };

        const handleTouchEnd = (event: TouchEvent) => {
            if (!document.documentElement.classList.contains('poem-zen-mode') || !touchPoemText) {
                touchPoemText = null;
                return;
            }

            const touch = event.changedTouches[0];
            if (!touch) {
                touchPoemText = null;
                return;
            }

            const diff = touchStartY - touch.clientY;
            const isLeavingDown = diff > 0 && touchStartedAtBottom && isAtBottom(touchPoemText);
            const isLeavingUp = diff < 0 && touchStartedAtTop && isAtTop(touchPoemText);

            if (isLeavingDown || isLeavingUp) {
                stopBoundaryNavigation(event);
            }

            touchPoemText = null;
        };

        let pendingResetFrame: number | null = null;
        const scheduleResetTitleVisibility = () => {
            if (pendingResetFrame !== null) return;

            pendingResetFrame = window.requestAnimationFrame(() => {
                pendingResetFrame = null;
                resetTitleVisibility();
            });
        };

        const observer = new MutationObserver(scheduleResetTitleVisibility);

        document.addEventListener('scroll', handleScroll, true);
        document.addEventListener('wheel', handleWheel, { capture: true, passive: false });
        document.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
        document.addEventListener('touchend', handleTouchEnd, { capture: true, passive: false });
        observer.observe(document.body, { childList: true, subtree: true });
        resetTitleVisibility();

        return () => {
            document.removeEventListener('scroll', handleScroll, true);
            document.removeEventListener('wheel', handleWheel, true);
            document.removeEventListener('touchstart', handleTouchStart, true);
            document.removeEventListener('touchend', handleTouchEnd, true);
            observer.disconnect();

            if (pendingResetFrame !== null) {
                window.cancelAnimationFrame(pendingResetFrame);
            }
        };
    }, []);

    return (
        <>
            <style>{`
                .zen-lock-button {
                    position: fixed;
                    left: 1rem;
                    bottom: 1rem;
                    z-index: 1300;
                    min-width: 3.25rem;
                    height: 3.25rem;
                    border: 1px solid rgb(var(--foreground) / 0.14);
                    border-radius: 999px;
                    background: rgb(var(--background) / 0.72);
                    color: rgb(var(--foreground) / 0.82);
                    -webkit-backdrop-filter: blur(18px);
                    backdrop-filter: blur(18px);
                    box-shadow: 0 16px 42px rgb(0 0 0 / 0.28);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.45rem;
                    padding: 0 1rem;
                    font: inherit;
                    font-size: 0.88rem;
                    cursor: pointer;
                    transition:
                        background-color 0.18s ease,
                        border-color 0.18s ease,
                        color 0.18s ease,
                        opacity 0.18s ease,
                        transform 0.18s ease;
                }

                .zen-lock-button:hover {
                    transform: translateY(-1px);
                    background: rgb(var(--foreground) / 0.08);
                    border-color: rgb(var(--foreground) / 0.24);
                }

                .zen-lock-button--active {
                    background: rgb(var(--accent) / 0.86);
                    border-color: rgb(var(--accent));
                    color: rgb(var(--accent-foreground));
                }

                .zen-lock-button__icon {
                    font-size: 1rem;
                    line-height: 1;
                }

                .poem-zen-mode .menu-button,
                .poem-zen-mode .search-button,
                .poem-zen-mode .navigation-controls,
                .poem-zen-mode .poem-navigation,
                .poem-zen-mode .action-buttons,
                .poem-zen-mode .poem-actions {
                    opacity: 0 !important;
                    pointer-events: none !important;
                }

                .poem-zen-mode .poem-viewer {
                    background:
                        radial-gradient(circle at 50% 18%, rgb(var(--foreground) / 0.06), transparent 34rem),
                        rgb(var(--background));
                }

                @media (max-width: 640px) {
                    .zen-lock-button {
                        left: 0.85rem;
                        bottom: 0.85rem;
                        min-width: 3rem;
                        height: 3rem;
                        padding: 0 0.82rem;
                        font-size: 0.78rem;
                    }

                    .zen-lock-button__label {
                        display: none;
                    }
                }
            `}</style>
            {children}
            <button
                type="button"
                className={`zen-lock-button${isZenLocked ? ' zen-lock-button--active' : ''}`}
                onClick={() => setIsZenLocked((value) => !value)}
                aria-pressed={isZenLocked}
                aria-label={isZenLocked ? 'باز کردن اسکرول شعر بعدی' : 'قفل کردن اسکرول روی همین شعر'}
                title={isZenLocked ? 'Zen روشن است؛ اسکرول روی همین شعر قفل شده' : 'Zen: تمرکز روی همین شعر'}
            >
                <span className="zen-lock-button__icon" aria-hidden="true">
                    {isZenLocked ? '🔒' : '🧘'}
                </span>
                <span className="zen-lock-button__label">
                    {isZenLocked ? 'قفل' : 'Zen'}
                </span>
            </button>
        </>
    );
}
