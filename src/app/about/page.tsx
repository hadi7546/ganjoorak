export default function AboutPage() {
    return (
        <main className="min-h-screen bg-black text-white p-8 md:p-16">
            <div className="max-w-3xl mx-auto space-y-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-8">درباره گنج</h1>

                <section className="space-y-4">
                    <h2 className="text-xl md:text-2xl font-semibold text-gray-200">هدف ما</h2>
                    <p className="text-gray-300 leading-relaxed">
                        گنج با هدف ارائه تجربه‌ای متفاوت در خواندن و شنیدن اشعار شاعران معاصر ایران ایجاد شده است.
                        ما تلاش می‌کنیم تا با طراحی مینیمال و کاربرپسند، فضایی آرام و دلنشین برای مطالعه شعر فراهم کنیم.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl md:text-2xl font-semibold text-gray-200">منابع</h2>
                    <p className="text-gray-300 leading-relaxed">
                        اشعار این مجموعه از منابع معتبر و وبسایت‌های تخصصی شعر و ادب فارسی گردآوری شده‌اند. منابع اصلی ما عبارتند از:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-300">
                        <li>وبسایت گنجور (ganjoor.net)</li>
                        <li>وبلاگ‌های تخصصی شعر و ادبیات</li>
                        <li>کتاب‌های چاپ شده شاعران</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl md:text-2xl font-semibold text-gray-200">همکاری</h2>
                    <p className="text-gray-300 leading-relaxed">
                        این پروژه متن‌باز است و از مشارکت علاقه‌مندان استقبال می‌کنیم. اگر مایل به همکاری هستید، می‌توانید:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-300">
                        <li>اشعار جدید پیشنهاد دهید</li>
                        <li>در بهبود کیفیت محتوا کمک کنید</li>
                        <li>در توسعه نرم‌افزار مشارکت کنید</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl md:text-2xl font-semibold text-gray-200">تماس</h2>
                    <p className="text-gray-300 leading-relaxed">
                        برای ارتباط با ما و ارسال پیشنهادات خود می‌توانید از طریق گیت‌هاب پروژه اقدام کنید.
                    </p>
                    <div className="flex gap-4">
                        <a
                            href="https://github.com/hadialqattan/ganj"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
                        >
                            مشاهده پروژه در گیت‌هاب
                        </a>
                    </div>
                </section>
            </div>
        </main>
    );
} 