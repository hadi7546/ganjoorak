import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { SettingsProvider } from "@/context/SettingsContext";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var settings=localStorage.getItem('ganjoorak:settings');var parsed=settings?JSON.parse(settings):null;var theme=parsed&&parsed.theme?parsed.theme:localStorage.getItem('theme');var prefersDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var fallback=prefersDark?'dark':'dark';var allowed=['dark','light','paper'];var finalTheme=allowed.indexOf(theme)>=0?theme:fallback;document.documentElement.setAttribute('data-theme',finalTheme);localStorage.setItem('theme',finalTheme);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();",
          }}
        />
      </head>
      <body className={inter.className}>
        <SettingsProvider>{children}</SettingsProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
