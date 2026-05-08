'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';

type BoundaryDirection = 'next' | 'previous';

const TITLE_HIDE_SCROLL_TOP = 12;
const BOUNDARY_SCROLL_RESET_MS = 900;
const BOUNDARY_SCROLL_DELAY_MS = 850;
const BOUNDARY_SCROLL_DELTA = 180;

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

        const boundaryState: {
            element: HTMLElement | null;
            direction: BoundaryDirection | null;
            startedAt: number;
            lastAt: number;
            delta: number;
        } = {
            element: null,
            direction: null,
            startedAt: 0,
            lastAt: 0,
            delta: 0,
        };

        const resetBoundaryState = () => {
            boundaryState.element = null;
            boundaryState.direction = null;
            boundaryState.startedAt = 0;
            boundaryState.lastAt = 0;
            boundaryState.delta = 0;
        };

        const canLeaveBoundary = (
            element: HTMLElement,
            direction: BoundaryDirection,
            delta: number,
        ) => {
            const now = Date.now();
            const isNewGesture =
                boundaryState.element !== element ||
                boundaryState.direction !== direction ||
                now - boundaryState.lastAt > BOUNDARY_SCROLL_RESET_MS;

            if (isNewGesture) {
                boundaryState.element = element;
                boundaryState.direction = direction;
                boundaryState.startedAt = now;
                boundaryState.delta = 0;
            }

            boundaryState.lastAt = now;
            boundaryState.delta += Math.abs(delta);

            const waitedLongEnough = now - boundaryState.startedAt >= BOUNDARY_SCROLL_DELAY_MS;
            const pushedEnough = boundaryState.delta >= BOUNDARY_SCROLL_DELTA;

            if (waitedLongEnough && pushedEnough) {
                resetBoundaryState();
                return true;
            }

            return false;
        };

        const blockBoundaryNavigation = (event: Event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
        };

        const handleScroll = (event: Event) => {
            const poemText = getPoemTextFromEvent(event);
            if (!poemText) return;

            updateTitleVisibility(poemText);

            if (!isAtTop(poemText) && !isAtBottom(poemText)) {
                resetBoundaryState();
            }
        };

        const handleWheel = (event: WheelEvent) => {
            const poemText = getPoemTextFromEvent(event);
            if (!poemText) return;

            updateTitleVisibility(poemText);

            const deltaY = event.deltaY;
            const direction =
                deltaY > 0 && isAtBottom(poemText)
                    ? 'next'
                    : deltaY < 0 && isAtTop(poemText)
                        ? 'previous'
                        : null;

            if (!direction) {
                resetBoundaryState();
                return;
            }

            if (!canLeaveBoundary(poemText, direction, deltaY)) {
                blockBoundaryNavigation(event);
            }
        };

        let touchStartY = 0;
        let touchStartTime = 0;
        let touchPoemText: HTMLElement | null = null;
        let touchStartedAtTop = false;
        let touchStartedAtBottom = false;

        const handleTouchStart = (event: TouchEvent) => {
            const poemText = getPoemTextFromEvent(event);
            if (!poemText) return;

            const touch = event.touches[0];
            if (!touch) return;

            touchPoemText = poemText;
            touchStartY = touch.clientY;
            touchStartTime = Date.now();
            touchStartedAtTop = isAtTop(poemText);
            touchStartedAtBottom = isAtBottom(poemText);
            updateTitleVisibility(poemText);
        };

        const handleTouchEnd = (event: TouchEvent) => {
            if (!touchPoemText) return;

            const touch = event.changedTouches[0];
            if (!touch) return;

            const diff = touchStartY - touch.clientY;
            const direction =
                diff > 0 && touchStartedAtBottom && isAtBottom(touchPoemText)
                    ? 'next'
                    : diff < 0 && touchStartedAtTop && isAtTop(touchPoemText)
                        ? 'previous'
                        : null;

            updateTitleVisibility(touchPoemText);

            if (!direction) {
                resetBoundaryState();
                touchPoemText = null;
                return;
            }

            const gestureDuration = Date.now() - touchStartTime;
            const effectiveDelta = Math.abs(diff) + Math.min(gestureDuration / 2, 120);

            if (!canLeaveBoundary(touchPoemText, direction, effectiveDelta)) {
                blockBoundaryNavigation(event);
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
                .poem-content.poem-content--title-hidden .poem-text {
                    padding-top: clamp(2rem, 6vw, 4rem);
                }

                @media (max-width: 768px) {
                    .poem-content.poem-content--title-hidden .poem-text {
                        padding-top: 2.5rem;
                    }
                }

                @media (max-width: 480px) {
                    .poem-content.poem-content--title-hidden .poem-text {
                        padding-top: 2rem;
                    }
                }
            `}</style>
            {children}
        </>
    );
}
