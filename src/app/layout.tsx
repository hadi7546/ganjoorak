import type { Metadata } from 'next';
import { Inter, Vazirmatn } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

// Optimize font loading with display swap
const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    preload: true,
});

const vazirmatn = Vazirmatn({
    subsets: ['arabic'],
    display: 'swap',
    preload: true,
});

export const metadata: Metadata = {
    title: 'گنجورک',
    description: 'یک تجربه بهتر از شنیدن و خواندن شعر فارسی.',
    metadataBase: new URL('https://ganjoorak.ir'),
    openGraph: {
        images: [
            {
                url: '/banner.png',
                width: 1200,
                height: 630,
                alt: 'گنجورک',
            },
        ],
        type: 'website',
        locale: 'fa_IR',
        siteName: 'گنجورک',
    },
    icons: {
        icon: [
            { url: '/favicon.ico' },
            { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
        apple: [
            { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
        other: [
            {
                rel: 'mask-icon',
                url: '/icon-192-maskable.png',
                sizes: '192x192',
                type: 'image/png'
            },
            {
                rel: 'mask-icon',
                url: '/icon-512-maskable.png',
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
        <html lang="fa" dir="rtl" className={vazirmatn.className}>
            <body className={inter.className}>
                {children}
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}