'use client';

import { useEffect } from 'react';

export default function Template({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const updateTitleVisibility = (poemText: Element) => {
            const poemContent = poemText.closest('.poem-content');
            if (!poemContent) return;

            const scrollTop = (poemText as HTMLElement).scrollTop;
            poemContent.classList.toggle('poem-content--title-hidden', scrollTop > 12);
        };

        const handleScroll = (event: Event) => {
            const target = event.target;
            if (!(target instanceof Element) || !target.classList.contains('poem-text')) {
                return;
            }

            updateTitleVisibility(target);
        };

        const resetTitleVisibility = () => {
            document.querySelectorAll('.poem-text').forEach(updateTitleVisibility);
        };

        document.addEventListener('scroll', handleScroll, true);
        resetTitleVisibility();

        return () => {
            document.removeEventListener('scroll', handleScroll, true);
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
