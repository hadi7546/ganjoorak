'use client';

import { useState } from 'react';
import '../styles/FAQ.css';
import Menu, { MenuButton, SearchButton } from '@/components/Menu';
import SettingsDialog from '@/components/SettingsDialog';
import GlobalSearchDialog from '@/components/GlobalSearchDialog';
import { useUpdateNotification } from '@/hooks/useUpdateNotification';
import AccordionItem from '@/components/AccordionItem';

const FAQ = () => {
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

    return (
        <div className="faq-container">
            <MenuButton onClick={() => setIsMenuOpen(!isMenuOpen)} hasNotification={hasNewUpdates} />
            <SearchButton onClick={() => setIsSearchOpen(true)} />
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
            <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <GlobalSearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

            <h1 className="faq-title">پرسش‌های متداول</h1>
            <div className="faq-list">
                {faqs.map((faq, index) => (
                    <AccordionItem key={index} title={faq.question}>
                        {faq.answer}
                    </AccordionItem>
                ))}
            </div>
        </div>
    );
};

export default FAQ;
