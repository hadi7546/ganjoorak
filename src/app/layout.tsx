import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import ganjoorApi from '@/api/ganjoorApi';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'گنجورک',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();

    useEffect(() => {
        const updateMetadata = async () => {
            const { id } = router.query;
            if (id) {
                const poem = await ganjoorApi.getPoemById(parseInt(id as string));
                document.title = poem.title;
                const metaDescription = document.querySelector('meta[name="description"]');
                if (metaDescription) {
                    metaDescription.setAttribute('content', poem.title);
                } else {
                    const newMetaDescription = document.createElement('meta');
                    newMetaDescription.name = 'description';
                    newMetaDescription.content = poem.title;
                    document.head.appendChild(newMetaDescription);
                }
            }
        };

        updateMetadata();
    }, [router.query]);

    return (
        <html lang="en">
            <body className={inter.className}>{children}</body>
        </html>
    );
}
