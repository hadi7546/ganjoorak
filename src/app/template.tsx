'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';

const TITLE_HIDE_SCROLL_TOP = 12;

const getPoemTextFromEvent = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return null;
    return target.closest('.poem-text') as HTMLElement | null;
};

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

        const handleScroll = (event: Event) => {
            const poemText = getPoemTextFromEvent(event);
            if (!poemText) return;

            updateTitleVisibility(poemText);
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
        observer.observe(document.body, { childList: true, subtree: true });
        resetTitleVisibility();

        return () => {
            document.removeEventListener('scroll', handleScroll, true);
            observer.disconnect();

            if (pendingResetFrame !== null) {
                window.cancelAnimationFrame(pendingResetFrame);
            }
        };
    }, []);

    return <>{children}</>;
}
