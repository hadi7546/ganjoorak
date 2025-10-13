'use client';

import React, { useState } from 'react';
import { HiChevronDown } from 'react-icons/hi2';
import '../styles/FAQ.css';
import Menu, { MenuButton, SearchButton } from '@/components/Menu';
import SettingsDialog from '@/components/SettingsDialog';
import { motion } from 'framer-motion';
import { useUpdateNotification } from '@/hooks/useUpdateNotification';
import SearchDialog from '@/components/SearchDialog';

const FAQ = () => {
    const [openIndices, setOpenIndices] = useState<number[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const { hasNewUpdates, markAsRead } = useUpdateNotification();

    const faqs = [
        {
            question: 'گنجورک چیست؟',
            answer: (
                <>
                    گنجورک یک درگاه برای مطالعه و گوش دادن به اشعار فارسی است که به صورت تصادفی از گنجور انتخاب می‌شوند.
                    ممکن است درآینده منابع دیگری نیز به گنجورک اضافه شوند.
                </>
            )
        },
        {
            question: 'دلیل انتخاب نام گنجورک چیست؟',
            answer: 'گنجورک از ترکیب کلمه گنجور و پسوند تصغیر «ک» ساخته شده است. به این دلیل که اشعار به صورت تصادفی و در یک حالت  کوچک نمایش داده می‌شوند.'
        },
        {
            question: 'گنجورک به گنجور مرتبط است؟',
            answer: 'خیر، گنجورک یک پروژه مستقل است.'
        },
        {
            question: 'آیا همه اشعار گنجور در گنجورک موجود است؟',
            answer: 'بله، اشعار به صورت تصادفی از مجموعه کامل گنجور انتخاب می‌شوند.'
        },
        {
            question: 'مشکل، پیشنهاد و یا ایده‌ای دارید؟',
            answer: (
                <>
                    لطفاً از طریق ایمیل{' '}
                    <a href="mailto:contact@ganjoorak.ir" className="link">
                        contact@ganjoorak.ir
                    </a>{' '}
                    یا در <a href="https://t.me/hadi7546" target="_blank" rel="noopener noreferrer" className="link">
                        تلگرام
                    </a> در تماس باشید.
                </>
            )
        },
        {
            question: 'گنجورک توسط چه کسی توسعه داده شده است؟',
            answer: (
                <>
                    گنجورک توسط هادی آذرنسب در هفته‌‌های پایانی سال ۱۴۰۳ توسعه داده شده است. می‌توانید در این شبکه‌ها من را دنبال کنید:{' '}
                    <a href="https://t.me/hadi_7546" target="_blank" rel="noopener noreferrer" className="link">کانال تلگرام</a>،{' '}
                    <a href="https://twitter.com/hadi_7546" target="_blank" rel="noopener noreferrer" className="link">توییتر</a> و یا{' '}
                    <a href="https://hadi7546.ir" target="_blank" rel="noopener noreferrer" className="link">وبسایت</a>.
                </>
            )
        }
    ];

    const toggleQuestion = (index: number) => {
        setOpenIndices(prevIndices =>
            prevIndices.includes(index)
                ? prevIndices.filter(i => i !== index)
                : [...prevIndices, index]
        );
    };

    return (
        <div className="faq-container">
            <MenuButton onClick={() => setIsMenuOpen(!isMenuOpen)} hasNotification={hasNewUpdates} />
            <SearchButton onClick={() => {
                setIsMenuOpen(false);
                setIsSearchOpen(true);
            }} />
            <Menu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                hasNewUpdates={hasNewUpdates}
                onUpdatesViewed={markAsRead}
                onOpenSettings={() => {
                    setIsSettingsOpen(true);
                    setIsMenuOpen(false);
                }}
            />
            <SearchDialog
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onResultSelect={() => setIsSearchOpen(false)}
            />
            <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            <h1 className="faq-title">پرسش‌های متداول</h1>
            <div className="faq-list">
                {faqs.map((faq, index) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}

                        key={index}
                        className={`faq-item ${openIndices.includes(index) ? 'open' : ''}`}
                        onClick={() => toggleQuestion(index)}
                    >
                        <div className="faq-question">
                            <h3>{faq.question}</h3>
                            <HiChevronDown className="faq-arrow" />
                        </div>
                        <div className="faq-answer">
                            {faq.answer}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default FAQ;
