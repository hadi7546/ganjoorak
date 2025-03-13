'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PoemViewer from '@/components/PoemViewer';
import LoadingScreen from '@/components/LoadingScreen';
import ErrorScreen from '@/components/ErrorScreen';
import customApi from '@/api/CustomApi';
import type { Poem } from '@/types/poem';
import { Poet, isValidPoet, poetNames } from '@/types/poets';

export default function PoemPage() {
    const params = useParams();
    const router = useRouter();
    const [poem, setPoem] = useState<Poem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get and validate poet from params
    const poetSlug = params?.poet as string;
    if (!isValidPoet(poetSlug)) {
        router.push('/');
        return null;
    }
    const poet = poetSlug as Poet;

    useEffect(() => {
        const loadPoem = async () => {
            try {
                setLoading(true);
                const id = params?.id;

                if (!id) {
                    // Redirect to random poem
                    const randomPoem = await customApi.getRandomPoem(poet);
                    router.push(`/${poetSlug}/${randomPoem.id}`);
                    return;
                }

                const poemId = parseInt(id as string);
                if (isNaN(poemId) || poemId < 1) {
                    // Redirect to random poem if ID is invalid
                    const randomPoem = await customApi.getRandomPoem(poet);
                    router.push(`/${poetSlug}/${randomPoem.id}`);
                    return;
                }

                try {
                    // Fetch the specific poem
                    const loadedPoem = await customApi.getPoemById(poemId, poet);
                    setPoem(loadedPoem);
                    setError(null);
                } catch (err) {
                    // If poem not found, redirect to a random poem
                    const randomPoem = await customApi.getRandomPoem(poet);
                    router.push(`/${poetSlug}/${randomPoem.id}`);
                    return;
                }
            } catch (err) {
                console.error('Error loading poem:', err);
                setError(err instanceof Error ? err.message : 'خطا در بارگیری شعر');
            } finally {
                setLoading(false);
            }
        };

        loadPoem();
    }, [params?.id, router, poet, poetSlug]);

    const handleNext = async () => {
        try {
            setLoading(true);
            const newPoem = await customApi.getRandomPoem(poet);
            router.push(`/${poetSlug}/${newPoem.id}`);
        } catch (err) {
            console.error('Error loading next poem:', err);
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

    return poem ? (
        <main className="h-screen overflow-hidden">
            <PoemViewer
                poem={poem}
                onNext={handleNext}
                onPrevious={() => { }}
                isFirst={true}
                isLast={true}
                isModern={true}
                poetName={poetNames[poet]}
                backUrl={`/${poetSlug}`}
            />
        </main>
    ) : null;
}
