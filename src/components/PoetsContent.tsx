'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { Century, Poet } from '@/types/poet';
import PoetImage from '@/components/PoetImage';
import LoadingScreen from '@/components/LoadingScreen';

function CenturySection({ century, title }: { century: Century; title?: string }) {
    const [isOpen, setIsOpen] = useState(century.id === 0);
    const gridRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | undefined>(
        century.id === 0 ? undefined : 0
    );

    useEffect(() => {
        if (!gridRef.current) return;

        if (isOpen) {
            const height = gridRef.current.scrollHeight;
            setHeight(height);
        } else {
            setHeight(0);
        }
    }, [isOpen]);

    useEffect(() => {
        if (century.id === 0 && gridRef.current) {
            setHeight(gridRef.current.scrollHeight);
        }
    }, [century.id]);

    if (century.poets.length === 0) return null;

    return (
        <div className="century-section">
            <button
                className="century-title-button"
                onClick={() => setIsOpen(!isOpen)}
                type="button"
            >
                <h2 className="century-title">
                    {title || century.name}
                    <span className={`arrow ${isOpen ? 'open' : ''}`}>▼</span>
                </h2>
            </button>
            <div
                className={`poets-grid-container ${isOpen ? 'open' : ''}`}
                style={{ height: height === undefined ? 'auto' : `${height}px` }}
            >
                <div className="poets-grid" ref={gridRef}>
                    {century.poets
                        .filter(poet => poet.published)
                        .map((poet) => (
                            <Link
                                href={`/${poet.fullUrl}`}
                                key={poet.id}
                                className="poet-card"
                            >
                                <div className="poet-image-container">
                                    <PoetImage
                                        poetSlug={poet.fullUrl}
                                        alt={poet.name}
                                    />
                                </div>
                                {poet.nickname && (
                                    <h2 className="poet-name">{poet.nickname}</h2>
                                )}
                                <p className="poet-nickname">{poet.name}</p>
                            </Link>
                        ))}
                </div>
            </div>
        </div>
    );
}

function CategorySection({ title, children, isOpen: initialIsOpen = false }: { title: string; children: React.ReactNode; isOpen?: boolean }) {
    const [isOpen, setIsOpen] = useState(initialIsOpen);
    const contentRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | undefined>(undefined);

    useEffect(() => {
        if (!contentRef.current) return;

        if (isOpen) {
            const height = contentRef.current.scrollHeight;
            setHeight(height);
        } else {
            setHeight(0);
        }
    }, [isOpen]);

    return (
        <div className="category-section">
            <button
                className="century-title-button"
                onClick={() => setIsOpen(!isOpen)}
                type="button"
            >
                <h2 className="category-title">
                    {title}
                    <span className={`arrow ${isOpen ? 'open' : ''}`}>▼</span>
                </h2>
            </button>
            <div
                className={`poets-grid-container ${isOpen ? 'open' : ''}`}
                style={{ height: height === undefined ? 'auto' : `${height}px` }}
            >
                <div ref={contentRef}>
                    {children}
                </div>
            </div>
        </div>
    );
}

export default function PoetsContent({ centuries }: { centuries: Century[] }) {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate loading for at least 500ms for better UX
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return <LoadingScreen />;
    }

    // Get featured poets (century with id=0)
    const featuredCentury = centuries.find(c => c.id === 0);
    // Get all other centuries
    const otherCenturies = centuries.filter(c => c.id !== 0);

    return (
        <>
            {/* Featured Poets Section */}
            {featuredCentury && (
                <CenturySection
                    century={featuredCentury}
                    title="شاعران محبوب"
                />
            )}

            {/* Classical Poets Section */}
            <CategorySection title="شاعران کهن" isOpen={false}>
                {/* Other Centuries */}
                {otherCenturies.map((century) => (
                    <CenturySection
                        key={century.id}
                        century={century}
                    />
                ))}
            </CategorySection>

            {/* Contemporary Poets Section (Empty for now) */}
            <CategorySection title="شاعران معاصر" isOpen={false}>
                <div className="century-section">
                    <div className="century-title-button">
                        <h2 className="century-title">
                            به زودی...
                        </h2>
                    </div>
                </div>
            </CategorySection>
        </>
    );
} 