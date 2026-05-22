"use client";

import { useState } from "react";
import Link from "next/link";
import { FaBookmark, FaHistory, FaTimes } from "react-icons/fa";
import Menu, { MenuButton, SearchButton } from "@/components/Menu";
import SettingsDialog from "@/components/SettingsDialog";
import GlobalSearchDialog from "@/components/GlobalSearchDialog";
import { useUpdateNotification } from "@/hooks/useUpdateNotification";
import {
  clearHistory,
  readFavorites,
  readHistory,
  removeFavorite,
  type PoemLibraryEntry,
} from "@/utils/poemLibrary";
import "../styles/PoemLibrary.css";

type LibraryTab = "favorites" | "history";

const persianDateFormatter = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const formatSavedAt = (timestamp: number) =>
  persianDateFormatter.format(new Date(timestamp));

const PoemLibraryList = ({
  entries,
  emptyMessage,
  onRemove,
}: {
  entries: PoemLibraryEntry[];
  emptyMessage: string;
  onRemove?: (key: string) => void;
}) => {
  if (entries.length === 0) {
    return <p className="poem-library-empty">{emptyMessage}</p>;
  }

  return (
    <ul className="poem-library-list">
      {entries.map((entry) => (
        <li key={entry.key} className="poem-library-item">
          <Link href={entry.href} className="poem-library-link">
            <strong>{entry.title}</strong>
            <span>{entry.poetName}</span>
            {entry.excerpt && <p>{entry.excerpt}</p>}
            <time dateTime={new Date(entry.savedAt).toISOString()}>
              {formatSavedAt(entry.savedAt)}
            </time>
          </Link>
          {onRemove && (
            <button
              type="button"
              className="poem-library-remove"
              onClick={() => onRemove(entry.key)}
              aria-label="حذف از ذخیره‌ها"
            >
              <FaTimes />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
};

const PoemLibraryPage = () => {
  const [activeTab, setActiveTab] = useState<LibraryTab>("favorites");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { hasNewUpdates, markAsRead } = useUpdateNotification();

  const favorites = useMemo(() => readFavorites(), [refreshKey]);
  const history = useMemo(() => readHistory(), [refreshKey]);

  const refresh = () => setRefreshKey((value) => value + 1);

  return (
    <div className="poem-library-page" dir="rtl">
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

      <main className="poem-library-shell">
        <header className="poem-library-header">
          <h1>نشان‌شده‌ها</h1>
          <p>شعرهایی که ذخیره کرده‌اید و اخیراً دیده‌اید.</p>
        </header>

        <div className="poem-library-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={activeTab === "favorites" ? "active" : ""}
            aria-selected={activeTab === "favorites"}
            onClick={() => setActiveTab("favorites")}
          >
            <FaBookmark aria-hidden="true" />
            ذخیره‌شده‌ها
          </button>
          <button
            type="button"
            role="tab"
            className={activeTab === "history" ? "active" : ""}
            aria-selected={activeTab === "history"}
            onClick={() => setActiveTab("history")}
          >
            <FaHistory aria-hidden="true" />
            اخیراً دیده‌شده
          </button>
        </div>

        {activeTab === "favorites" ? (
          <PoemLibraryList
            entries={favorites}
            emptyMessage="هنوز شعری ذخیره نکرده‌اید. روی آیکن قلب در صفحه شعر بزنید."
            onRemove={(key) => {
              removeFavorite(key);
              refresh();
            }}
          />
        ) : (
          <>
            {history.length > 0 && (
              <div className="poem-library-actions">
                <button
                  type="button"
                  onClick={() => {
                    clearHistory();
                    refresh();
                  }}
                >
                  پاک کردن تاریخچه
                </button>
              </div>
            )}
            <PoemLibraryList
              entries={history}
              emptyMessage="هنوز شعری نخوانده‌اید."
            />
          </>
        )}
      </main>
    </div>
  );
};

export default PoemLibraryPage;
