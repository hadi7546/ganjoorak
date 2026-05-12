import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import "./mobile-polish.css";
import "./mobile-floating-controls.css";
import "./mobile-modal-polish.css";
import "./mobile-minimal-feed.css";
import { SettingsProvider } from "@/context/SettingsContext";
import RouteTransition from "@/components/RouteTransition";
import "samim-font/dist/font-face.css";
import "tanha-font/dist/font-face.css";
import "shabnam-font/dist/font-face.css";
import "gandom-font/dist/font-face.css";
import "parastoo-font/dist/font-face.css";
import "sahel-font/dist/font-face.css";
import "vazir-code-font/dist/font-face.css";
import "nahid-font/dist/font-face.css";

export const metadata: Metadata = {
  title: "گنجورک",
  description: "راحت‌تر شعر بخوانیم و شعر گوش دهیم.",

  openGraph: {
    siteName: "گنجورک",
    description: "راحت‌تر شعر بخوانیم و شعر گوش دهیم.",
    images: [
      {
        url: "icon-192-maskable.png",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        rel: "mask-icon",
        url: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      dir="rtl"
      suppressHydrationWarning
      data-font="vazirmatn"
      data-poem-font-size="100"
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var settings=localStorage.getItem('ganjoorak:settings');var parsed=settings?JSON.parse(settings):null;var theme=parsed&&parsed.theme?parsed.theme:localStorage.getItem('theme');var prefersDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var fallback=prefersDark?'dark':'dark';var allowedThemes=['dark','light','paper'];var finalTheme=allowedThemes.indexOf(theme)>=0?theme:fallback;var allowedFonts=['vazirmatn','samim','tanha','shabnam','gandom','parastoo','sahel','vazircode','nahid'];var storedFont=parsed&&parsed.fontFamily&&allowedFonts.indexOf(parsed.fontFamily)>=0?parsed.fontFamily:'vazirmatn';var legacy={compact:90,normal:100,large:112,extra:125};var clampSize=function(value){var n=Object.prototype.hasOwnProperty.call(legacy,value)?legacy[value]:Number(value);if(!Number.isFinite(n)){n=100;}n=Math.round(n/5)*5;return Math.min(125,Math.max(85,n));};var poemFontSize=clampSize(parsed&&parsed.poemFontSize);var scaled=function(base,min,max){var value=base*(poemFontSize/100);return Math.min(max,Math.max(min,value)).toFixed(3)+'rem';};document.documentElement.setAttribute('data-theme',finalTheme);document.documentElement.setAttribute('data-font',storedFont);document.documentElement.setAttribute('data-poem-font-size',String(poemFontSize));document.documentElement.style.setProperty('--poem-text-font-size',scaled(1.2,1.05,1.5));document.documentElement.style.setProperty('--poem-verse-font-size',scaled(1.5,1.3,1.85));document.documentElement.style.setProperty('--poem-title-font-size',scaled(2.5,2.15,3.1));localStorage.setItem('theme',finalTheme);}catch(e){document.documentElement.setAttribute('data-theme','dark');document.documentElement.setAttribute('data-font','vazirmatn');document.documentElement.setAttribute('data-poem-font-size','100');}})();",
          }}
        />
      </head>
      <body>
        <SettingsProvider>
          <RouteTransition>{children}</RouteTransition>
        </SettingsProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
