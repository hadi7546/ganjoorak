import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
    return (
        <Html lang="fa" dir="rtl">
            <Head>
                {/* Preload critical fonts */}
                <link
                    rel="preload"
                    href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500&display=swap"
                    as="style"
                />
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500&display=swap"
                    media="print"
                    onLoad={() => {
                        // @ts-ignore - Simple font loading optimization
                        document.currentScript.media = 'all';
                    }}
                />

                {/* Preconnect to critical domains */}
                <link
                    rel="preconnect"
                    href="https://7elmsr3m4bc7q4th.public.blob.vercel-storage.com"
                    crossOrigin="anonymous"
                />
                <link
                    rel="dns-prefetch"
                    href="https://7elmsr3m4bc7q4th.public.blob.vercel-storage.com"
                />

                {/* Add LCP image preload hints */}
                <link
                    rel="preload"
                    href="https://7elmsr3m4bc7q4th.public.blob.vercel-storage.com/poets/farrokhzad.jpeg"
                    as="image"
                    type="image/jpeg"
                />

                {/* Add critical inline CSS */}
                <style dangerouslySetInnerHTML={{
                    __html: `
          body {
            margin: 0;
            padding: 0;
            background: #000;
            color: #fff;
            font-family: 'Vazirmatn', sans-serif;
          }
          .poem-viewer {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.9));
          }
          /* Additional critical CSS for FCP */
          .poet-image-container {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            overflow: hidden;
          }
          .poet-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
          }
          .title-section {
            text-align: center;
            padding: 2rem 1rem;
            direction: rtl;
            background: rgba(0, 0, 0, 0.4);
            position: sticky;
            top: 0;
            z-index: 2;
            width: 100%;
          }
          .poem-title {
            font-size: 2.5rem;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.95);
            margin: 0;
            margin-bottom: 1rem;
          }
        `}} />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
} 