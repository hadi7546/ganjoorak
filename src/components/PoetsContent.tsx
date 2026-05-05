"use client";

import Link from "next/link";
import { useState, useEffect, type ReactNode } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { Century, Poet } from "@/types/poet";
import PoetImage from "@/components/PoetImage";
import LoadingScreen from "@/components/LoadingScreen";
import Menu, { MenuButton } from "@/components/Menu";
import SettingsDialog from "@/components/SettingsDialog";
import { useUpdateNotification } from "@/hooks/useUpdateNotification";
import AccordionItem from "@/components/AccordionItem";
import "@/styles/Poets.css";

function PoetsList({ poets }: { poets: Poet[] }) {
  const publishedPoets = poets.filter((poet) => poet.published);

  if (publishedPoets.length === 0) {
    return null;
  }

  return (
    <div className="poets-grid">
      {publishedPoets.map((poet) => {
        const poetPath = poet.fullUrl.startsWith("/")
          ? poet.fullUrl
          : `/${poet.fullUrl}`;
        const poetKey = `${poet.urlSlug || poet.fullUrl || poet.name}-${poet.id}`;
        const href =
          poet.id > 0
            ? {
                pathname: poetPath,
                query: { poetId: poet.id },
              }
            : poetPath;

        return (
          <Link href={href} key={poetKey} className="poet-card">
            <div className="poet-image-container">
              <PoetImage
                imgUrl={poet.imageUrl}
                alt={poet.name}
                poetSlug={poet.urlSlug}
                width={60}
                height={60}
              />
            </div>
            <h2 className="poet-name">{poet.nickname || poet.name}</h2>
            {poet.nickname && <p className="poet-nickname">{poet.name}</p>}
          </Link>
        );
      })}
    </div>
  );
}

function CenturySection({
  century,
  title,
  defaultOpen = false,
}: {
  century: Century;
  title?: string;
  defaultOpen?: boolean;
}) {
  if (!century.poets.some((poet) => poet.published)) {
    return null;
  }

  return (
    <AccordionItem
      title={title || century.name}
      defaultOpen={defaultOpen}
      containerClassName="century-section"
      questionClassName="poets-question"
      answerClassName="poets-answer"
      titleTag="h3"
    >
      <PoetsList poets={century.poets} />
    </AccordionItem>
  );
}

function CategorySection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <AccordionItem
      title={title}
      defaultOpen={defaultOpen}
      containerClassName="category-section"
      questionClassName="poets-question"
      answerClassName="poets-category-answer"
      titleTag="h2"
    >
      <div className="category-content">{children}</div>
    </AccordionItem>
  );
}

const normalizeSearchText = (value: string) =>
  value
    .trim()
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/\s+/g, " ")
    .toLowerCase();

const poetMatchesQuery = (poet: Poet, query: string) => {
  const haystack = normalizeSearchText(
    [
      poet.name,
      poet.nickname,
      poet.fullUrl,
      poet.urlSlug,
      poet.birthPlace,
      poet.deathPlace,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return haystack.includes(query);
};

export default function PoetsContent({
  centuries,
  customPoets = [],
}: {
  centuries: Century[];
  customPoets?: Poet[];
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { hasNewUpdates, markAsRead } = useUpdateNotification();

  const apiFeaturedCentury = centuries.find((c) => c.id === 0);
  const otherCenturies = centuries.filter((c) => c.id !== 0);
  const pinnedPoets = otherCenturies
    .flatMap((century) => century.poets)
    .filter((poet) => poet.published && poet.pinOrder > 0)
    .sort((a, b) => a.pinOrder - b.pinOrder);
  const featuredCentury =
    apiFeaturedCentury ||
    (pinnedPoets.length > 0
      ? {
          id: 0,
          name: "شاعران محبوب",
          halfCenturyOrder: 0,
          startYear: 0,
          endYear: 0,
          showInTimeLine: false,
          poets: pinnedPoets,
        }
      : null);
  const hasCustomPoets = customPoets.some((poet) => poet.published);
  const hasClassicPoets = otherCenturies.some((century) =>
    century.poets.some((poet) => poet.published),
  );
  const allPoets = [...otherCenturies.flatMap((century) => century.poets), ...customPoets];
  const normalizedSearchQuery = normalizeSearchText(searchQuery);
  const isSearching = normalizedSearchQuery.length > 0;
  const matchingPoets = isSearching
    ? allPoets.filter((poet) => poet.published && poetMatchesQuery(poet, normalizedSearchQuery))
    : [];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <MenuButton
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        hasNotification={hasNewUpdates}
      />
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

      <button
        type="button"
        className="poets-search-button"
        onClick={() => setIsSearchOpen((value) => !value)}
        aria-label={isSearchOpen ? "بستن جستجو" : "جستجوی شاعر"}
      >
        {isSearchOpen ? <FaTimes size={15} /> : <FaSearch size={15} />}
      </button>

      {isSearchOpen && <div className="poets-search-popover">
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="جستجوی شاعر..."
          aria-label="جستجوی شاعر"
          autoFocus
        />
      </div>}

      {isSearching && (
        <CategorySection title="نتایج جستجوی شاعران" defaultOpen>
          {matchingPoets.length > 0 ? (
            <PoetsList poets={matchingPoets} />
          ) : (
            <p className="poets-empty">شاعری پیدا نشد.</p>
          )}
        </CategorySection>
      )}

      {!isSearching && featuredCentury && (
        <CenturySection
          century={featuredCentury}
          title="شاعران محبوب"
          defaultOpen
        />
      )}

      {!isSearching && <CategorySection title="شاعران معاصر">
        {hasCustomPoets ? (
          <PoetsList poets={customPoets} />
        ) : (
          <p className="poets-empty">به زودی...</p>
        )}
      </CategorySection>}

      {!isSearching && <CategorySection title="شاعران کهن">
        {hasClassicPoets ? (
          otherCenturies.map((century) => (
            <CenturySection key={century.id} century={century} />
          ))
        ) : (
          <p className="poets-empty">
            فهرست شاعران کهن از API دریافت نشد. سرور گنجور را بررسی کنید.
          </p>
        )}
      </CategorySection>}
    </>
  );
}
