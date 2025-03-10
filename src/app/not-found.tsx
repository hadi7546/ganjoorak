'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import ganjoorApi from '@/api/GanjoorApi';
import type { Poem } from '@/types/poem';
import LoadingScreen from '@/components/LoadingScreen';
import { useRouter } from 'next/navigation';

export default function NotFound() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const goToRandomPoem = async () => {
        setLoading(true);
        try {
            const randomPoem = await ganjoorApi.getRandomPoem();
            window.location.href = `/poem/${randomPoem.id}`;
        } catch (error) {
            console.error('Error loading random poem:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <div dir="rtl" className="h-screen flex flex-col items-center justify-center bg-black text-white p-4 font-vazirmatn">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center max-w-2xl"
            >
                <h1 className="text-6xl mb-8 font-bold">۴۰۴</h1>
                <p className="text-xl mb-4 text-gray-300">احتمالا صفحه‌ای که به دنبال آن بودید وجود ندارد.</p>
                <p className="text-xl mb-8 text-gray-300">می‌توانید به صفحه اصلی بازگردید یا یک شعر تصادفی ببینید.</p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={goToRandomPoem}
                        className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur text-white w-full sm:w-auto"
                    >
                        یک شعر تصادفی
                    </button>

                    <Link
                        href="/"
                        className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur text-white w-full sm:w-auto"
                    >
                        بازگشت به خانه
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}