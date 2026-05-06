'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PoemViewer from '@/components/PoemViewer';
import LoadingScreen from '@/components/LoadingScreen';
import ErrorScreen from '@/components/ErrorScreen';
import customApi from '@/api/CustomApi';
import echolaliaApi from '@/api/EcholaliaApi';
import type { Poem } from '@/types/poem';
import { PoetSlug, isValidPoetSlug } from '@/types/poet';
import { logger } from '@/utils/logger';

export default function PoemPage() {
    const params = useParams();
    const router = useRouter();
    const [poem, setPoem] = useState<Poem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadPoem = async () => {
            try {
                setLoading(true);

                const poetSlug = params?.poet as string;
                const id = params?.id;
                const poet = isValidPoetSlug(poetSlug)
                    ? (poetSlug as PoetSlug)
                    : null;

                if (!id) {
                    const randomPoem = poet
                        ? await customApi.getRandomPoem(poet)
                        : await echolaliaApi.getRandomPoemByPoetSlug(poetSlug);
                    router.push(`/${poetSlug}/${randomPoem.id}`);
                    return;
                }

                const poemId = parseInt(id as string);
                if (isNaN(poemId) || poemId < 1) {
                    const randomPoem = poet
                        ? await customApi.getRandomPoem(poet)
                        : await echolaliaApi.getRandomPoemByPoetSlug(poetSlug);
                    router.push(`/${poetSlug}/${randomPoem.id}`);
                    return;
                }

                try {
                    const loadedPoem = poet
                        ? await customApi.getPoemById(poemId, poet)
                        : await echolaliaApi.getPoemById(poemId);

                    if (!poet && loadedPoem.poetSlug !== poetSlug) {
                        router.replace(`/${loadedPoem.poetSlug}/${loadedPoem.id}`);
                        return;
                    }

                    setPoem(loadedPoem);
                    setError(null);
                } catch (err) {
                    const randomPoem = poet
                        ? await customApi.getRandomPoem(poet)
                        : await echolaliaApi.getRandomPoemByPoetSlug(poetSlug);
                    router.push(`/${poetSlug}/${randomPoem.id}`);
                    return;
                }
            } catch (err) {
                logger.error('Error loading poem:', err);
                setError(err instanceof Error ? err.message : 'خطا در بارگیری شعر');
            } finally {
                setLoading(false);
            }
        };

        loadPoem();
    }, [params?.id, params?.poet, router]);

    const handleNext = async () => {
        try {
            setLoading(true);
            const poetSlug = params?.poet as string;
            const poet = isValidPoetSlug(poetSlug)
                ? (poetSlug as PoetSlug)
                : null;
            const newPoem = poet
                ? await customApi.getRandomPoem(poet)
                : await echolaliaApi.getRandomPoemByPoetSlug(poetSlug);
            router.push(`/${poetSlug}/${newPoem.id}`);
        } catch (err) {
            logger.error('Error loading next poem:', err);
            setError(err instanceof Error ? err.message : 'خطا در بارگیری شعر بعدی');
            setLoading(false);
        }
    };

    if (loading) {
        return <LoadingScreen />;
    }

    if (error) {
        return <ErrorScreen message={error} onRetry={handleNext} />;
    }

    if (!poem) {
        return <ErrorScreen message="شعر یافت نشد" onRetry={handleNext} />;
    }

    return (
        <PoemViewer
            poem={poem}
            onNext={handleNext}
            poetSlug={poem.poetSlug || (params?.poet as string)}
            showNext={true}
        />
    );
}
