"use client";

import Link from "next/link";
import {
  useState,
  useEffect,
  useMemo,
  type ReactNode,
  type WheelEvent,
} from "react";
import { Century, Poet } from "@/types/poet";
import PoetImage from "@/components/PoetImage";
import Menu, { MenuButton, SearchButton } from "@/components/Menu";
import SettingsDialog from "@/components/SettingsDialog";
import GlobalSearchDialog from "@/components/GlobalSearchDialog";
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
        const isExternalPoet = /^https?:\/\//.test(poet.fullUrl);
        const poetPath = isExternalPoet
          ? poet.fullUrl
          : poet.fullUrl.startsWith("/")
            ? poet.fullUrl
            : `/${poet.fullUrl}`;
        const poetKey = `${poet.urlSlug || poet.fullUrl || poet.name}-${poet.id}`;
        const shouldAttachPoetId =
          poet.source === "ganjoor" && Number.isInteger(poet.id) && poet.id > 0;
        const href = shouldAttachPoetId
          ? `${poetPath}${poetPath.includes("?") ? "&" : "?"}poetId=${poet.id}`
          : poetPath;
        const cardContent = (
          <>
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
          </>
        );

        if (isExternalPoet) {
          return (
            <a
              href={poetPath}
              key={poetKey}
              className="poet-card"
              target="_blank"
              rel="noopener noreferrer"
            >
              {cardContent}
            </a>
          );
        }

        return (
          <Link href={href} key={poetKey} className="poet-card">
            {cardContent}
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
  sourceLabel,
  defaultOpen = false,
  children,
}: {
  title: string;
  sourceLabel?: string;
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
      scrollOnOpen
    >
      <div className="category-content">
        {sourceLabel && (
          <div className="poets-source-note">
            <span>منبع:</span>
            <strong>{sourceLabel}</strong>
          </div>
        )}
        {children}
      </div>
    </AccordionItem>
  );
}

const OTHER_MODERN_GROUP = "دیگر شاعران";
const ALL_FILTER_ID = "all";

interface PoetFilterOption {
  id: string;
  label: string;
  matches: (poet: Poet) => boolean;
}

const getPublishedPoets = (poets: Poet[]) =>
  poets
    .filter((poet) => poet.published)
    .sort((a, b) => (a.nickname || a.name).localeCompare(b.nickname || b.name, "fa"));

const getModernFilterOptions = (poets: Poet[]): PoetFilterOption[] => {
  const groups = new Map<string, Poet[]>();

  poets
    .filter((poet) => poet.published)
    .forEach((poet) => {
      const groupName =
        poet.source === "custom"
          ? "شاعران معاصر"
          : poet.sourceGroupName || OTHER_MODERN_GROUP;
      groups.set(groupName, [...(groups.get(groupName) ?? []), poet]);
    });

  return Array.from(groups.entries())
    .map(([label, groupedPoets]) => ({
      id: label,
      label,
      matches: (poet: Poet) => groupedPoets.includes(poet),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "fa"));
};

function FilterablePoetsList({
  poets,
  filters,
}: {
  poets: Poet[];
  filters: PoetFilterOption[];
}) {
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER_ID);
  const publishedPoets = useMemo(() => getPublishedPoets(poets), [poets]);
  const visiblePoets = useMemo(() => {
    if (activeFilter === ALL_FILTER_ID) {
      return publishedPoets;
    }

    const selectedFilter = filters.find((filter) => filter.id === activeFilter);
    return selectedFilter
      ? publishedPoets.filter((poet) => selectedFilter.matches(poet))
      : publishedPoets;
  }, [activeFilter, filters, publishedPoets]);

  useEffect(() => {
    if (
      activeFilter !== ALL_FILTER_ID &&
      !filters.some((filter) => filter.id === activeFilter)
    ) {
      setActiveFilter(ALL_FILTER_ID);
    }
  }, [activeFilter, filters]);

  if (publishedPoets.length === 0) {
    return null;
  }

  const filterButtons = [
    {
      id: ALL_FILTER_ID,
      label: "همه",
      count: publishedPoets.length,
    },
    ...filters.map((filter) => ({
      id: filter.id,
      label: filter.label,
      count: publishedPoets.filter((poet) => filter.matches(poet)).length,
    })),
  ].filter((filter) => filter.count > 0);

  const handleFilterWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }

    event.preventDefault();
    event.currentTarget.scrollLeft -= event.deltaY;
  };

  return (
    <>
      {filterButtons.length > 2 && (
        <div
          className="poets-filter-bar modern-scrollbar"
          role="group"
          aria-label="فیلتر شاعران"
          onWheel={handleFilterWheel}
        >
          {filterButtons.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`poets-filter-button ${activeFilter === filter.id ? "active" : ""
                }`}
              onClick={() => setActiveFilter(filter.id)}
            >
              <span>{filter.label}</span>
              <small>{filter.count.toLocaleString("fa-IR")}</small>
            </button>
          ))}
        </div>
      )}
      <PoetsList poets={visiblePoets} />
    </>
  );
}

function ClassicPoetsList({ centuries }: { centuries: Century[] }) {
  const filters = useMemo(
    () =>
      centuries
        .filter((century) => century.poets.some((poet) => poet.published))
        .map((century) => ({
          id: `century-${century.id}`,
          label: century.name,
          matches: (poet: Poet) =>
            century.poets.some(
              (centuryPoet) =>
                centuryPoet.id === poet.id &&
                centuryPoet.urlSlug === poet.urlSlug,
            ),
        })),
    [centuries],
  );
  const poets = useMemo(
    () => centuries.flatMap((century) => century.poets),
    [centuries],
  );

  return <FilterablePoetsList poets={poets} filters={filters} />;
}

function ModernPoetsList({ poets }: { poets: Poet[] }) {
  const filters = useMemo(() => getModernFilterOptions(poets), [poets]);

  return <FilterablePoetsList poets={poets} filters={filters} />;
}

export default function PoetsContent({
  centuries,
  customPoets = [],
  modernPoets = [],
}: {
  centuries: Century[];
  customPoets?: Poet[];
  modernPoets?: Poet[];
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
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
  const newPoets = [...customPoets, ...modernPoets];
  const hasNewPoets = newPoets.some((poet) => poet.published);
  const hasClassicPoets = otherCenturies.some((century) =>
    century.poets.some((poet) => poet.published),
  );
  return (
    <>
      <MenuButton
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        hasNotification={hasNewUpdates}
      />
      <SearchButton onClick={() => setIsGlobalSearchOpen(true)} />
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
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        initialFilter="poets"
      />

      {featuredCentury && (
        <CenturySection
          century={featuredCentury}
          title="شاعران محبوب"
          defaultOpen
        />
      )}

      <CategorySection title="شاعران نو/جهان" sourceLabel="اکولالیا">
        {hasNewPoets ? (
          <ModernPoetsList poets={newPoets} />
        ) : (
          <p className="poets-empty">به زودی...</p>
        )}
      </CategorySection>

      <CategorySection title="شاعران کهن" sourceLabel="گنجور">
        {hasClassicPoets ? (
          <ClassicPoetsList centuries={otherCenturies} />
        ) : (
          <p className="poets-empty">
            فهرست شاعران کهن از API دریافت نشد. سرور گنجور را بررسی کنید.
          </p>
        )}
      </CategorySection>
    </>
  );
}
