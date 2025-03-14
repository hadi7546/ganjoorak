import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'گنجورک',
    description: 'یک تجربه بهتر از شنیدن و خواندن شعر.',
    icons: {
        icon: [
            { url: 'favicon.ico' },
            { url: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { url: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
        apple: [
            { url: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
        other: [
            {
                rel: 'mask-icon',
                url: 'icon-192-maskable.png',
                sizes: '192x192',
                type: 'image/png'
            },
            {
                rel: 'mask-icon',
                url: 'icon-512-maskable.png',
                sizes: '512x512',
                type: 'image/png'
            },
        ],
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" dir="rtl">
            <body className={inter.className}>
                {children}
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}