'use client';

import Link from 'next/link';
import { useState, useEffect, type ReactNode } from 'react';
import { Century, Poet } from '@/types/poet';
import PoetImage from '@/components/PoetImage';
import LoadingScreen from '@/components/LoadingScreen';
import Menu, { MenuButton } from '@/components/Menu';
import SettingsDialog from '@/components/SettingsDialog';
import { useUpdateNotification } from '@/hooks/useUpdateNotification';
import AccordionItem from '@/components/AccordionItem';
import '@/styles/Poets.css';

function PoetsList({ poets }: { poets: Poet[] }) {
    const publishedPoets = poets.filter(poet => poet.published);

    if (publishedPoets.length === 0) {
        return null;
    }

    return (
        <div className="poets-grid">
            {publishedPoets.map((poet) => (
                <Link
                    href={`/${poet.fullUrl}`}
                    key={poet.id}
                    className="poet-card"
                >
                    <div className="poet-image-container">
                        <PoetImage
                            imgUrl={poet.imageUrl}
                            alt={poet.name}
                            poetSlug={poet.urlSlug}
                            width={60}
                            height={60}
                        />
                    </div>
                    <h2 className="poet-name">{poet.nickname || poet.name}</h2>
                    {poet.nickname && (
                        <p className="poet-nickname">{poet.name}</p>
                    )}
                </Link>
            ))}
        </div>
    );
}

function CenturySection({ century, title, defaultOpen = false }: { century: Century; title?: string; defaultOpen?: boolean; }) {
    if (!century.poets.some(poet => poet.published)) {
        return null;
    }

    return (
        <AccordionItem
            title={title || century.name}
            defaultOpen={defaultOpen}
            containerClassName="century-section"
            questionClassName="poets-question"
            answerClassName="poets-answer"
            titleTag="h3"
        >
            <PoetsList poets={century.poets} />
        </AccordionItem>
    );
}

function CategorySection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: ReactNode; }) {
    return (
        <AccordionItem
            title={title}
            defaultOpen={defaultOpen}
            containerClassName="category-section"
            questionClassName="poets-question"
            answerClassName="poets-category-answer"
            titleTag="h2"
        >
            <div className="category-content">
                {children}
            </div>
        </AccordionItem>
    );
}

export default function PoetsContent({ centuries, customPoets = [] }: { centuries: Century[]; customPoets?: Poet[]; }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { hasNewUpdates, markAsRead } = useUpdateNotification();

    const featuredCentury = centuries.find(c => c.id === 0);
    const otherCenturies = centuries.filter(c => c.id !== 0);
    const hasCustomPoets = customPoets.some(poet => poet.published);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 300);

        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <>
            <MenuButton onClick={() => setIsMenuOpen(!isMenuOpen)} hasNotification={hasNewUpdates} />
            <Menu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                hasNewUpdates={hasNewUpdates}
                onUpdatesViewed={markAsRead}
                onOpenSettings={() => {
                    setIsSettingsOpen(true);
                    setIsMenuOpen(false);
                }}
            />
            <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            {featuredCentury && (
                <CenturySection
                    century={featuredCentury}
                    title="شاعران محبوب"
                    defaultOpen
                />
            )}

            <CategorySection title="شاعران معاصر">
                {hasCustomPoets ? (
                    <PoetsList poets={customPoets} />
                ) : (
                    <p className="poets-empty">به زودی...</p>
                )}
            </CategorySection>

            <CategorySection title="شاعران کهن">
                {otherCenturies.length > 0 ? (
                    otherCenturies.map((century) => (
                        <CenturySection
                            key={century.id}
                            century={century}
                        />
                    ))
                ) : (
                    <p className="poets-empty">در حال بارگیری...</p>
                )}
            </CategorySection>
        </>
    );
}
