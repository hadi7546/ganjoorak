import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/NosratRahmani.css';

interface Poem {
    title: string;
    description: string;
    url: string;
}

const NosratRahmani: React.FC = () => {
    const poems: Poem[] = [
        {
            title: "کفر",
            description: "شعرِ کفر، به همراه صدای شاعر",
            url: "https://elhamiyan.blog.ir/post/nosrat-rahmani-kofr"
        },
        {
            title: "بلوف",
            description: "شعر بلوف به همراه صدای شاعر",
            url: "https://elhamiyan.blog.ir/post/nosrat-rahmani-blof"
        },
        {
            title: "در عطر عشق",
            description: "به همراه صدای شاعر",
            url: "https://elhamiyan.blog.ir/post/nosrat-rahmani-dar-atre-eshgh"
        },
        {
            title: "ای بی تو من خراب",
            description: "به همراه صدای شاعر",
            url: "https://elhamiyan.blog.ir/post/nosrat-rahmani-ey-bi-to-man-kharab"
        },
        {
            title: "من آبروی عشقم",
            description: "به همراه صدای شاعر",
            url: "https://elhamiyan.blog.ir/post/nosrat-rahmani-man-abroye-eshgham"
        },
        {
            title: "شیرین",
            description: "به همراه صدای شاعر",
            url: "https://elhamiyan.blog.ir/post/nosrat-rahmani-shirin"
        },
        {
            title: "عصر جمعه پاییز",
            description: "به همراه صدای شاعر",
            url: "https://elhamiyan.blog.ir/post/nosrat-rahmani-asre-jomeye-paeez"
        },
        {
            title: "پیاله دور دگر زد",
            description: "به همراه صدای شاعر",
            url: "https://elhamiyan.blog.ir/post/nosrat-rahmani-piyaleh-dore-degar-zad"
        },
        {
            title: "زمزمه ای در محراب",
            description: "به همراه صدای شاعر",
            url: "https://elhamiyan.blog.ir/post/nosrat-rahmani-zamzameyi-dar-mehrab"
        },
        {
            title: "وداع تلخ",
            description: "به همراه صدای شاعر",
            url: "https://elhamiyan.blog.ir/post/nosrat-rahmani-vedae-talkh"
        }
    ];

    return (
        <div className="nosrat-page">
            <div className="poet-header">
                <h1>نصرت رحمانی</h1>
                <p className="poet-description">
                    مجموعه اشعار نصرت رحمانی به همراه صدای شاعر
                </p>
            </div>

            <div className="poems-container">
                {poems.map((poem, index) => (
                    <div key={index} className="poem-card">
                        <h3 className="poem-title">{poem.title}</h3>
                        <p className="poem-description">{poem.description}</p>
                        <a
                            href={poem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="poem-link"
                        >
                            شنیدن شعر
                        </a>
                    </div>
                ))}
            </div>

            <div className="poet-footer">
                <p>
                    منبع: <a
                        href="https://elhamiyan.blog.ir/category/%D9%86%D8%B5%D8%B1%D8%AA-%D8%B1%D8%AD%D9%85%D8%A7%D9%86%DB%8C/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        وبلاگ مکعب گرد
                    </a>
                </p>
                <Link to="/" className="back-link">بازگشت به صفحه اصلی</Link>
            </div>
        </div>
    );
};

export default NosratRahmani; 