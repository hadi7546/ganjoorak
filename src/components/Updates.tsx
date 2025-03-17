'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import '../styles/Updates.css';
import Menu, { MenuButton } from '@/components/Menu';
import { motion } from 'framer-motion';
const Updates = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const updates = [
        {
            version: '1.0.2',
            date: '۲۷ اسفند ۱۴۰۳',
            changes: [
                <>اضافه شدن <Link href="/poets" className="link">صفحه شاعران</Link></>,
                <>اضافه شدن دو شاعر معاصر، <Link href="/rahmani" className="link">نصرت رحمانی</Link> و <Link href="/farrokhzad" className="link">فروغ فرخزاد</Link></>,
                'اضافه شدن صفحه جدید برای هر شاعر با کلیک در صفحه اصلی یا صفحه شاعران',
                'اضافه شدن منو',
                'اصلاح نیم‌فاصله‌ها',
                'پیمایش بین شعرها و محتوای شعرها با کیبورد'
            ]
        },
        {
            version: '1.0.1',
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
            <MenuButton onClick={() => setIsMenuOpen(!isMenuOpen)} />
            <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            <h1 className="updates-title">بروزرسانی‌ها</h1>
            <div className="updates-list">
                {updates.map((update, index) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}

                        key={index} className="update-item">
                        <div className="update-header">
                            <h3 className="update-version">نسخه {update.version}</h3>
                            <span className="update-date">{update.date}</span>
                        </div>
                        <ul className="update-changes">
                            {update.changes.map((change, changeIndex) => (
                                <li key={changeIndex}>{change}</li>
                            ))}
                        </ul>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default Updates; 