import React from 'react';
import '../../styles/FAQ.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
    description: 'پرسش‌های متداول',
};

export default function FAQLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="app">
            {children}
        </div>
    );
}
