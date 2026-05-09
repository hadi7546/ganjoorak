import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
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

const mobilePolishStyles = `
@media (max-width: 768px) {
  .menu-button:not(.poem-feed-lock-button) {
    top: auto !important;
    right: 1rem !important;
    bottom: calc(1rem + env(safe-area-inset-bottom)) !important;
    width: 2.5rem !important;
    height: 2.5rem !important;
    z-index: 1000;
  }

  .global-search-button {
    top: auto !important;
    right: 1rem !important;
    bottom: calc(4.25rem + env(safe-area-inset-bottom)) !important;
    width: 2.5rem !important;
    height: 2.5rem !important;
    z-index: 1000;
  }

  .poem-feed-lock-button {
    top: auto !important;
    right: 1rem !important;
    bottom: calc(7.5rem + env(safe-area-inset-bottom)) !important;
    width: 2.5rem !important;
    height: 2.5rem !important;
    z-index: 1000;
  }

  .action-buttons {
    left: 1rem !important;
    right: auto !important;
    bottom: calc(1rem + env(safe-area-inset-bottom)) !important;
    gap: 0.6rem !important;
    align-items: center !important;
    z-index: 12;
  }

  .action-button {
    width: 2.5rem !important;
    height: 2.5rem !important;
  }

  .poet-info {
    left: 1rem !important;
    bottom: calc(1rem + env(safe-area-inset-bottom)) !important;
    z-index: 12;
  }

  .menu-backdrop,
  .settings-backdrop {
    z-index: 1090 !important;
  }

  .menu-drawer,
  .settings-dialog {
    z-index: 1100 !important;
  }

  .settings-dialog {
    align-items: flex-end !important;
    justify-content: center !important;
    padding: 0 0.75rem calc(0.75rem + env(safe-area-inset-bottom)) !important;
  }

  .settings-panel {
    width: min(100%, 42rem) !important;
    max-height: min(86dvh, 42rem) !important;
    border-radius: 1.5rem !important;
    padding: 1rem !important;
  }

  .settings-panel::before {
    content: "";
    display: block;
    width: 2.75rem;
    height: 0.25rem;
    flex: 0 0 auto;
    border-radius: 999px;
    background: rgb(var(--foreground) / 0.22);
    margin: 0 auto 0.85rem;
  }
}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="rtl" suppressHydrationWarning data-font="vazirmatn">
      <head>
        <style dangerouslySetInnerHTML={{ __html: mobilePolishStyles }} />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var settings=localStorage.getItem('ganjoorak:settings');var parsed=settings?JSON.parse(settings):null;var theme=parsed&&parsed.theme?parsed.theme:localStorage.getItem('theme');var prefersDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var fallback=prefersDark?'dark':'dark';var allowedThemes=['dark','light','paper'];var finalTheme=allowedThemes.indexOf(theme)>=0?theme:fallback;var allowedFonts=['vazirmatn','samim','tanha','shabnam','gandom','parastoo','sahel','vazircode','nahid'];var storedFont=parsed&&parsed.fontFamily&&allowedFonts.indexOf(parsed.fontFamily)>=0?parsed.fontFamily:'vazirmatn';document.documentElement.setAttribute('data-theme',finalTheme);document.documentElement.setAttribute('data-font',storedFont);localStorage.setItem('theme',finalTheme);}catch(e){document.documentElement.setAttribute('data-theme','dark');document.documentElement.setAttribute('data-font','vazirmatn');}})();",
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
