'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { Century, Poet } from '@/types/poet';
import PoetImage from '@/components/PoetImage';
import LoadingScreen from '@/components/LoadingScreen';
import { motion } from 'framer-motion';
import Menu, { MenuButton } from '@/components/Menu';

function CenturySection({ century, title }: { century: Century; title?: string }) {
    const [isOpen, setIsOpen] = useState(century.id === 0);

    const gridRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | undefined>(
        century.id === 0 ? undefined : 0
    );

    useEffect(() => {
        if (!gridRef.current) return;

        if (isOpen) {
            // Use setTimeout to ensure full content is measured
            const updateHeight = () => {
                if (gridRef.current) {
                    const height = gridRef.current.scrollHeight;
                    setHeight(height);
                }
            };

            // Initial calculation
            updateHeight();

            // Second calculation after a slight delay to catch any dynamic content
            const timer = setTimeout(updateHeight, 50);

            return () => clearTimeout(timer);
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
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="century-section">

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
                style={{
                    height: height === undefined ? 'auto' : `${height}px`,
                    overflow: isOpen ? 'visible' : 'hidden'
                }}
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
            </div>
        </motion.div>
    );
}

function CategorySection({ title, children, isOpen: initialIsOpen = false }: { title: string; children: React.ReactNode; isOpen?: boolean }) {
    const [isOpen, setIsOpen] = useState(initialIsOpen);
    const contentRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | undefined>(undefined);

    // Recalculate height when the section is opened
    useEffect(() => {
        if (!contentRef.current) return;

        if (isOpen) {
            // Use setTimeout to ensure all children elements are rendered
            // before calculating the height
            const updateHeight = () => {
                if (contentRef.current) {
                    const newHeight = contentRef.current.scrollHeight;
                    setHeight(newHeight);

                    // Set a safe maximum height for mobile devices
                    if (window.innerWidth <= 480) {
                        // Add extra space for mobile to ensure everything is visible
                        setHeight(newHeight + 100);
                    }
                }
            };

            // Initial update
            updateHeight();

            // Additional update after a short delay to capture any dynamic content
            const timer = setTimeout(updateHeight, 50);

            // Set up a resize observer to handle content changes
            const resizeObserver = new ResizeObserver(() => {
                if (isOpen && contentRef.current) {
                    updateHeight();
                }
            });

            if (contentRef.current) {
                resizeObserver.observe(contentRef.current);
            }

            return () => {
                clearTimeout(timer);
                resizeObserver.disconnect();
            };
        } else {
            setHeight(0);
        }
    }, [isOpen]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="category-section">
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
                style={{
                    height: height === undefined ? 'auto' : `${height}px`,
                    overflow: isOpen ? 'visible' : 'hidden'
                }}
            >
                <div ref={contentRef}>
                    {children}
                </div>
            </div>
        </motion.div>
    );
}

// Component to display a list of poets
function PoetsList({ poets }: { poets: Poet[] }) {
    if (poets.length === 0) return null;

    return (
        <div className="poets-grid">
            {poets
                .filter(poet => poet.published)
                .map((poet) => (
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

export default function PoetsContent({ centuries, customPoets = [] }: { centuries: Century[], customPoets?: Poet[] }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Extract featured century (century 0) and other centuries
    const featuredCentury = centuries.find(c => c.id === 0);
    const otherCenturies = centuries.filter(c => c.id !== 0);

    // Determine if there are any custom poets to display
    const hasCustomPoets = customPoets && customPoets.length > 0;

    // Show loading state briefly for smooth transition
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
            <MenuButton onClick={() => setIsMenuOpen(!isMenuOpen)} />
            <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            {/* Featured Poets Section */}
            {featuredCentury && (
                <CenturySection
                    century={featuredCentury}
                    title="شاعران محبوب"
                />
            )}

            {/* Contemporary Poets Section */}
            <CategorySection title="شاعران معاصر" isOpen={false}>
                {hasCustomPoets ? (
                    <div className="century-section">
                        <div className="poets-grid-container open" style={{ height: 'auto' }}>
                            <PoetsList poets={customPoets} />
                        </div>
                    </div>
                ) : (
                    <div className="century-section">
                        <div className="century-title-button">
                            <h2 className="century-title">
                                به زودی...
                            </h2>
                        </div>
                    </div>
                )}
            </CategorySection>

            {/* Classical Poets Section - with improved rendering */}
            <CategorySection title="شاعران کهن" isOpen={false}>
                {otherCenturies.length > 0 ? (
                    otherCenturies.map((century) => (
                        <CenturySection
                            key={century.id}
                            century={century}
                        />
                    ))
                ) : (
                    <div className="century-section">
                        <div className="century-title-button">
                            <h2 className="century-title">
                                در حال بارگیری...
                            </h2>
                        </div>
                    </div>
                )}
            </CategorySection>
        </>
    );
} 
