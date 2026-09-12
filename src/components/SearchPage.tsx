"use client";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  FaCheck,
  FaChevronDown,
  FaExclamationCircle,
  FaFeatherAlt,
  FaHistory,
  FaRedoAlt,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import Menu, { MenuButton, SearchButton } from "@/components/Menu";
import SettingsDialog from "@/components/SettingsDialog";
import GlobalSearchDialog from "@/components/GlobalSearchDialog";
import { useUpdateNotification } from "@/hooks/useUpdateNotification";
import ganjoorApi from "@/api/GanjoorApi";
import echolaliaApi from "@/api/EcholaliaApi";
import type { PoetSlug } from "@/types/poet";
import type {
  GanjoorPagingHeaders,
  GanjoorPoemSearchResult,
  GanjoorSemanticSearchResult,
  GanjoorSemanticVerse,
} from "@/types/ganjoor";
import { getPoemHref, type PoemLibrarySource } from "@/utils/poemLibrary";
import { getIndexedPoetImageUrl } from "@/utils/poetImages";
import {
  findDirectoryPoet,
  findDirectoryPoetByEcholaliaCategory,
  getDirectoryPoetDisplayName,
  getPoetDirectory,
  isPoetDirectoryEnriched,
  loadPoetDirectory,
  type DirectoryPoet,
} from "@/utils/poetDirectory";
import { LruCache, createSessionCache } from "@/utils/searchCache";
import {
  getLocalSearchIndex,
  loadLocalSearchIndex,
  searchLocalIndex,
  type IndexedLocalPoem,
} from "@/utils/localSearchIndex";
import {
  clearRecentSearches,
  forgetRecentSearch,
  readRecentSearches,
  rememberRecentSearch,
} from "@/utils/recentSearches";
import {
  MIN_SEARCH_QUERY_LENGTH,
  formatPersianNumber,
  getVerseSnippet,
  normalizeSearchText,
  pairSemanticVerses,
  parseSearchIntent,
  type VerseSnippet,
} from "@/utils/searchText";
import { logger } from "@/utils/logger";
import "@/styles/SearchPage.css";

type SourceFilter = "all" | PoemLibrarySource;
type SearchMode = "keyword" | "semantic";
type SectionStatus = "idle" | "loading" | "done" | "error";

interface SearchHit {
  key: string;
  id: number;
  title: string;
  poetName: string;
  poetSlug: string;
  source: PoemLibrarySource;
  href: string;
  collection: string | null;
  avatarUrl: string | null;
  snippet: VerseSnippet;
  verses?: GanjoorSemanticVerse[];
}

interface GanjoorSection {
  status: SectionStatus;
  hits: SearchHit[];
  paging: GanjoorPagingHeaders;
  batchStart: number;
}

interface ListSection {
  status: SectionStatus;
  hits: SearchHit[];
}

interface CachedSemanticPage {
  hits: SearchHit[];
  detectedPoetName: string | null;
  detectedCategoryName: string | null;
}

interface CachedFirstPage {
  ganjoor: Pick<GanjoorSection, "hits" | "paging"> | null;
  local: SearchHit[] | null;
  echolalia: SearchHit[] | null;
  semantic: CachedSemanticPage | null;
}

interface CachedGanjoorPage {
  hits: SearchHit[];
  paging: GanjoorPagingHeaders;
}

interface SearchPlan {
  key: string;
  shouldSearch: boolean;
  term: string;
  normalizedQuery: string;
  poet: DirectoryPoet | null;
  poetFromIntent: boolean;
  rewritten: boolean;
  mode: SearchMode;
  disableScopeDetection: boolean;
  includeGanjoor: boolean;
  includeLocal: boolean;
  includeEcholalia: boolean;
  includeSemantic: boolean;
}

const PAGE_SIZE = 20;
const ECHOLALIA_PAGE_SIZE = 12;
const SEMANTIC_TOP_K = 10;
const DEBOUNCE_MS = 250;
const SEMANTIC_DEBOUNCE_MS = 700;
const DIRECTORY_WAIT_MS = 600;
const STRIP_LIMIT = 12;

const SOURCE_FILTERS: Array<{ value: SourceFilter; label: string }> = [
  { value: "all", label: "همه" },
  { value: "ganjoor", label: "گنجور" },
  { value: "echolalia", label: "اکولالیا" },
  { value: "custom", label: "محلی" },
];
const SEARCH_MODES: Array<{ value: SearchMode; label: string }> = [
  { value: "keyword", label: "متنی" },
  { value: "semantic", label: "معنایی" },
];
const SOURCE_LABELS: Record<PoemLibrarySource, string> = {
  ganjoor: "گنجور",
  custom: "محلی",
  echolalia: "اکولالیا",
};
const EXAMPLE_QUERIES = [
  "رخ یار",
  "عشق",
  "شعر حافظ درمورد عشق",
  "باران",
  "تنهایی",
  "مولانا درمورد جدایی",
];
const EXAMPLE_SEMANTIC_QUERIES = [
  "شعری در مورد بی‌وفایی دنیا",
  "غم دوری یار",
  "شعر حافظ در مورد عشق",
  "شکوه از روزگار",
];
const MAX_RESTORED_HITS = 60;
const SCROLL_STORAGE_KEY = "ganjoorak:search-scroll:v1";

const emptyPaging: GanjoorPagingHeaders = {
  totalCount: 0,
  pageSize: PAGE_SIZE,
  currentPage: 1,
  totalPages: 0,
  hasPreviousPage: false,
  hasNextPage: false,
};
const idleGanjoor: GanjoorSection = {
  status: "idle",
  hits: [],
  paging: emptyPaging,
  batchStart: 0,
};
const idleList: ListSection = { status: "idle", hits: [] };

const firstPageCache = new LruCache<CachedFirstPage>(40);
const pageCache = new LruCache<CachedGanjoorPage>(80);
// De-duplicates the sentinel-triggered load and the eager N+1 prefetch.
const inflightPages = new Map<string, Promise<CachedGanjoorPage>>();
const sessionFirstPageCache = createSessionCache<CachedFirstPage>(
  "ganjoorak:search-results:v2",
  8,
);

interface StoredScroll {
  key: string;
  y: number;
}

const readStoredScroll = (): StoredScroll | null => {
  try {
    const raw = window.sessionStorage.getItem(SCROLL_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredScroll) : null;
  } catch {
    return null;
  }
};

const writeStoredScroll = (value: StoredScroll | null) => {
  try {
    if (value) {
      window.sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(value));
    } else {
      window.sessionStorage.removeItem(SCROLL_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures; scroll restoration is best-effort.
  }
};

// Only restore scroll when the user came back through history, never when
// they type the same query again later.
let lastPopstateAt = 0;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    lastPopstateAt = Date.now();
  });
}
const arrivedViaHistory = () => {
  if (Date.now() - lastPopstateAt < 3000) {
    return true;
  }
  const [navigation] = performance.getEntriesByType?.("navigation") ?? [];
  return (navigation as PerformanceNavigationTiming | undefined)?.type === "back_forward";
};

const isAbortError = (error: unknown, signal?: AbortSignal) =>
  Boolean(signal?.aborted) ||
  (typeof error === "object" &&
    error !== null &&
    ((error as { name?: string }).name === "CanceledError" ||
      (error as { name?: string }).name === "AbortError" ||
      (error as { code?: string }).code === "ERR_CANCELED"));

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const dedupeHits = (hits: SearchHit[]) => {
  const seen = new Set<string>();
  return hits.filter((hit) => {
    if (seen.has(hit.key)) {
      return false;
    }
    seen.add(hit.key);
    return true;
  });
};

const mapGanjoorHit = (
  poem: GanjoorPoemSearchResult,
  term: string,
): SearchHit => ({
  key: `ganjoor:${poem.id}`,
  id: poem.id,
  title: poem.title,
  poetName: poem.poetName,
  poetSlug: poem.poetSlug,
  source: "ganjoor",
  href: getPoemHref({
    id: poem.id,
    source: "ganjoor",
    poetSlug: poem.poetSlug,
    fullUrl: poem.fullUrl,
  }),
  collection: poem.bookTitle,
  avatarUrl: getIndexedPoetImageUrl("ganjoor", poem.poetSlug),
  snippet: getVerseSnippet(poem.plainText || poem.poemSummary || "", term),
});

const mapSemanticHit = (
  poem: GanjoorSemanticSearchResult,
  term: string,
): SearchHit => ({
  key: `semantic:${poem.poemId}`,
  id: poem.poemId,
  title: poem.title,
  poetName: poem.poetName,
  poetSlug: poem.poetSlug,
  source: "ganjoor",
  href: getPoemHref({
    id: poem.poemId,
    source: "ganjoor",
    poetSlug: poem.poetSlug,
    fullUrl: poem.fullUrl,
  }),
  collection: poem.bookTitle,
  avatarUrl: getIndexedPoetImageUrl("ganjoor", poem.poetSlug),
  snippet: getVerseSnippet(
    poem.verses.map((verse) => verse.text).join("\n") || poem.poemSummary || "",
    term,
  ),
  verses: poem.verses,
});

const mapLocalHit = (poem: IndexedLocalPoem, term: string): SearchHit => ({
  key: `custom:${poem.slug}:${poem.id}`,
  id: poem.id,
  title: poem.title,
  poetName: poem.poetName,
  poetSlug: poem.slug,
  source: "custom",
  href: getPoemHref({
    id: poem.id,
    source: "custom",
    poetSlug: poem.slug,
    fullUrl: "",
  }),
  collection: poem.collection,
  avatarUrl: `/images/poets/${poem.slug}.jpeg`,
  snippet: getVerseSnippet(poem.text, term),
});

/**
 * Synchronous once the index is warm (it is preloaded on mount), so local
 * results appear in the same frame as the keystroke commit.
 */
const searchLocalPoems = (
  term: string,
  poet: DirectoryPoet | null,
): SearchHit[] | Promise<SearchHit[]> => {
  const normalizedQuery = normalizeSearchText(term);
  if (normalizedQuery.length < MIN_SEARCH_QUERY_LENGTH) {
    return [];
  }
  const slug = poet ? (poet.urlSlug as PoetSlug) : null;
  const run = (poems: IndexedLocalPoem[]) =>
    searchLocalIndex(poems, normalizedQuery, slug).map((poem) =>
      mapLocalHit(poem, term),
    );

  const ready = getLocalSearchIndex();
  return ready ? run(ready) : loadLocalSearchIndex().then(run);
};

const searchEcholaliaPoems = async (
  term: string,
  poet: DirectoryPoet | null,
  directory: DirectoryPoet[],
  signal: AbortSignal,
): Promise<SearchHit[]> => {
  const posts = await echolaliaApi.searchPosts(term, {
    pageSize: ECHOLALIA_PAGE_SIZE,
    categoryId: poet?.source === "echolalia" ? poet.id : undefined,
    signal,
  });

  return posts.flatMap((post) => {
    const owner =
      poet?.source === "echolalia"
        ? poet
        : findDirectoryPoetByEcholaliaCategory(post.categoryIds, directory);
    if (!owner) {
      return [];
    }
    return [
      {
        key: `echolalia:${owner.urlSlug}:${post.id}`,
        id: post.id,
        title: post.title,
        poetName: getDirectoryPoetDisplayName(owner),
        poetSlug: owner.urlSlug,
        source: "echolalia" as const,
        href: getPoemHref({
          id: post.id,
          source: "echolalia",
          poetSlug: owner.urlSlug,
          fullUrl: "",
        }),
        collection: null,
        avatarUrl: owner.imageUrl,
        snippet: getVerseSnippet(post.plainText || post.excerpt, term),
      },
    ];
  });
};

const buildPlan = (
  query: string,
  sourceFilter: SourceFilter,
  explicitPoet: DirectoryPoet | null,
  exact: boolean,
  directory: DirectoryPoet[],
  mode: SearchMode,
  disableScopeDetection: boolean,
): SearchPlan => {
  const normalizedQuery = normalizeSearchText(query);
  const shouldSearch = normalizedQuery.length >= MIN_SEARCH_QUERY_LENGTH;
  const isSemantic = mode === "semantic";

  let term = isSemantic ? query.trim() : normalizedQuery;
  let poet = explicitPoet;
  let poetFromIntent = false;
  if (shouldSearch && !exact && !isSemantic) {
    const intent = parseSearchIntent(query, explicitPoet ? [] : directory);
    term = intent.term;
    if (!explicitPoet && intent.poet) {
      poet = intent.poet as DirectoryPoet;
      poetFromIntent = true;
    }
  }

  const allows = (source: PoemLibrarySource) =>
    (sourceFilter === "all" || sourceFilter === source) &&
    (!poet || poet.source === source);

  const includeSemantic = isSemantic && (!poet || poet.source === "ganjoor");
  const includeGanjoor = !isSemantic && allows("ganjoor");
  const includeLocal = !isSemantic && allows("custom");
  const includeEcholalia = !isSemantic && allows("echolalia");

  return {
    key: [
      isSemantic ? "s" : "k",
      term,
      poet ? poet.key : "",
      includeGanjoor ? "g" : "",
      includeLocal ? "l" : "",
      includeEcholalia ? "e" : "",
      includeSemantic && disableScopeDetection ? "global" : "",
    ].join("|"),
    shouldSearch,
    term,
    normalizedQuery,
    poet,
    poetFromIntent,
    rewritten: !isSemantic && term !== normalizedQuery,
    mode,
    disableScopeDetection: isSemantic && disableScopeDetection,
    includeGanjoor,
    includeLocal,
    includeEcholalia,
    includeSemantic,
  };
};

const HighlightedText = ({
  text,
  highlight,
}: {
  text: string;
  highlight: { start: number; end: number } | null;
}) => {
  if (!highlight || highlight.start >= highlight.end) {
    return <>{text}</>;
  }

  return (
    <>
      {text.slice(0, highlight.start)}
      <mark className="search-highlight">
        {text.slice(highlight.start, highlight.end)}
      </mark>
      {text.slice(highlight.end)}
    </>
  );
};

const PoetAvatar = memo(function PoetAvatar({
  src,
  name,
  size = 28,
}: {
  src: string | null;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0) || "؟";

  if (!src || failed) {
    return (
      <span
        className="search-avatar search-avatar-fallback"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {initial}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className="search-avatar"
      onError={() => setFailed(true)}
    />
  );
});

const ResultCard = memo(function ResultCard({
  hit,
  delayIndex,
  compact = false,
}: {
  hit: SearchHit;
  delayIndex: number;
  compact?: boolean;
}) {
  const { snippet } = hit;
  const couplets = hit.verses?.length ? pairSemanticVerses(hit.verses) : null;

  return (
    <motion.li
      className={compact ? "search-card search-card-compact" : "search-card"}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.24,
        ease: "easeOut",
        delay: Math.min(delayIndex * 0.035, 0.28),
      }}
    >
      <Link href={hit.href} className="search-card-link">
        <span className="search-card-head">
          <PoetAvatar src={hit.avatarUrl} name={hit.poetName} size={compact ? 24 : 28} />
          <span className="search-card-crumb">
            <span>{hit.poetName}</span>
            {hit.collection && (
              <>
                <span className="search-card-crumb-sep" aria-hidden="true">
                  ›
                </span>
                <span>{hit.collection}</span>
              </>
            )}
          </span>
          <span className={`search-card-source is-${hit.source}`}>
            {SOURCE_LABELS[hit.source]}
          </span>
        </span>
        <span className="search-card-title">{hit.title}</span>
        {couplets ? (
          <span className="search-card-verses">
            {couplets.map((couplet) =>
              couplet.text ? (
                <span key={couplet.key} className="search-card-verse-line">
                  {couplet.text}
                </span>
              ) : (
                <span key={couplet.key} className="search-card-couplet">
                  <span>{couplet.right}</span>
                  <span>{couplet.left}</span>
                </span>
              ),
            )}
          </span>
        ) : (
          <>
            {snippet.matchLine && (
              <span className="search-card-match">
                <HighlightedText text={snippet.matchLine} highlight={snippet.highlight} />
              </span>
            )}
            {!compact && snippet.contextLine && (
              <span className="search-card-context">{snippet.contextLine}</span>
            )}
          </>
        )}
      </Link>
    </motion.li>
  );
});

const SkeletonCard = ({ compact = false }: { compact?: boolean }) => (
  <li
    className={
      compact
        ? "search-card search-card-compact search-skeleton-card"
        : "search-card search-skeleton-card"
    }
    aria-hidden="true"
  >
    <span className="search-card-head">
      <span className="search-skeleton search-skeleton-avatar" />
      <span className="search-skeleton search-skeleton-line short" />
    </span>
    <span className="search-skeleton search-skeleton-line medium" />
    <span className="search-skeleton search-skeleton-line long" />
    {!compact && <span className="search-skeleton search-skeleton-line medium faint" />}
  </li>
);

const PoetCombobox = memo(function PoetCombobox({
  poets,
  value,
  onChange,
}: {
  poets: DirectoryPoet[];
  value: DirectoryPoet | null;
  onChange: (poet: DirectoryPoet | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const listboxId = useId();

  const normalizedFilter = normalizeSearchText(filter);
  const options = useMemo(() => {
    const matches = normalizedFilter
      ? poets.filter((poet) =>
          normalizeSearchText(`${poet.nickname ?? ""} ${poet.name}`).includes(
            normalizedFilter,
          ),
        )
      : poets;
    return matches.slice(0, 60);
  }, [normalizedFilter, poets]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setFilter("");
    setActiveIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 20);

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [normalizedFilter]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const active = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  const select = (poet: DirectoryPoet | null) => {
    onChange(poet);
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (options[activeIndex]) {
        select(options[activeIndex]);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div className="search-poet-filter" ref={rootRef}>
      <div className={`search-poet-trigger-wrap${value ? " has-value" : ""}`}>
        <button
          type="button"
          className="search-poet-trigger"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          onClick={() => setIsOpen((open) => !open)}
        >
          {value ? (
            <>
              <PoetAvatar src={value.imageUrl} name={getDirectoryPoetDisplayName(value)} size={22} />
              <span className="search-poet-trigger-label">
                {getDirectoryPoetDisplayName(value)}
              </span>
            </>
          ) : (
            <>
              <FaFeatherAlt aria-hidden="true" />
              <span className="search-poet-trigger-label">همه شاعران</span>
            </>
          )}
          <FaChevronDown className="search-poet-trigger-chevron" aria-hidden="true" />
        </button>
        {value && (
          <button
            type="button"
            className="search-poet-clear"
            onClick={() => select(null)}
            aria-label="حذف فیلتر شاعر"
          >
            <FaTimes aria-hidden="true" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="search-poet-popover" role="presentation">
          <div className="search-poet-search">
            <FaSearch aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="نام شاعر…"
              aria-label="جستجوی شاعر"
              aria-controls={listboxId}
              aria-activedescendant={
                options[activeIndex] ? `${listboxId}-${options[activeIndex].key}` : undefined
              }
              role="combobox"
              aria-expanded="true"
              autoComplete="off"
            />
          </div>
          <ul
            className="search-poet-list modern-scrollbar"
            role="listbox"
            id={listboxId}
            ref={listRef}
          >
            {!normalizedFilter && (
              <li
                role="option"
                aria-selected={!value}
                className={`search-poet-option${!value ? " is-selected" : ""}`}
                onClick={() => select(null)}
              >
                <span className="search-avatar search-avatar-fallback" aria-hidden="true">
                  <FaFeatherAlt />
                </span>
                <span className="search-poet-option-name">همه شاعران</span>
                {!value && <FaCheck className="search-poet-option-check" aria-hidden="true" />}
              </li>
            )}
            {options.map((poet, index) => {
              const showGroup = index === 0 || options[index - 1].source !== poet.source;
              const isSelected = value?.key === poet.key;
              return (
                <li key={poet.key} className="search-poet-option-wrap">
                  {showGroup && (
                    <span className="search-poet-group" aria-hidden="true">
                      {SOURCE_LABELS[poet.source]}
                    </span>
                  )}
                  <div
                    id={`${listboxId}-${poet.key}`}
                    role="option"
                    aria-selected={isSelected}
                    data-index={index}
                    className={`search-poet-option${index === activeIndex ? " is-active" : ""}${
                      isSelected ? " is-selected" : ""
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => select(poet)}
                  >
                    <PoetAvatar src={poet.imageUrl} name={getDirectoryPoetDisplayName(poet)} size={28} />
                    <span className="search-poet-option-name">
                      {getDirectoryPoetDisplayName(poet)}
                      {poet.nickname && poet.nickname !== poet.name && (
                        <small>{poet.name}</small>
                      )}
                    </span>
                    {isSelected && <FaCheck className="search-poet-option-check" aria-hidden="true" />}
                  </div>
                </li>
              );
            })}
            {options.length === 0 && (
              <li className="search-poet-empty">شاعری با این نام پیدا نشد.</li>
            )}
            {!normalizedFilter && poets.length > options.length && (
              <li className="search-poet-hint">
                برای دیدن شاعران دیگر، نام را تایپ کنید.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
});

const SourceSegmentedControl = memo(function SourceSegmentedControl({
  value,
  onChange,
}: {
  value: SourceFilter;
  onChange: (value: SourceFilter) => void;
}) {
  return (
    <div className="search-segmented" role="group" aria-label="منبع">
      {SOURCE_FILTERS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`search-segment${value === option.value ? " is-active" : ""}`}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
});

const SearchModeControl = memo(function SearchModeControl({
  value,
  onChange,
}: {
  value: SearchMode;
  onChange: (value: SearchMode) => void;
}) {
  return (
    <div className="search-segmented" role="group" aria-label="شیوه جستجو">
      {SEARCH_MODES.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`search-segment${value === option.value ? " is-active" : ""}`}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
});

const SearchPage = () => {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const urlSource = searchParams.get("source");
  const urlPoetKey = searchParams.get("poet");
  const exact = searchParams.get("exact") === "1";
  const searchMode: SearchMode =
    searchParams.get("mode") === "semantic" ? "semantic" : "keyword";
  const disableScopeDetection = searchParams.get("global") === "1";
  const sourceFilter: SourceFilter = SOURCE_FILTERS.some(
    (option) => option.value === urlSource,
  )
    ? (urlSource as SourceFilter)
    : "all";

  const [draft, setDraft] = useState(urlQuery);
  const [directory, setDirectory] = useState<DirectoryPoet[]>(getPoetDirectory);
  const [ganjoor, setGanjoor] = useState<GanjoorSection>(idleGanjoor);
  const [local, setLocal] = useState<ListSection>(idleList);
  const [echolalia, setEcholalia] = useState<ListSection>(idleList);
  const [semantic, setSemantic] = useState<ListSection>(idleList);
  const [semanticScope, setSemanticScope] = useState<{
    poet: string | null;
    category: string | null;
  }>({ poet: null, category: null });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [isCompact, setIsCompact] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { hasNewUpdates, markAsRead } = useUpdateNotification();

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const stickySentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const lastCommittedRef = useRef(urlQuery);
  const bypassCacheRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const restoreScrollRef = useRef<number | null>(null);
  const ganjoorRef = useRef(ganjoor);
  ganjoorRef.current = ganjoor;
  const semanticRef = useRef(semantic);
  semanticRef.current = semantic;
  const semanticScopeRef = useRef(semanticScope);
  semanticScopeRef.current = semanticScope;

  const selectedPoet = useMemo(
    () => findDirectoryPoet(urlPoetKey, directory),
    [directory, urlPoetKey],
  );

  const plan = useMemo(
    () =>
      buildPlan(
        urlQuery,
        sourceFilter,
        selectedPoet,
        exact,
        directory,
        searchMode,
        disableScopeDetection,
      ),
    [directory, disableScopeDetection, exact, searchMode, selectedPoet, sourceFilter, urlQuery],
  );
  const planRef = useRef(plan);
  planRef.current = plan;

  // Instant static directory first; Ganjoor nicknames merge in when ready.
  // The local poem index is warmed at the same time so typing hits it in sync.
  useEffect(() => {
    setDirectory(getPoetDirectory());
    setRecentSearches(readRecentSearches());
    void loadLocalSearchIndex();
    let cancelled = false;
    loadPoetDirectory().then((next) => {
      if (!cancelled) {
        setDirectory(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Autofocus only where a keyboard is already present; don't pop the mobile keyboard.
  useEffect(() => {
    if (
      !urlQuery &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      inputRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const node = stickySentinelRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCompact(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const updateParams = useCallback(
    (next: {
      q?: string;
      source?: SourceFilter;
      poet?: string | null;
      exact?: boolean;
      mode?: SearchMode;
      global?: boolean;
    }) => {
      const current = new URLSearchParams(window.location.search);
      const params = new URLSearchParams();
      const query = (next.q ?? current.get("q") ?? "").trim();
      const source = next.source ?? current.get("source") ?? "all";
      const poet = next.poet === undefined ? current.get("poet") : next.poet;
      const exactFlag =
        next.exact === undefined ? current.get("exact") === "1" : next.exact;
      const mode: SearchMode =
        next.mode ?? (current.get("mode") === "semantic" ? "semantic" : "keyword");
      const globalFlag =
        next.global === undefined ? current.get("global") === "1" : next.global;
      if (query) {
        params.set("q", query);
      }
      if (mode === "semantic") {
        params.set("mode", "semantic");
      }
      if (source && source !== "all" && mode !== "semantic") {
        params.set("source", source);
      }
      if (poet) {
        params.set("poet", poet);
      }
      if (exactFlag && query && mode !== "semantic") {
        params.set("exact", "1");
      }
      if (globalFlag && query && mode === "semantic") {
        params.set("global", "1");
      }
      const href = params.toString() ? `/search?${params.toString()}` : "/search";
      if (`${window.location.pathname}${window.location.search}` !== href) {
        // Native history integrates with Next's useSearchParams and skips the
        // server round-trip router.replace would make on every keystroke.
        // The state must be null: passing Next's own history state makes the
        // patched replaceState treat this as an internal call and ignore it.
        window.history.replaceState(null, "", href);
      }
    },
    [],
  );

  const commitDraft = useCallback(
    (value: string) => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      lastCommittedRef.current = value.trim();
      updateParams({ q: value, exact: false });
    },
    [updateParams],
  );

  const rememberQuery = useCallback((value: string) => {
    if (normalizeSearchText(value).length >= MIN_SEARCH_QUERY_LENGTH) {
      setRecentSearches(rememberRecentSearch(value));
    }
  }, []);

  // Deliberate searches (Enter, chips, opening a poem) become "recent"; the
  // intermediate states of typing do not.
  const submitQuery = useCallback(
    (value: string) => {
      setDraft(value);
      commitDraft(value);
      rememberQuery(value);
    },
    [commitDraft, rememberQuery],
  );

  // Back/forward, chips and the modal push a query into the URL; mirror it.
  useEffect(() => {
    if (urlQuery !== lastCommittedRef.current) {
      lastCommittedRef.current = urlQuery;
      setDraft(urlQuery);
    }
  }, [urlQuery]);

  // Debounced search-as-you-type.
  useEffect(() => {
    if (draft.trim() === lastCommittedRef.current) {
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      commitDraft(draft);
    }, searchMode === "semantic" ? SEMANTIC_DEBOUNCE_MS : DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [commitDraft, draft, searchMode]);

  useEffect(() => {
    const currentPlan = planRef.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const isCurrent = () => requestIdRef.current === requestId;
    loadingMoreRef.current = false;
    setIsLoadingMore(false);
    setLoadMoreError(false);

    if (!currentPlan.shouldSearch) {
      setGanjoor(idleGanjoor);
      setLocal(idleList);
      setEcholalia(idleList);
      setSemantic(idleList);
      setSemanticScope({ poet: null, category: null });
      return;
    }

    const bypassCache = bypassCacheRef.current;
    bypassCacheRef.current = false;

    const applyCached = (cached: CachedFirstPage) => {
      setGanjoor(
        cached.ganjoor
          ? { status: "done", hits: cached.ganjoor.hits, paging: cached.ganjoor.paging, batchStart: 0 }
          : idleGanjoor,
      );
      setLocal(cached.local ? { status: "done", hits: cached.local } : idleList);
      setEcholalia(
        cached.echolalia ? { status: "done", hits: cached.echolalia } : idleList,
      );
      setSemantic(
        cached.semantic ? { status: "done", hits: cached.semantic.hits } : idleList,
      );
      setSemanticScope(
        cached.semantic
          ? {
              poet: cached.semantic.detectedPoetName,
              category: cached.semantic.detectedCategoryName,
            }
          : { poet: null, category: null },
      );
      // Coming back from a poem: the list is restored in this same commit, so
      // the saved offset is valid again once React has painted it.
      const stored = readStoredScroll();
      if (stored && stored.key === currentPlan.key && stored.y > 0 && arrivedViaHistory()) {
        restoreScrollRef.current = stored.y;
      } else if (stored) {
        writeStoredScroll(null);
      }
    };

    const run = async () => {
      if (
        !currentPlan.includeSemantic &&
        !isPoetDirectoryEnriched() &&
        currentPlan.normalizedQuery.includes(" ")
      ) {
        // First visit of the session: give the nickname catalog a moment so
        // «شعر فردوسی…» resolves the poet on the first request.
        await Promise.race([loadPoetDirectory(), sleep(DIRECTORY_WAIT_MS)]);
        if (!isCurrent()) {
          return;
        }
        const refreshed = buildPlan(
          urlQuery,
          sourceFilter,
          findDirectoryPoet(urlPoetKey, getPoetDirectory()),
          exact,
          getPoetDirectory(),
          searchMode,
          disableScopeDetection,
        );
        if (refreshed.key !== currentPlan.key) {
          // The directory state update re-runs this effect with the new plan.
          return;
        }
      }

      if (!bypassCache) {
        const cached =
          firstPageCache.get(currentPlan.key) ??
          sessionFirstPageCache.get(currentPlan.key);
        if (cached) {
          firstPageCache.set(currentPlan.key, cached);
          applyCached(cached);
          return;
        }
      }

      const { signal } = controller;
      const activeDirectory = getPoetDirectory();

      setGanjoor((previous) =>
        currentPlan.includeGanjoor
          ? { ...previous, status: "loading" }
          : idleGanjoor,
      );
      setLocal((previous) =>
        currentPlan.includeLocal ? { ...previous, status: "loading" } : idleList,
      );
      setEcholalia((previous) =>
        currentPlan.includeEcholalia
          ? { ...previous, status: "loading" }
          : idleList,
      );
      setSemantic((previous) =>
        currentPlan.includeSemantic
          ? { ...previous, status: "loading" }
          : idleList,
      );
      if (!currentPlan.includeSemantic) {
        setSemanticScope({ poet: null, category: null });
      }

      const poetId =
        currentPlan.poet?.source === "ganjoor" ? currentPlan.poet.id : undefined;

      const ganjoorTask: Promise<CachedGanjoorPage | null> = currentPlan.includeGanjoor
        ? ganjoorApi
            .searchPoems(currentPlan.term, {
              pageNumber: 1,
              pageSize: PAGE_SIZE,
              poetId,
              signal,
            })
            .then((page) => {
              const result = {
                hits: dedupeHits(page.items.map((poem) => mapGanjoorHit(poem, currentPlan.term))),
                paging: page.paging,
              };
              if (isCurrent()) {
                setGanjoor({ status: "done", hits: result.hits, paging: result.paging, batchStart: 0 });
              }
              return result;
            })
            .catch((error) => {
              if (!isAbortError(error, signal) && isCurrent()) {
                logger.error("Ganjoor search failed:", error);
                setGanjoor({ ...idleGanjoor, status: "error" });
              }
              return null;
            })
        : Promise.resolve(null);

      let localTask: Promise<SearchHit[] | null> = Promise.resolve(null);
      if (currentPlan.includeLocal) {
        const localResult = searchLocalPoems(
          currentPlan.term,
          currentPlan.poet?.source === "custom" ? currentPlan.poet : null,
        );
        if (Array.isArray(localResult)) {
          // Warm index: resolve synchronously so local hits paint with the query.
          setLocal({ status: "done", hits: localResult });
          localTask = Promise.resolve(localResult);
        } else {
          localTask = localResult
            .then((hits) => {
              if (isCurrent()) {
                setLocal({ status: "done", hits });
              }
              return hits;
            })
            .catch((error) => {
              if (isCurrent()) {
                logger.error("Local search failed:", error);
                setLocal({ status: "error", hits: [] });
              }
              return null;
            });
        }
      }

      const echolaliaTask: Promise<SearchHit[] | null> = currentPlan.includeEcholalia
        ? searchEcholaliaPoems(
            currentPlan.term,
            currentPlan.poet?.source === "echolalia" ? currentPlan.poet : null,
            activeDirectory,
            signal,
          )
            .then((hits) => {
              if (isCurrent()) {
                setEcholalia({ status: "done", hits });
              }
              return hits;
            })
            .catch((error) => {
              if (!isAbortError(error, signal) && isCurrent()) {
                logger.warn("Echolalia search failed:", error);
                setEcholalia({ status: "error", hits: [] });
              }
              return null;
            })
        : Promise.resolve(null);

      const semanticTask: Promise<CachedSemanticPage | null> = currentPlan.includeSemantic
        ? ganjoorApi
            .searchPoemsSemantic(currentPlan.term, {
              topK: SEMANTIC_TOP_K,
              poetId,
              disableScopeDetection: currentPlan.disableScopeDetection,
              signal,
            })
            .then((page) => {
              const result: CachedSemanticPage = {
                hits: dedupeHits(
                  page.results.map((poem) => mapSemanticHit(poem, currentPlan.term)),
                ),
                detectedPoetName: page.detectedPoetName,
                detectedCategoryName: page.detectedCategoryName,
              };
              if (isCurrent()) {
                setSemantic({ status: "done", hits: result.hits });
                setSemanticScope({
                  poet: result.detectedPoetName,
                  category: result.detectedCategoryName,
                });
              }
              return result;
            })
            .catch((error) => {
              if (!isAbortError(error, signal) && isCurrent()) {
                logger.error("Semantic search failed:", error);
                setSemantic({ status: "error", hits: [] });
                setSemanticScope({ poet: null, category: null });
              }
              return null;
            })
        : Promise.resolve(null);

      const [ganjoorResult, localResult, echolaliaResult, semanticResult] = await Promise.all([
        ganjoorTask,
        localTask,
        echolaliaTask,
        semanticTask,
      ]);
      if (!isCurrent()) {
        return;
      }

      const complete =
        (!currentPlan.includeGanjoor || ganjoorResult !== null) &&
        (!currentPlan.includeLocal || localResult !== null) &&
        (!currentPlan.includeEcholalia || echolaliaResult !== null) &&
        (!currentPlan.includeSemantic || semanticResult !== null);
      if (complete) {
        const cached: CachedFirstPage = {
          ganjoor: ganjoorResult,
          local: localResult,
          echolalia: echolaliaResult,
          semantic: semanticResult,
        };
        firstPageCache.set(currentPlan.key, cached);
        sessionFirstPageCache.set(currentPlan.key, cached);
      }
    };

    void run();

    return () => {
      controller.abort();
    };
    // The plan key captures every input that changes the request set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.key, plan.shouldSearch, retryToken]);

  /** Cached, in-flight-shared fetch of one Ganjoor page for the current plan. */
  const fetchGanjoorPage = useCallback(
    (currentPlan: SearchPlan, pageNumber: number, signal?: AbortSignal) => {
      const cacheKey = `${currentPlan.key}|${pageNumber}`;
      const cached = pageCache.get(cacheKey);
      if (cached) {
        return Promise.resolve(cached);
      }
      const inflight = inflightPages.get(cacheKey);
      if (inflight) {
        return inflight;
      }
      const request = ganjoorApi
        .searchPoems(currentPlan.term, {
          pageNumber,
          pageSize: PAGE_SIZE,
          poetId:
            currentPlan.poet?.source === "ganjoor" ? currentPlan.poet.id : undefined,
          signal,
        })
        .then((response) => {
          const page: CachedGanjoorPage = {
            hits: response.items.map((poem) => mapGanjoorHit(poem, currentPlan.term)),
            paging: response.paging,
          };
          pageCache.set(cacheKey, page);
          return page;
        })
        .finally(() => {
          inflightPages.delete(cacheKey);
        });
      inflightPages.set(cacheKey, request);
      return request;
    },
    [],
  );

  const loadMore = useCallback(async () => {
    const currentPlan = planRef.current;
    const state = ganjoorRef.current;
    if (
      !currentPlan.includeGanjoor ||
      state.status !== "done" ||
      !state.paging.hasNextPage ||
      loadingMoreRef.current
    ) {
      return;
    }

    const pageNumber = state.paging.currentPage + 1;
    const requestId = requestIdRef.current;
    const signal = controllerRef.current?.signal;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(false);

    try {
      const nextPage = await fetchGanjoorPage(currentPlan, pageNumber, signal);
      if (requestIdRef.current !== requestId) {
        return;
      }
      setGanjoor((previous) => ({
        status: "done",
        hits: dedupeHits([...previous.hits, ...nextPage.hits]),
        paging: nextPage.paging,
        batchStart: previous.hits.length,
      }));
    } catch (error) {
      if (!isAbortError(error, signal) && requestIdRef.current === requestId) {
        logger.error("Loading more search results failed:", error);
        setLoadMoreError(true);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        loadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [fetchGanjoorPage]);

  const canLoadMore =
    plan.includeGanjoor && ganjoor.status === "done" && ganjoor.paging.hasNextPage;

  // Prefetch page N+1 as soon as page N is on screen so the sentinel hit is
  // served from cache. Failures are silent; loadMore surfaces them if needed.
  useEffect(() => {
    if (!canLoadMore) {
      return;
    }
    const signal = controllerRef.current?.signal;
    fetchGanjoorPage(planRef.current, ganjoor.paging.currentPage + 1, signal).catch(
      () => undefined,
    );
  }, [canLoadMore, fetchGanjoorPage, ganjoor.paging.currentPage]);

  // Scroll restoration after cached results were applied (back navigation).
  useEffect(() => {
    const target = restoreScrollRef.current;
    if (target === null || ganjoor.status === "loading") {
      return;
    }
    restoreScrollRef.current = null;
    writeStoredScroll(null);
    const apply = () => window.scrollTo({ top: target, behavior: "auto" });
    window.requestAnimationFrame(apply);
    // The route transition swaps page DOM for a couple of hundred ms and can
    // knock the window back to the top; re-assert once if that happened.
    window.setTimeout(() => {
      if (window.scrollY < 8 && listRef.current?.isConnected) {
        apply();
      }
    }, 280);
  }, [ganjoor.status, ganjoor.hits.length, local.status, echolalia.status, semantic.status, semantic.hits.length]);

  /**
   * Snapshot what is on screen (up to a few pages) plus the scroll offset so
   * returning from a poem is instant and lands where the user left off.
   */
  const persistForBackNavigation = useCallback(() => {
    const currentPlan = planRef.current;
    const state = ganjoorRef.current;
    if (!currentPlan.shouldSearch) {
      return;
    }
    const cached = firstPageCache.get(currentPlan.key);
    if (cached) {
      const restored: CachedFirstPage = {
        ...cached,
        ganjoor:
          currentPlan.includeGanjoor && state.status === "done"
            ? { hits: state.hits.slice(0, MAX_RESTORED_HITS), paging: state.paging }
            : cached.ganjoor,
        semantic:
          currentPlan.includeSemantic && semanticRef.current.status === "done"
            ? {
                hits: semanticRef.current.hits.slice(0, MAX_RESTORED_HITS),
                detectedPoetName: semanticScopeRef.current.poet,
                detectedCategoryName: semanticScopeRef.current.category,
              }
            : cached.semantic,
      };
      sessionFirstPageCache.set(currentPlan.key, restored);
      firstPageCache.set(currentPlan.key, restored);
    }
    writeStoredScroll({ key: currentPlan.key, y: Math.round(window.scrollY) });
  }, []);

  useEffect(() => {
    window.addEventListener("pagehide", persistForBackNavigation);
    return () => window.removeEventListener("pagehide", persistForBackNavigation);
  }, [persistForBackNavigation]);

  useEffect(() => {
    const node = loadMoreSentinelRef.current;
    if (!node || !canLoadMore) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canLoadMore, loadMore, ganjoor.hits.length]);

  const retry = useCallback(() => {
    bypassCacheRef.current = true;
    setRetryToken((token) => token + 1);
  }, []);

  const focusResult = useCallback((offset: number, from?: HTMLElement | null) => {
    const links = Array.from(
      listRef.current?.querySelectorAll<HTMLAnchorElement>("a.search-card-link") ?? [],
    );
    if (links.length === 0) {
      return false;
    }
    const currentIndex = from ? links.indexOf(from as HTMLAnchorElement) : -1;
    const nextIndex = currentIndex + offset;
    if (nextIndex < 0) {
      inputRef.current?.focus();
      return true;
    }
    const target = links[Math.min(nextIndex, links.length - 1)];
    target?.focus();
    return true;
  }, []);

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (draft) {
        setDraft("");
        commitDraft("");
      } else {
        inputRef.current?.blur();
      }
    } else if (event.key === "ArrowDown") {
      if (focusResult(1, null)) {
        event.preventDefault();
      }
    }
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    const target = (event.target as HTMLElement).closest<HTMLElement>("a.search-card-link");
    if (!target) {
      return;
    }
    event.preventDefault();
    focusResult(event.key === "ArrowDown" ? 1 : -1, target);
  };

  const shouldSearch = plan.shouldSearch;
  const primary: "ganjoor" | "modern" | "semantic" = plan.includeSemantic
    ? "semantic"
    : plan.includeGanjoor
      ? "ganjoor"
      : "modern";
  const showStrip =
    plan.includeGanjoor && (plan.includeLocal || plan.includeEcholalia);
  const modernHits = useMemo(
    () => [...local.hits, ...echolalia.hits],
    [echolalia.hits, local.hits],
  );
  const modernLoading =
    (plan.includeLocal && local.status === "loading") ||
    (plan.includeEcholalia && echolalia.status === "loading");
  const modernDone =
    (!plan.includeLocal || local.status !== "loading") &&
    (!plan.includeEcholalia || echolalia.status !== "loading");
  const echolaliaFailed = plan.includeEcholalia && echolalia.status === "error";

  const primaryHits =
    primary === "semantic"
      ? semantic.hits
      : primary === "ganjoor"
        ? ganjoor.hits
        : modernHits;
  const primaryLoading =
    primary === "semantic"
      ? semantic.status === "loading"
      : primary === "ganjoor"
        ? ganjoor.status === "loading"
        : modernLoading;
  const primaryError =
    primary === "semantic"
      ? semantic.status === "error"
      : primary === "ganjoor"
        ? ganjoor.status === "error"
        : modernDone && modernHits.length === 0 && echolaliaFailed;
  const primaryDone =
    primary === "semantic"
      ? semantic.status === "done"
      : primary === "ganjoor"
        ? ganjoor.status === "done"
        : modernDone;
  const primaryStale = primaryLoading && primaryHits.length > 0;
  const showSkeleton = shouldSearch && primaryLoading && primaryHits.length === 0;
  const showEmpty =
    shouldSearch &&
    primaryDone &&
    !primaryError &&
    primaryHits.length === 0 &&
    (!showStrip || (modernDone && modernHits.length === 0));

  const totalCount =
    primary === "ganjoor"
      ? Math.max(ganjoor.paging.totalCount, ganjoor.hits.length)
      : primaryHits.length;
  const poetLabel = plan.poet ? getDirectoryPoetDisplayName(plan.poet) : null;
  const showIntentLine =
    shouldSearch &&
    !exact &&
    plan.mode !== "semantic" &&
    (plan.rewritten || plan.poetFromIntent);
  const detectedScopeLabel = [semanticScope.poet, semanticScope.category]
    .filter(Boolean)
    .join(" » ");
  const wouldRewrite = useMemo(() => {
    if (!exact || !shouldSearch || searchMode === "semantic") {
      return false;
    }
    const smart = buildPlan(
      urlQuery,
      sourceFilter,
      selectedPoet,
      false,
      directory,
      "keyword",
      false,
    );
    return smart.rewritten || smart.poetFromIntent;
  }, [directory, exact, searchMode, selectedPoet, shouldSearch, sourceFilter, urlQuery]);
  const isBusy =
    shouldSearch && (primaryLoading || modernLoading || isLoadingMore);
  const poetFilterOptions =
    searchMode === "semantic"
      ? directory.filter((poet) => poet.source === "ganjoor")
      : directory;
  const exampleQueries =
    searchMode === "semantic" ? EXAMPLE_SEMANTIC_QUERIES : EXAMPLE_QUERIES;

  const handleSourceChange = useCallback(
    (value: SourceFilter) => updateParams({ source: value }),
    [updateParams],
  );
  const handleModeChange = useCallback(
    (value: SearchMode) => {
      const nextPoet =
        value === "semantic" && selectedPoet && selectedPoet.source !== "ganjoor"
          ? null
          : undefined;
      updateParams({
        mode: value,
        source: value === "semantic" ? "all" : undefined,
        poet: nextPoet,
        exact: value === "semantic" ? false : undefined,
        global: value === "keyword" ? false : undefined,
      });
    },
    [selectedPoet, updateParams],
  );
  const handlePoetChange = useCallback(
    (poet: DirectoryPoet | null) => updateParams({ poet: poet ? poet.key : null }),
    [updateParams],
  );
  const handleResultClick = useCallback(() => {
    persistForBackNavigation();
    rememberQuery(urlQuery);
  }, [persistForBackNavigation, rememberQuery, urlQuery]);

  return (
    <div className="search-page" dir="rtl">
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

      <main className={`search-page-shell${shouldSearch ? " has-query" : ""}`}>
        <header className="search-page-header">
          <h1>{searchMode === "semantic" ? "جستجوی معنایی" : "جستجو در شعر"}</h1>
          <p>
            {searchMode === "semantic"
              ? "موضوع یا حس شعر را بنویسید؛ مثلاً «شعری در مورد بی‌وفایی دنیا»."
              : "واژه، مصرع یا نام شاعر را بنویسید؛ مثلاً «شعر حافظ درمورد عشق»."}
          </p>
        </header>

        <div ref={stickySentinelRef} className="search-sticky-sentinel" aria-hidden="true" />
        <div className={`search-bar${isCompact ? " is-compact" : ""}`}>
          <form
            className="search-bar-form"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              submitQuery(draft);
              inputRef.current?.blur();
            }}
          >
            <div className="search-bar-field">
              <FaSearch className="search-bar-icon" aria-hidden="true" />
              <input
                ref={inputRef}
                type="search"
                dir="rtl"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={
                  searchMode === "semantic"
                    ? "موضوع یا توصیف شعر…"
                    : "واژه، مصرع یا نام شاعر…"
                }
                aria-label="جستجوی شعر"
                autoComplete="off"
                enterKeyHint="search"
                inputMode="search"
                spellCheck={false}
              />
              {(primaryLoading || isLoadingMore) && shouldSearch && (
                <span className="search-bar-spinner" aria-hidden="true" />
              )}
              {draft && (
                <button
                  type="button"
                  className="search-bar-clear"
                  onClick={() => {
                    setDraft("");
                    commitDraft("");
                    inputRef.current?.focus();
                  }}
                  aria-label="پاک کردن جستجو"
                >
                  <FaTimes aria-hidden="true" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="search-bar-submit"
              disabled={normalizeSearchText(draft).length < MIN_SEARCH_QUERY_LENGTH}
            >
              جستجو
            </button>
          </form>
          <span
            className={`search-progress${isBusy ? " is-active" : ""}`}
            role="progressbar"
            aria-hidden={!isBusy}
            aria-label="در حال بارگذاری"
          />
        </div>

        <div className="search-filters">
          <div className="search-filter-modes">
            <SearchModeControl value={searchMode} onChange={handleModeChange} />
            {searchMode !== "semantic" && (
              <SourceSegmentedControl value={sourceFilter} onChange={handleSourceChange} />
            )}
          </div>
          <PoetCombobox
            poets={poetFilterOptions}
            value={selectedPoet}
            onChange={handlePoetChange}
          />
        </div>

        {!shouldSearch && (
          <section className="search-start" aria-label="شروع جستجو">
            {recentSearches.length > 0 && (
              <div className="search-start-group">
                <div className="search-start-heading">
                  <h2>
                    <FaHistory aria-hidden="true" />
                    جستجوهای اخیر
                  </h2>
                  <button
                    type="button"
                    className="search-text-button"
                    onClick={() => setRecentSearches(clearRecentSearches())}
                  >
                    پاک کردن
                  </button>
                </div>
                <ul className="search-chip-row">
                  {recentSearches.map((item) => (
                    <li key={item} className="search-chip search-chip-recent">
                      <button
                        type="button"
                        className="search-chip-recent-label"
                        onClick={() => submitQuery(item)}
                      >
                        {item}
                      </button>
                      <button
                        type="button"
                        className="search-chip-remove"
                        aria-label={`حذف «${item}» از جستجوهای اخیر`}
                        onClick={() => setRecentSearches(forgetRecentSearch(item))}
                      >
                        <FaTimes aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="search-start-group">
              <div className="search-start-heading">
                <h2>
                  <FaFeatherAlt aria-hidden="true" />
                  چند پیشنهاد
                </h2>
              </div>
              <ul className="search-chip-row">
                {exampleQueries.map((example) => (
                  <li key={example}>
                    <button
                      type="button"
                      className="search-chip search-chip-suggestion"
                      onClick={() => submitQuery(example)}
                    >
                      {example}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <ul className="search-hints" aria-label="راهنمای جستجو">
              {searchMode === "semantic" ? (
                <>
                  <li>
                    <strong>موضوع</strong>
                    <span>معنی را بنویسید، نه لزوماً واژه‌های شعر؛ مثل «بی‌وفایی دنیا»</span>
                  </li>
                  <li>
                    <strong>شاعر</strong>
                    <span>نام شاعر را در عبارت بیاورید؛ مثل «شعر حافظ در مورد عشق»</span>
                  </li>
                  <li>
                    <strong>متنی</strong>
                    <span>اگر مصرع را می‌دانید، جستجوی متنی را انتخاب کنید</span>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <strong>عبارت</strong>
                    <span>یک واژه یا بخشی از مصرع؛ مثل «رخ یار»</span>
                  </li>
                  <li>
                    <strong>شاعر</strong>
                    <span>نام شاعر را کنار عبارت بنویسید؛ مثل «حافظ عشق»</span>
                  </li>
                  <li>
                    <strong>درمورد …</strong>
                    <span>موضوع را با «درمورد» مشخص کنید؛ مثل «مولانا درمورد جدایی»</span>
                  </li>
                </>
              )}
            </ul>
          </section>
        )}

        {showIntentLine && (
          <div className="search-intent" aria-label="برداشت از جستجو">
            <span className="search-intent-label">برداشت ما:</span>
            {plan.poetFromIntent && plan.poet && (
              <span className="search-intent-chip">
                <PoetAvatar
                  src={plan.poet.imageUrl}
                  name={getDirectoryPoetDisplayName(plan.poet)}
                  size={20}
                />
                <span>
                  <small>شاعر</small>
                  {poetLabel}
                </span>
                <button
                  type="button"
                  className="search-chip-remove"
                  aria-label={`حذف فیلتر شاعر ${poetLabel}`}
                  onClick={() => updateParams({ exact: true })}
                >
                  <FaTimes aria-hidden="true" />
                </button>
              </span>
            )}
            <span className="search-intent-chip">
              <span>
                <small>موضوع</small>
                {plan.term}
              </span>
            </span>
            <button
              type="button"
              className="search-text-button"
              onClick={() => updateParams({ exact: true })}
            >
              جستجوی عین عبارت
            </button>
          </div>
        )}
        {exact && shouldSearch && wouldRewrite && (
          <div className="search-intent" aria-label="برداشت از جستجو">
            <span className="search-intent-label">جستجوی دقیق:</span>
            <span className="search-intent-chip">
              <span>
                <small>عبارت</small>
                {plan.normalizedQuery}
              </span>
            </span>
            <button
              type="button"
              className="search-text-button"
              onClick={() => updateParams({ exact: false })}
            >
              جستجوی هوشمند
            </button>
          </div>
        )}
        {shouldSearch &&
          plan.includeSemantic &&
          semantic.status === "done" &&
          detectedScopeLabel &&
          !plan.disableScopeDetection &&
          !plan.poet && (
          <div className="search-intent" aria-label="محدوده جستجوی معنایی">
            <span className="search-intent-label">نتایج محدود به:</span>
            <span className="search-intent-chip">
              <span>{detectedScopeLabel}</span>
            </span>
            <button
              type="button"
              className="search-text-button"
              onClick={() => updateParams({ global: true })}
            >
              جستجوی سراسری
            </button>
          </div>
        )}
        {shouldSearch && plan.includeSemantic && plan.disableScopeDetection && (
          <div className="search-intent" aria-label="محدوده جستجوی معنایی">
            <span className="search-intent-label">جستجوی سراسری</span>
            <button
              type="button"
              className="search-text-button"
              onClick={() => updateParams({ global: false })}
            >
              تشخیص محدوده از عبارت
            </button>
          </div>
        )}

        {shouldSearch && showStrip && !(modernDone && modernHits.length === 0 && !echolaliaFailed) && (
          <section className="search-strip" aria-label="شعر معاصر">
            <header className="search-strip-header">
              <h2>شعر معاصر</h2>
              <span className="search-strip-meta">
                {modernLoading
                  ? plan.includeEcholalia && echolalia.status === "loading"
                    ? "در حال جستجو در اکولالیا…"
                    : "در حال جستجو…"
                  : echolaliaFailed
                    ? "اکولالیا پاسخ نداد"
                    : `${formatPersianNumber(modernHits.length)} نتیجه از اکولالیا و شاعران محلی`}
                {echolaliaFailed && !modernLoading && (
                  <button type="button" className="search-inline-retry" onClick={retry}>
                    <FaRedoAlt aria-hidden="true" />
                    تلاش دوباره
                  </button>
                )}
              </span>
            </header>
            <ul className="search-strip-list modern-scrollbar" onClickCapture={handleResultClick}>
              {modernHits.slice(0, STRIP_LIMIT).map((hit, index) => (
                <ResultCard key={hit.key} hit={hit} delayIndex={index} compact />
              ))}
              {modernLoading &&
                modernHits.length < 3 &&
                Array.from({ length: 3 - modernHits.length }, (_, index) => (
                  <SkeletonCard key={`strip-skeleton-${index}`} compact />
                ))}
              {modernHits.length > STRIP_LIMIT && (
                <li className="search-card search-card-compact search-strip-more">
                  {local.hits.length > 0 && (
                    <button type="button" onClick={() => updateParams({ source: "custom" })}>
                      {formatPersianNumber(local.hits.length)} نتیجه در محلی
                    </button>
                  )}
                  {echolalia.hits.length > 0 && (
                    <button type="button" onClick={() => updateParams({ source: "echolalia" })}>
                      {formatPersianNumber(echolalia.hits.length)} نتیجه در اکولالیا
                    </button>
                  )}
                </li>
              )}
            </ul>
          </section>
        )}

        {shouldSearch && (primaryDone || primaryStale) && primaryHits.length > 0 && (
          <p className={`search-meta${primaryStale ? " is-stale" : ""}`} aria-live="polite">
            <strong>{formatPersianNumber(totalCount)}</strong> نتیجه برای «{plan.term}»
            {poetLabel ? ` در اشعار ${poetLabel}` : ""}
            {primary === "ganjoor" && sourceFilter === "all" ? " در گنجور" : ""}
            {primary === "semantic" ? " با جستجوی معنایی" : ""}
          </p>
        )}
        {shouldSearch && primary === "modern" && echolaliaFailed && modernHits.length > 0 && (
          <p className="search-notice">
            <span>اکولالیا پاسخ نداد؛ فقط نتایج محلی نمایش داده شد.</span>
            <button type="button" className="search-inline-retry" onClick={retry}>
              <FaRedoAlt aria-hidden="true" />
              تلاش دوباره
            </button>
          </p>
        )}
        {shouldSearch &&
          primary === "ganjoor" &&
          ganjoor.status === "done" &&
          ganjoor.hits.length === 0 &&
          showStrip &&
          modernHits.length > 0 && (
            <p className="search-notice">
              در گنجور نتیجه‌ای برای «{plan.term}» نبود؛ نتایج بالا از شاعران معاصر است.
            </p>
          )}

        {shouldSearch && primaryError && primaryHits.length === 0 && (
          <div className="search-state search-state-error" role="alert">
            <FaExclamationCircle aria-hidden="true" />
            <h2>جستجو کامل نشد</h2>
            <p>
              {primary === "semantic"
                ? "ارتباط با جستجوی معنایی برقرار نشد. لطفاً دوباره تلاش کنید."
                : primary === "ganjoor"
                ? "ارتباط با گنجور برقرار نشد. لطفاً دوباره تلاش کنید."
                : "اکولالیا پاسخ نداد. لطفاً دوباره تلاش کنید."}
            </p>
            <button type="button" className="search-button" onClick={retry}>
              <FaRedoAlt aria-hidden="true" />
              تلاش دوباره
            </button>
          </div>
        )}

        {showEmpty && (
          <div className="search-state search-state-empty">
            <FaFeatherAlt aria-hidden="true" />
            <h2>چیزی پیدا نشد</h2>
            <p>برای «{plan.term}» نتیجه‌ای در {searchMode === "semantic" ? "جستجوی معنایی" : sourceFilter === "all" ? "هیچ منبعی" : SOURCE_LABELS[sourceFilter]} نبود.</p>
            <ul>
              <li>
                {searchMode === "semantic"
                  ? "موضوع را کمی کلی‌تر بنویسید؛ مثلاً «غم دوری» به‌جای یک جملهٔ بلند."
                  : "کلمات کمتری بنویسید یا فقط یک واژهٔ کلیدی را جستجو کنید."}
              </li>
              <li>املای واژه‌ها را بررسی کنید؛ «ی» و «ک» فارسی و عربی یکسان شمرده می‌شوند.</li>
              {plan.poet && <li>فیلتر شاعر را بردارید تا در همهٔ شاعران جستجو شود.</li>}
              {searchMode === "semantic" && (
                <li>اگر مصرع را می‌دانید، به جستجوی متنی بروید.</li>
              )}
            </ul>
            <div className="search-state-actions">
              {plan.poet && (
                <button
                  type="button"
                  className="search-chip"
                  onClick={() =>
                    plan.poetFromIntent
                      ? updateParams({ exact: true })
                      : updateParams({ poet: null })
                  }
                >
                  حذف فیلتر {poetLabel}
                </button>
              )}
              {searchMode === "semantic" && (
                <button
                  type="button"
                  className="search-chip"
                  onClick={() => updateParams({ mode: "keyword" })}
                >
                  جستجوی متنی
                </button>
              )}
              {searchMode !== "semantic" &&
                SOURCE_FILTERS.filter(
                (option) => option.value !== sourceFilter && option.value !== "all",
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="search-chip"
                  onClick={() => updateParams({ source: option.value, poet: null })}
                >
                  جستجو در {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {shouldSearch && (showSkeleton || primaryHits.length > 0) && (
          <ul
            ref={listRef}
            className={`search-results${primaryStale ? " is-stale" : ""}`}
            onKeyDown={handleListKeyDown}
            onClickCapture={handleResultClick}
            aria-busy={primaryLoading}
          >
            {showSkeleton &&
              Array.from({ length: 6 }, (_, index) => (
                <SkeletonCard key={`skeleton-${index}`} />
              ))}
            {primaryHits.map((hit, index) => (
              <ResultCard
                key={hit.key}
                hit={hit}
                delayIndex={
                  primary === "ganjoor" ? Math.max(0, index - ganjoor.batchStart) : index
                }
              />
            ))}
            {isLoadingMore &&
              Array.from({ length: 3 }, (_, index) => (
                <SkeletonCard key={`more-skeleton-${index}`} />
              ))}
          </ul>
        )}

        {shouldSearch && primary === "ganjoor" && ganjoor.status === "done" && ganjoor.hits.length > 0 && (
          <div className="search-load-more">
            {loadMoreError && (
              <p className="search-load-more-error">بارگذاری نتایج بیشتر ناموفق بود.</p>
            )}
            {ganjoor.paging.hasNextPage ? (
              <button
                type="button"
                className="search-button"
                onClick={() => void loadMore()}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? "در حال بارگذاری…" : "نتایج بیشتر"}
              </button>
            ) : (
              <p className="search-load-more-end">پایان نتایج</p>
            )}
          </div>
        )}
        <div ref={loadMoreSentinelRef} className="search-load-more-sentinel" aria-hidden="true" />
      </main>
    </div>
  );
};

export default SearchPage;
