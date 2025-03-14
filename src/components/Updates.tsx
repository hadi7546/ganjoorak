'use client';

import React from 'react';
import Link from 'next/link';
import '../styles/Updates.css';

const Updates = () => {
    const updates = [
        {
            version: '1.1.0',
            date: '۲۵ اسفند ۱۴۰۳',
            changes: [
                <>اضافه شدن <Link href="/faq" className="link">صفحه پرسش‌های متداول</Link></>,
                <>اضافه شدن <Link href="/updates" className="link">صفحه بروزرسانی‌ها</Link></>,
                'بهبود رابط کاربری و انیمیشن‌ها',
                'رفع باگ‌های جزئی'
            ]
        },
        {
            version: '1.0.0',
            date: '۲۰ اسفند ۱۴۰۳',
            changes: [
                'انتشار نسخه اولیه گنجورک',
                'امکان مشاهده اشعار به صورت تصادفی',
                'پخش صوت اشعار',
            ]
        }
    ];

    return (
        <div className="updates-container">
            <h1 className="updates-title">بروزرسانی‌ها</h1>
            <div className="updates-list">
                {updates.map((update, index) => (
                    <div key={index} className="update-item">
                        <div className="update-header">
                            <h3 className="update-version">نسخه {update.version}</h3>
                            <span className="update-date">{update.date}</span>
                        </div>
                        <ul className="update-changes">
                            {update.changes.map((change, changeIndex) => (
                                <li key={changeIndex}>{change}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Updates; 