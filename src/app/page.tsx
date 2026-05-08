'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import PoemViewer from '@/components/PoemViewer';
import LoadingScreen from '@/components/LoadingScreen';
import ErrorScreen from '@/components/ErrorScreen';
import ganjoorApi from '@/api/GanjoorApi';
import { Poem } from '@/types/poem';
import { logger } from '@/utils/logger';

const INITIAL_POEMS_COUNT = 3;
const PREFETCH_THRESHOLD = 2;
const BATCH_SIZE = 2;

export default function Home() {
    const [poems, setPoems] = useState<Poem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPoemIndex, setCurrentPoemIndex] = useState(0);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const poemsRef = useRef<Poem[]>([]);
    const currentPoemIndexRef = useRef(0);
    const fetchMorePromiseRef = useRef<Promise<Poem[]> | null>(null);

    useEffect(() => {
        poemsRef.current = poems;
    }, [poems]);

    useEffect(() => {
        currentPoemIndexRef.current = currentPoemIndex;
    }, [currentPoemIndex]);

    const fetchPoemsBatch = useCallback(async (count: number) => {
        const fetchedPoems: Poem[] = [];

        for (let i = 0; i < count; i++) {
            try {
                // Get random poem first
                const randomPoem = await ganjoorApi.getRandomPoem();
                // Then fetch the complete poem data with recitations
                const fullPoem = await ganjoorApi.getPoemById(randomPoem.id);
                fetchedPoems.push(fullPoem);
            } catch (err) {
                logger.error('Error fetching poem:', err);
            }
        }

        return fetchedPoems;
    }, []);

    const fetchMorePoems = useCallback(async () => {
        if (fetchMorePromiseRef.current) {
            return fetchMorePromiseRef.current;
        }

        const fetchPromise = (async () => {
            try {
                setIsFetchingMore(true);
                const newPoems = await fetchPoemsBatch(BATCH_SIZE);

                if (newPoems.length > 0) {
                    setPoems(prevPoems => [...prevPoems, ...newPoems]);
                }

                return newPoems;
            } catch (err) {
                logger.error('Failed to fetch more poems:', err);
                return [];
            } finally {
                setIsFetchingMore(false);
                fetchMorePromiseRef.current = null;
            }
        })();

        fetchMorePromiseRef.current = fetchPromise;
        return fetchPromise;
    }, [fetchPoemsBatch]);

    // Fetch initial poems
    const fetchInitialPoems = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const fetchedPoems = await fetchPoemsBatch(INITIAL_POEMS_COUNT);

            if (fetchedPoems.length > 0) {
                setPoems(fetchedPoems);
                setCurrentPoemIndex(0);
                setLoading(false);
            } else {
                throw new Error('Could not fetch any poems');
            }
        } catch (err) {
            logger.error('Failed to fetch initial poems:', err);
            setError('متأسفانه در بارگیری شعرها مشکلی پیش آمد. لطفاً دوباره تلاش کنید.');
            setLoading(false);
        }
    }, [fetchPoemsBatch]);

    // Fetch initial poems
    useEffect(() => {
        fetchInitialPoems();
    }, [fetchInitialPoems]);

    // Fetch more poems when approaching the end
    useEffect(() => {
        const shouldFetchMore = currentPoemIndex >= poems.length - PREFETCH_THRESHOLD &&
            poems.length > 0 &&
            !isFetchingMore;

        if (shouldFetchMore) {
            fetchMorePoems();
        }
    }, [currentPoemIndex, poems.length, isFetchingMore, fetchMorePoems]);

    const handleNext = useCallback(async () => {
        const nextIndex = currentPoemIndexRef.current + 1;

        if (nextIndex < poemsRef.current.length) {
            setCurrentPoemIndex(nextIndex);
            return;
        }

        const newPoems = await fetchMorePoems();

        if (newPoems.length > 0) {
            setCurrentPoemIndex(nextIndex);
        }
    }, [fetchMorePoems]);

    const handlePrevious = useCallback(() => {
        setCurrentPoemIndex(prevIndex => Math.max(prevIndex - 1, 0));
    }, []);

    if (loading) {
        return <LoadingScreen />;
    }

    if (error) {
        return <ErrorScreen message={error} onRetry={fetchInitialPoems} />;
    }

    return (
        <main className="h-screen overflow-hidden">
            {poems[currentPoemIndex] && (
                <PoemViewer
                    poem={poems[currentPoemIndex]}
                    onNext={handleNext}
                    onPrevious={handlePrevious}
                    isFirst={currentPoemIndex === 0}
                    isLast={false}
                    isModern={false}
                />
            )}
        </main>
    );
}
