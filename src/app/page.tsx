'use client';

import { useState, useEffect } from 'react';
import PoemViewer from '@/components/PoemViewer';
import LoadingScreen from '@/components/LoadingScreen';
import ErrorScreen from '@/components/ErrorScreen';
import ganjoorApi from '@/api/GanjoorApi';
import { Poem } from '@/types/poem';

const INITIAL_POEMS_COUNT = 3;
const PREFETCH_THRESHOLD = 2;
const BATCH_SIZE = 2;

export default function Home() {
    const [poems, setPoems] = useState<Poem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPoemIndex, setCurrentPoemIndex] = useState(0);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    // Fetch initial poems
    useEffect(() => {
        const fetchInitialPoems = async () => {
            try {
                setLoading(true);

                // Fetch poems one by one
                const fetchedPoems: Poem[] = [];

                for (let i = 0; i < INITIAL_POEMS_COUNT; i++) {
                    try {
                        // Get random poem first
                        const randomPoem = await ganjoorApi.getRandomPoem();
                        // Then fetch the complete poem data with recitations
                        const fullPoem = await ganjoorApi.getPoemById(randomPoem.id);
                        fetchedPoems.push(fullPoem);
                    } catch (err) {
                        console.error('Error fetching poem:', err);
                    }
                }

                if (fetchedPoems.length > 0) {
                    setPoems(fetchedPoems);
                    setLoading(false);
                } else {
                    throw new Error('Could not fetch any poems');
                }
            } catch (err) {
                console.error('Failed to fetch initial poems:', err);
                setError('Failed to load poems. Please try again later.');
                setLoading(false);
            }
        };

        fetchInitialPoems();
    }, []);

    // Fetch more poems when approaching the end
    useEffect(() => {
        const shouldFetchMore = currentPoemIndex >= poems.length - PREFETCH_THRESHOLD &&
            poems.length > 0 &&
            !isFetchingMore;

        if (shouldFetchMore) {
            const fetchMorePoems = async () => {
                try {
                    setIsFetchingMore(true);

                    // Fetch poems one by one
                    const newPoems: Poem[] = [];

                    for (let i = 0; i < BATCH_SIZE; i++) {
                        try {
                            // Get random poem first
                            const randomPoem = await ganjoorApi.getRandomPoem();
                            // Then fetch the complete poem data with recitations
                            const fullPoem = await ganjoorApi.getPoemById(randomPoem.id);
                            newPoems.push(fullPoem);
                        } catch (err) {
                            console.error('Error fetching additional poem:', err);
                        }
                    }

                    if (newPoems.length > 0) {
                        setPoems(prevPoems => [...prevPoems, ...newPoems]);
                    }
                } catch (err) {
                    console.error('Failed to fetch more poems:', err);
                } finally {
                    setIsFetchingMore(false);
                }
            };

            fetchMorePoems();
        }
    }, [currentPoemIndex, poems.length, isFetchingMore]);

    const handleNext = () => {
        setCurrentPoemIndex(prevIndex => prevIndex + 1);
    };

    const handlePrevious = () => {
        if (currentPoemIndex > 0) {
            setCurrentPoemIndex(prevIndex => prevIndex - 1);
        }
    };

    if (loading) {
        return <LoadingScreen />;
    }

    if (error) {
        return <ErrorScreen message={error} />;
    }

    return (
        <main className="h-screen overflow-hidden">
            {poems.length > 0 && (
                <PoemViewer
                    poem={poems[currentPoemIndex]}
                    onNext={handleNext}
                    onPrevious={handlePrevious}
                    isFirst={currentPoemIndex === 0}
                    isLast={currentPoemIndex === poems.length - 1}
                />
            )}
        </main>
    );
}
