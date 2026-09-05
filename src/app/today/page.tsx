"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PoemFeedPager from "@/components/PoemFeedPager";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorScreen from "@/components/ErrorScreen";
import Menu, { MenuButton, SearchButton } from "@/components/Menu";
import SettingsDialog from "@/components/SettingsDialog";
import GlobalSearchDialog from "@/components/GlobalSearchDialog";
import { useUpdateNotification } from "@/hooks/useUpdateNotification";
import type { Poem } from "@/types/poem";
import { getDailyPoemDateKey } from "@/utils/dailyPoem";
import { logger } from "@/utils/logger";

const DAILY_POEM_CACHE_KEY = "ganjoorak:daily-poem:v1";

type DailyPoemCache = {
  dateKey: string;
  poem: Poem;
};

const readCachedDailyPoem = (): DailyPoemCache | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(DAILY_POEM_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as DailyPoemCache;
    if (parsed?.dateKey !== getDailyPoemDateKey() || !parsed?.poem?.id) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const writeCachedDailyPoem = (cache: DailyPoemCache) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DAILY_POEM_CACHE_KEY, JSON.stringify(cache));
};

export default function TodayPage() {
  const [poem, setPoem] = useState<Poem | null>(
    () => readCachedDailyPoem()?.poem ?? null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { hasNewUpdates, markAsRead } = useUpdateNotification();

  const loadDailyPoem = useCallback(async () => {
    setError(null);
    setLoading(true);

    const cached = readCachedDailyPoem();
    if (cached?.poem) {
      setPoem(cached.poem);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/daily-poem", {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error("daily poem request failed");
      }

      const payload = (await response.json()) as DailyPoemCache;
      if (!payload?.poem?.id) {
        throw new Error("invalid daily poem payload");
      }

      writeCachedDailyPoem({
        dateKey: payload.dateKey || getDailyPoemDateKey(),
        poem: payload.poem,
      });
      setPoem(payload.poem);
    } catch (err) {
      logger.error("Failed to load daily poem:", err);
      setError("متأسفانه شعر روز در دسترس نیست. لطفاً دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDailyPoem();
  }, [loadDailyPoem]);

  if (loading && !poem) {
    return <LoadingScreen />;
  }

  if (error && !poem) {
    return <ErrorScreen message={error} onRetry={loadDailyPoem} />;
  }

  if (!poem) {
    return null;
  }

  return (
    <main className="h-screen overflow-hidden">
      <Link href="/today" className="daily-poem-banner">
        شعر روز · {getDailyPoemDateKey()}
      </Link>
      <MenuButton onClick={() => setIsMenuOpen(true)} hasNotification={hasNewUpdates} />
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
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <GlobalSearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
      <PoemFeedPager
        poem={poem}
        currentIndex={0}
        isFirst={true}
        isLast={true}
        onNext={() => {}}
        onPrevious={() => {}}
      />
    </main>
  );
}
