'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PoemViewer from '@/components/PoemViewer';
import LoadingScreen from '@/components/LoadingScreen';
import ErrorScreen from '@/components/ErrorScreen';
import ganjoorApi from '@/api/GanjoorApi';
import type { Poem } from '@/types/poem';

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
                const id = params?.id;

                if (!id) {
                    const randomPoem = await ganjoorApi.getRandomPoem();
                    router.push(`/poem/${randomPoem.id}`);
                    return;
                }

                const poemId = parseInt(id as string);
                if (isNaN(poemId) || poemId < 1) {
                    const randomPoem = await ganjoorApi.getRandomPoem();
                    router.push(`/poem/${randomPoem.id}`);
                    return;
                }

                try {
                    const loadedPoem = await ganjoorApi.getPoemById(poemId);
                    setPoem(loadedPoem);
                    setError(null);
                } catch (err) {
                    // If poem not found, redirect to a random poem
                    const randomPoem = await ganjoorApi.getRandomPoem();
                    router.push(`/poem/${randomPoem.id}`);
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
    }, [params?.id, router]);

    const handleNext = async () => {
        try {
            setLoading(true);
            const newPoem = await ganjoorApi.getRandomPoem();
            router.push(`/poem/${newPoem.id}`);
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
                isModern={false}
            />
        </main>
    ) : null;
}
