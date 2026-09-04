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
import { motion, useReducedMotion } from "framer-motion";
import {
  FaCheck,
  FaChevronDown,
  FaExclamationCircle,
  FaFeatherAlt,
  FaRedoAlt,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import Menu, { MenuButton, SearchButton } from "@/components/Menu";
import SettingsDialog from "@/components/SettingsDialog";
import GlobalSearchDialog from "@/components/GlobalSearchDialog";
import { useUpdateNotification } from "@/hooks/useUpdateNotification";
import ganjoorApi from "@/api/GanjoorApi";
import customApi from "@/api/CustomApi";
import echolaliaApi from "@/api/EcholaliaApi";
import { PoetSlug } from "@/types/poet";
import type {
  GanjoorPagingHeaders,
  GanjoorPoemSearchResult,
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
  MIN_SEARCH_QUERY_LENGTH,
  getVerseSnippet,
  normalizeSearchText,
  parseSearchIntent,
  type VerseSnippet,
} from "@/utils/searchText";
import { logger } from "@/utils/logger";
import "@/styles/SearchPage.css";

type SourceFilter = "all" | PoemLibrarySource;
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

interface CachedFirstPage {
  ganjoor: Pick<GanjoorSection, "hits" | "paging"> | null;
  local: SearchHit[] | null;
  echolalia: SearchHit[] | null;
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
  includeGanjoor: boolean;
  includeLocal: boolean;
  includeEcholalia: boolean;
}

const PAGE_SIZE = 20;
const ECHOLALIA_PAGE_SIZE = 12;
const DEBOUNCE_MS = 250;
const DIRECTORY_WAIT_MS = 600;
const STRIP_LIMIT = 12;

const SOURCE_FILTERS: Array<{ value: SourceFilter; label: string }> = [
  { value: "all", label: "همه" },
  { value: "ganjoor", label: "گنجور" },
  { value: "echolalia", label: "اکولالیا" },
  { value: "custom", label: "محلی" },
];
const SOURCE_LABELS: Record<PoemLibrarySource, string> = {
  ganjoor: "گنجور",
  custom: "محلی",
  echolalia: "اکولالیا",
};
const SUGGESTIONS = ["عشق", "رخ یار", "بهار", "جدایی", "می", "دوست", "وطن", "مرگ"];

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

const persianNumberFormatter = new Intl.NumberFormat("fa-IR");
const formatPersianNumber = (value: number) =>
  persianNumberFormatter.format(value);

const firstPageCache = new LruCache<CachedFirstPage>(40);
const pageCache = new LruCache<CachedGanjoorPage>(80);
const sessionFirstPageCache = createSessionCache<CachedFirstPage>(
  "ganjoorak:search-results:v1",
  8,
);

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

const searchLocalPoems = async (
  term: string,
  poet: DirectoryPoet | null,
): Promise<SearchHit[]> => {
  const normalizedQuery = normalizeSearchText(term);
  if (normalizedQuery.length < MIN_SEARCH_QUERY_LENGTH) {
    return [];
  }

  const slugs = poet
    ? Object.values(PoetSlug).filter((slug) => slug === poet.urlSlug)
    : Object.values(PoetSlug);

  const datasets = await Promise.allSettled(
    slugs.map(async (slug) => ({
      slug,
      data: await customApi._getPoetData(slug),
    })),
  );

  const hits: SearchHit[] = [];
  datasets.forEach((result) => {
    if (result.status !== "fulfilled") {
      return;
    }

    const { slug, data } = result.value;
    const poetName = data?.poet || slug;
    (data?.poems ?? []).forEach((poem: any) => {
      const collection =
        typeof poem?.collection === "string" && poem.collection.trim()
          ? poem.collection.trim()
          : null;
      const plainText = String(poem?.text ?? "");
      const haystack = normalizeSearchText(
        [poem?.title, plainText, collection, poetName].filter(Boolean).join(" "),
      );
      if (!haystack.includes(normalizedQuery)) {
        return;
      }

      hits.push({
        key: `custom:${slug}:${poem.id}`,
        id: poem.id,
        title: poem.title || `شعر ${poem.id}`,
        poetName,
        poetSlug: slug,
        source: "custom",
        href: getPoemHref({
          id: poem.id,
          source: "custom",
          poetSlug: slug,
          fullUrl: "",
        }),
        collection,
        avatarUrl: `/images/poets/${slug}.jpeg`,
        snippet: getVerseSnippet(plainText, term),
      });
    });
  });

  return hits;
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
): SearchPlan => {
  const normalizedQuery = normalizeSearchText(query);
  const shouldSearch = normalizedQuery.length >= MIN_SEARCH_QUERY_LENGTH;

  let term = normalizedQuery;
  let poet = explicitPoet;
  let poetFromIntent = false;
  if (shouldSearch && !exact) {
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

  const includeGanjoor = allows("ganjoor");
  const includeLocal = allows("custom");
  const includeEcholalia = allows("echolalia");

  return {
    key: [
      term,
      poet ? poet.key : "",
      includeGanjoor ? "g" : "",
      includeLocal ? "l" : "",
      includeEcholalia ? "e" : "",
    ].join("|"),
    shouldSearch,
    term,
    normalizedQuery,
    poet,
    poetFromIntent,
    rewritten: term !== normalizedQuery,
    includeGanjoor,
    includeLocal,
    includeEcholalia,
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
  const reduceMotion = useReducedMotion();
  const { snippet } = hit;

  return (
    <motion.li
      className={compact ? "search-card search-card-compact" : "search-card"}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
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
        {snippet.matchLine && (
          <span className="search-card-match">
            <HighlightedText text={snippet.matchLine} highlight={snippet.highlight} />
          </span>
        )}
        {!compact && snippet.contextLine && (
          <span className="search-card-context">{snippet.contextLine}</span>
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

const PoetCombobox = ({
  poets,
  value,
  onChange,
}: {
  poets: DirectoryPoet[];
  value: DirectoryPoet | null;
  onChange: (poet: DirectoryPoet | null) => void;
}) => {
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
};

const SearchPage = () => {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const urlSource = searchParams.get("source");
  const urlPoetKey = searchParams.get("poet");
  const exact = searchParams.get("exact") === "1";
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [isCompact, setIsCompact] = useState(false);
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
  const ganjoorRef = useRef(ganjoor);
  ganjoorRef.current = ganjoor;

  const selectedPoet = useMemo(
    () => findDirectoryPoet(urlPoetKey, directory),
    [directory, urlPoetKey],
  );

  const plan = useMemo(
    () => buildPlan(urlQuery, sourceFilter, selectedPoet, exact, directory),
    [directory, exact, selectedPoet, sourceFilter, urlQuery],
  );
  const planRef = useRef(plan);
  planRef.current = plan;

  // Instant static directory first; Ganjoor nicknames merge in when ready.
  useEffect(() => {
    setDirectory(getPoetDirectory());
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
    }) => {
      const current = new URLSearchParams(window.location.search);
      const params = new URLSearchParams();
      const query = (next.q ?? current.get("q") ?? "").trim();
      const source = next.source ?? current.get("source") ?? "all";
      const poet = next.poet === undefined ? current.get("poet") : next.poet;
      const exactFlag =
        next.exact === undefined ? current.get("exact") === "1" : next.exact;
      if (query) {
        params.set("q", query);
      }
      if (source && source !== "all") {
        params.set("source", source);
      }
      if (poet) {
        params.set("poet", poet);
      }
      if (exactFlag && query) {
        params.set("exact", "1");
      }
      const href = params.toString() ? `/search?${params.toString()}` : "/search";
      if (`${window.location.pathname}${window.location.search}` !== href) {
        // Native history integrates with Next's useSearchParams and skips the
        // server round-trip router.replace would make on every keystroke.
        window.history.replaceState(window.history.state, "", href);
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
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [commitDraft, draft]);

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
    };

    const run = async () => {
      if (
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

      const localTask: Promise<SearchHit[] | null> = currentPlan.includeLocal
        ? searchLocalPoems(
            currentPlan.term,
            currentPlan.poet?.source === "custom" ? currentPlan.poet : null,
          )
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
            })
        : Promise.resolve(null);

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

      const [ganjoorResult, localResult, echolaliaResult] = await Promise.all([
        ganjoorTask,
        localTask,
        echolaliaTask,
      ]);
      if (!isCurrent()) {
        return;
      }

      const complete =
        (!currentPlan.includeGanjoor || ganjoorResult !== null) &&
        (!currentPlan.includeLocal || localResult !== null) &&
        (!currentPlan.includeEcholalia || echolaliaResult !== null);
      if (complete) {
        const cached: CachedFirstPage = {
          ganjoor: ganjoorResult,
          local: localResult,
          echolalia: echolaliaResult,
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
    const cacheKey = `${currentPlan.key}|${pageNumber}`;
    const requestId = requestIdRef.current;
    const signal = controllerRef.current?.signal;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(false);

    try {
      let page = pageCache.get(cacheKey);
      if (!page) {
        const response = await ganjoorApi.searchPoems(currentPlan.term, {
          pageNumber,
          pageSize: PAGE_SIZE,
          poetId:
            currentPlan.poet?.source === "ganjoor" ? currentPlan.poet.id : undefined,
          signal,
        });
        page = {
          hits: response.items.map((poem) => mapGanjoorHit(poem, currentPlan.term)),
          paging: response.paging,
        };
        pageCache.set(cacheKey, page);
      }
      if (requestIdRef.current !== requestId) {
        return;
      }
      const nextPage = page;
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
  }, []);

  const canLoadMore =
    plan.includeGanjoor && ganjoor.status === "done" && ganjoor.paging.hasNextPage;

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
  const primary: "ganjoor" | "modern" = plan.includeGanjoor ? "ganjoor" : "modern";
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

  const primaryHits = primary === "ganjoor" ? ganjoor.hits : modernHits;
  const primaryLoading =
    primary === "ganjoor" ? ganjoor.status === "loading" : modernLoading;
  const primaryError =
    primary === "ganjoor"
      ? ganjoor.status === "error"
      : modernDone && modernHits.length === 0 && echolaliaFailed;
  const primaryDone = primary === "ganjoor" ? ganjoor.status === "done" : modernDone;
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
      : modernHits.length;
  const poetLabel = plan.poet ? getDirectoryPoetDisplayName(plan.poet) : null;
  const showIntentLine =
    shouldSearch && !exact && (plan.rewritten || plan.poetFromIntent);
  const wouldRewrite = useMemo(() => {
    if (!exact || !shouldSearch) {
      return false;
    }
    const smart = buildPlan(urlQuery, sourceFilter, selectedPoet, false, directory);
    return smart.rewritten || smart.poetFromIntent;
  }, [directory, exact, selectedPoet, shouldSearch, sourceFilter, urlQuery]);

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

      <main className="search-page-shell">
        <header className="search-page-header">
          <h1>جستجو</h1>
          <p>
            واژه، مصرع یا نام شاعر را بنویسید؛ مثلاً «شعر حافظ درمورد عشق».
          </p>
        </header>

        <div ref={stickySentinelRef} className="search-sticky-sentinel" aria-hidden="true" />
        <div className={`search-bar${isCompact ? " is-compact" : ""}`}>
          <form
            className="search-bar-form"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              commitDraft(draft);
              inputRef.current?.blur();
            }}
          >
            <div className="search-bar-field">
              <FaSearch className="search-bar-icon" aria-hidden="true" />
              <input
                ref={inputRef}
                type="search"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="واژه، مصرع یا نام شاعر…"
                aria-label="جستجوی شعر"
                autoComplete="off"
                enterKeyHint="search"
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
        </div>

        <div className="search-filters">
          <div className="search-source-filters" role="group" aria-label="منبع">
            {SOURCE_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`search-chip${sourceFilter === option.value ? " is-active" : ""}`}
                aria-pressed={sourceFilter === option.value}
                onClick={() => updateParams({ source: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
          <PoetCombobox
            poets={directory}
            value={selectedPoet}
            onChange={(poet) => updateParams({ poet: poet ? poet.key : null })}
          />
        </div>

        {!shouldSearch && (
          <section className="search-suggestions" aria-label="پیشنهادها">
            <p>چند پیشنهاد برای شروع:</p>
            <div className="search-suggestion-chips">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="search-chip search-chip-suggestion"
                  onClick={() => {
                    setDraft(suggestion);
                    commitDraft(suggestion);
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </section>
        )}

        {showIntentLine && (
          <p className="search-intent">
            <span>
              جستجو برای «{plan.term}»
              {plan.poetFromIntent && poetLabel ? ` با فیلتر ${poetLabel}` : ""}
            </span>
            <button type="button" onClick={() => updateParams({ exact: true })}>
              جستجوی دقیق عبارت
            </button>
          </p>
        )}
        {exact && shouldSearch && wouldRewrite && (
          <p className="search-intent">
            <span>جستجوی دقیق «{plan.normalizedQuery}»</span>
            <button type="button" onClick={() => updateParams({ exact: false })}>
              جستجوی هوشمند
            </button>
          </p>
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
            <ul className="search-strip-list modern-scrollbar">
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
              {primary === "ganjoor"
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
            <p>برای «{plan.term}» نتیجه‌ای در {sourceFilter === "all" ? "هیچ منبعی" : SOURCE_LABELS[sourceFilter]} نبود.</p>
            <ul>
              <li>کلمات کمتری بنویسید یا فقط یک واژهٔ کلیدی را جستجو کنید.</li>
              <li>املای واژه‌ها را بررسی کنید؛ «ی» و «ک» فارسی و عربی یکسان شمرده می‌شوند.</li>
              {plan.poet && <li>فیلتر شاعر را بردارید تا در همهٔ شاعران جستجو شود.</li>}
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
              {SOURCE_FILTERS.filter(
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
