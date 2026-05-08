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
                    top: 7rem;
                    right: 1rem;
                    z-index: 12;
                    width: 2.5rem;
                    height: 2.5rem;
                    border: none;
                    border-radius: 999px;
                    background-color: rgb(var(--foreground) / 0.1);
                    color: rgb(var(--foreground));
                    -webkit-backdrop-filter: blur(8px);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0;
                    cursor: pointer;
                    transition:
                        transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1),
                        background-color 0.22s ease,
                        box-shadow 0.28s ease,
                        opacity 0.25s ease;
                }

                .zen-lock-button:hover {
                    background-color: rgb(var(--foreground) / 0.2);
                    transform: translateY(-1px) scale(1.02);
                    box-shadow: 0 6px 16px rgb(var(--background) / 0.22);
                }

                .zen-lock-button--active {
                    background: rgb(var(--accent) / 0.86);
                    color: rgb(var(--accent-foreground));
                    box-shadow: 0 0 0 1px rgb(var(--accent) / 0.35), 0 8px 20px rgb(var(--background) / 0.28);
                }

                .zen-lock-button__icon {
                    font-size: 1rem;
                    line-height: 1;
                }

                .poem-zen-mode .menu-button,
                .poem-zen-mode .global-search-button,
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

                @media (max-width: 768px) {
                    .poem-text {
                        padding-top: 10.5rem !important;
                    }

                    .poem-content.poem-content--centered .poem-text {
                        padding-top: 10.5rem !important;
                    }

                    .title-section {
                        max-height: 9.5rem;
                        overflow: hidden;
                    }
                }

                @media (max-width: 480px) {
                    .poem-text {
                        padding-top: 9.75rem !important;
                    }

                    .poem-content.poem-content--centered .poem-text {
                        padding-top: 9.75rem !important;
                    }

                    .zen-lock-button {
                        top: 6.75rem;
                        right: 1rem;
                        width: 2.5rem;
                        height: 2.5rem;
                    }

                    .title-section {
                        max-height: 8.75rem;
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
                title={isZenLocked ? 'قفل اسکرول روشن است' : 'قفل اسکرول روی همین شعر'}
            >
                <span className="zen-lock-button__icon" aria-hidden="true">
                    {isZenLocked ? '🔒' : '🔓'}
                </span>
            </button>
        </>
    );
}
