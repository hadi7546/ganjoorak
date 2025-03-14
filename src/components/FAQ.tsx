import React from 'react';
import '../styles/FAQ.css';

const FAQ = () => {
    const faqs = [
        {
            question: 'گنجورک چیست؟',
            answer: 'گنجورک یک نرم‌افزار وب برای مطالعه و گوش دادن به اشعار فارسی است که به صورت تصادفی از گنجور انتخاب می‌شوند.'
        },
        {
            question: 'دلیل انتخاب نام گنجورک چیست؟',
            answer: 'گنجورک از ترکیب کلمه گنجور و پسوند تصغیر «ک» ساخته شده است.'
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
            question: 'در وبسایت مشکلی دارم؟',
            answer: (
                <>
                    لطفاً از طریق ایمیل{' '}
                    <a href="mailto:contact@ganjoorak.ir" className="link">
                        contact@ganjoorak.ir
                    </a>{' '}
                    یا راه‌های ارتباطی سازنده با ما در تماس باشید.
                </>
            )
        },
        {
            question: 'گنجورک توسط چه کسی توسعه داده شده است؟',
            answer: (
                <>
                    گنجورک توسط هادی آذرنسب در هفته‌های پایانی سال ۱۴۰۳ توسعه داده شده است. راه‌های ارتباطی:{' '}
                    <div className="social-links">
                        <a href="https://t.me/hadi7546" target="_blank" rel="noopener noreferrer" className="link">
                            تلگرام @hadi7546
                        </a>
                        <a href="https://twitter.com/hadi_7546" target="_blank" rel="noopener noreferrer" className="link">
                            توییتر @hadi_7546
                        </a>
                        <a href="https://github.com/hadi7546" target="_blank" rel="noopener noreferrer" className="link">
                            گیت‌هاب hadi7546
                        </a>
                    </div>
                </>
            )
        }
    ];

    return (
        <div className="faq-container">
            <h1 className="faq-title">سؤالات متداول</h1>
            <div className="faq-list">
                {faqs.map((faq, index) => (
                    <div key={index} className="faq-item">
                        <h3 className="faq-question">{faq.question}</h3>
                        <div className="faq-answer">{faq.answer}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FAQ; 