import React from 'react';
import '../../styles/FAQ.css';
import { Vazirmatn } from 'next/font/google';
import { Metadata } from 'next';

const vazirmatn = Vazirmatn({ subsets: ['arabic'] });

export const metadata: Metadata = {
    description: 'بروزرسانی‌ها',
};

export default function FAQLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={`app ${vazirmatn.className}`}>
            {children}
        </div>
    );
}
