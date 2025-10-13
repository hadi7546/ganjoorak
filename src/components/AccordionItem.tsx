'use client';

import { useState, useRef, useEffect, useMemo, useId, type ReactNode } from 'react';
import { HiChevronDown } from 'react-icons/hi2';
import '@/styles/FAQ.css';

interface AccordionItemProps {
    title: ReactNode;
    children: ReactNode;
    defaultOpen?: boolean;
    containerClassName?: string;
    questionClassName?: string;
    answerClassName?: string;
    titleTag?: keyof JSX.IntrinsicElements;
    onToggle?: (isOpen: boolean) => void;
}

const AccordionItem = ({
    title,
    children,
    defaultOpen = false,
    containerClassName,
    questionClassName,
    answerClassName,
    titleTag = 'h3',
    onToggle
}: AccordionItemProps) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const contentRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0);
    const contentId = useId();

    const TitleTag = useMemo(() => titleTag, [titleTag]);

    const toggle = () => {
        setIsOpen(prev => {
            const next = !prev;
            onToggle?.(next);
            return next;
        });
    };

    useEffect(() => {
        const contentEl = contentRef.current;
        if (!contentEl) return;

        if (isOpen) {
            const updateHeight = () => {
                if (!contentRef.current) return;
                const contentHeight = contentRef.current.scrollHeight;
                setHeight(contentHeight);
            };

            updateHeight();

            const timer = window.setTimeout(updateHeight, 100);
            let resizeObserver: ResizeObserver | null = null;

            if (typeof ResizeObserver !== 'undefined') {
                resizeObserver = new ResizeObserver(updateHeight);
                resizeObserver.observe(contentEl);
            }

            return () => {
                window.clearTimeout(timer);
                resizeObserver?.disconnect();
            };
        } else {
            setHeight(0);
        }
    }, [isOpen, children]);

    return (
        <div
            className={[
                'faq-item',
                containerClassName,
                isOpen ? 'open' : ''
            ].filter(Boolean).join(' ')}
        >
            <button
                className={[
                    'faq-question',
                    questionClassName
                ].filter(Boolean).join(' ')}
                type="button"
                onClick={toggle}
                aria-expanded={isOpen}
                aria-controls={contentId}
            >
                <TitleTag>{title}</TitleTag>
                <HiChevronDown className="faq-arrow" />
            </button>
            <div
                className={[
                    'faq-answer-wrapper',
                    isOpen ? 'open' : ''
                ].filter(Boolean).join(' ')}
                style={{ height: height === undefined ? 'auto' : `${height}px` }}
                id={contentId}
                aria-hidden={!isOpen}
            >
                <div
                    ref={contentRef}
                    className={[
                        'faq-answer',
                        answerClassName,
                        isOpen ? 'open' : ''
                    ].filter(Boolean).join(' ')}
                >
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AccordionItem;
