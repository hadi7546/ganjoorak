"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const PwaInstallPrompt = () => {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const dismissed = window.localStorage.getItem("ganjoorak:pwa-install-dismissed");
    if (dismissed === "1") {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (!isVisible || !promptEvent) {
    return null;
  }

  return (
    <div className="pwa-install-banner" role="dialog" aria-label="نصب گنجورک">
      <p>گنجورک را روی صفحهٔ اصلی نصب کنید تا سریع‌تر و آفلاین‌تر در دسترس باشد.</p>
      <div className="pwa-install-actions">
        <button
          type="button"
          className="primary"
          onClick={async () => {
            await promptEvent.prompt();
            await promptEvent.userChoice;
            setIsVisible(false);
            setPromptEvent(null);
          }}
        >
          نصب
        </button>
        <button
          type="button"
          onClick={() => {
            window.localStorage.setItem("ganjoorak:pwa-install-dismissed", "1");
            setIsVisible(false);
            setPromptEvent(null);
          }}
        >
          بعداً
        </button>
      </div>
    </div>
  );
};

export default PwaInstallPrompt;
