"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FaSearch, FaTimes } from "react-icons/fa";
import Menu, { MenuButton, SearchButton } from "@/components/Menu";
import SettingsDialog from "@/components/SettingsDialog";
import GlobalSearchDialog from "@/components/GlobalSearchDialog";
import { useUpdateNotification } from "@/hooks/useUpdateNotification";
import ganjoorApi from "@/api/GanjoorApi";
import customApi from "@/api/CustomApi";
import echolaliaApi from "@/api/EcholaliaApi";
import type { Poet } from "@/types/poet";
import { PoetSlug } from "@/types/poet";
import type { GanjoorPagingHeaders } from "@/types/ganjoor";
import { getPoemHref, type PoemLibrarySource } from "@/utils/poemLibrary";
import {
  MIN_SEARCH_QUERY_LENGTH,
  getVerseSnippet,
  normalizeSearchText,
  parseSearchIntent,
  type SearchIntent,
  type SearchPoetRef,
} from "@/utils/searchText";
import { logger } from "@/utils/logger";
import "@/styles/SearchPage.css";

type SourceFilter = "all" | PoemLibrarySource;

interface SearchHit {
  key: string;
  id: number;
  title: string;
  poetName: string;
  poetSlug: string;
  source: PoemLibrarySource;
  href: string;
  plainText: string;
  collection?: string | null;
}

const PAGE_SIZE = 20;
const SOURCE_FILTERS: Array<{ value: SourceFilter; label: string }> = [
  { value: "all", label: "همه" },
  { value: "ganjoor", label: "گنجور" },
  { value: "custom", label: "محلی" },
  { value: "echolalia", label: "اکولالیا" },
];
const SOURCE_LABELS: Record<PoemLibrarySource, string> = {
  ganjoor: "گنجور",
  custom: "محلی",
  echolalia: "اکولالیا",
};
const emptyPaging: GanjoorPagingHeaders = {
  totalCount: 0,
  pageSize: PAGE_SIZE,
  currentPage: 1,
  totalPages: 0,
  hasPreviousPage: false,
  hasNextPage: false,
};
const persianNumberFormatter = new Intl.NumberFormat("fa-IR");

const formatPersianNumber = (value: number) =>
  persianNumberFormatter.format(value);

const encodePoetKey = (poet: Poet) =>
  `${poet.source || "ganjoor"}:${poet.id}`;

const parsePoetKey = (value: string | null, poets: Poet[]) => {
  if (!value) {
    return null;
  }

  const [sourceOrId, maybeId] = value.includes(":")
    ? value.split(":")
    : ["", value];
  const id = Number(maybeId || sourceOrId);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }

  return (
    poets.find(
      (poet) =>
        poet.id === id &&
        (!sourceOrId || (poet.source || "ganjoor") === sourceOrId),
    ) || poets.find((poet) => poet.id === id) || null
  );
};

const HighlightedText = ({
  text,
  highlight,
}: {
  text: string;
  highlight: { start: number; end: number } | null;
}) => {
  if (!highlight || highlight.start >= highlight.end) {
    return text;
  }

  return (
    <>
      {text.slice(0, highlight.start)}
      <mark className="search-page-highlight">
        {text.slice(highlight.start, highlight.end)}
      </mark>
      {text.slice(highlight.end)}
    </>
  );
};

const searchLocalPoems = async (
  query: string,
  poet?: SearchPoetRef | null,
): Promise<SearchHit[]> => {
  const normalizedQuery = normalizeSearchText(query);
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
        plainText,
        collection,
      });
    });
  });

  return hits;
};

const searchEcholaliaHits = async (
  query: string,
  poet?: SearchPoetRef | null,
): Promise<SearchHit[]> => {
  if (poet && poet.source && poet.source !== "echolalia") {
    return [];
  }

  if (poet?.urlSlug) {
    const poems = await echolaliaApi.searchPoemsByPoetSlug(poet.urlSlug, query);
    return poems.map((poem) => ({
      key: `echolalia:${poet.urlSlug}:${poem.id}`,
      id: poem.id,
      title: poem.title,
      poetName: poet.nickname || poet.name,
      poetSlug: poet.urlSlug,
      source: "echolalia" as const,
      href: getPoemHref({
        id: poem.id,
        source: "echolalia",
        poetSlug: poet.urlSlug,
        fullUrl: "",
      }),
      plainText: poem.excerpt,
      collection: poem.collection,
    }));
  }

  const poems = await echolaliaApi.searchPoems(query, { pageSize: 20 });
  return poems.map((poem) => ({
    key: `echolalia:${poem.poetSlug}:${poem.id}`,
    id: poem.id,
    title: poem.title,
    poetName: poem.poet,
    poetSlug: poem.poetSlug,
    source: "echolalia" as const,
    href: getPoemHref(poem),
    plainText: poem.plainText,
  }));
};

const SearchPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const urlSource = (searchParams.get("source") as SourceFilter) || "all";
  const urlPoetKey = searchParams.get("poet");
  const [draftQuery, setDraftQuery] = useState(urlQuery);
  const [allPoets, setAllPoets] = useState<Poet[]>([]);
  const [hasLoadedPoets, setHasLoadedPoets] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [paging, setPaging] = useState<GanjoorPagingHeaders>(emptyPaging);
  const [extraCount, setExtraCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<SearchIntent | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { hasNewUpdates, markAsRead } = useUpdateNotification();
  const requestIdRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const sourceFilter: SourceFilter = SOURCE_FILTERS.some(
    (option) => option.value === urlSource,
  )
    ? urlSource
    : "all";

  useEffect(() => {
    setDraftQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    let cancelled = false;

    const loadPoets = async () => {
      try {
        const [ganjoorPoets, customPoets, echolaliaPoets] = await Promise.all([
          ganjoorApi.getPoets(),
          customApi.getPoets(),
          echolaliaApi.getPoets(),
        ]);
        if (!cancelled) {
          setAllPoets([...ganjoorPoets, ...customPoets, ...echolaliaPoets]);
        }
      } catch (loadError) {
        logger.error("Error loading poets for search page:", loadError);
      } finally {
        if (!cancelled) {
          setHasLoadedPoets(true);
        }
      }
    };

    loadPoets();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPoet = useMemo(
    () => parsePoetKey(urlPoetKey, allPoets),
    [allPoets, urlPoetKey],
  );

  const groupedPoets = useMemo(() => {
    const groups: Record<PoemLibrarySource, Poet[]> = {
      ganjoor: [],
      custom: [],
      echolalia: [],
    };
    allPoets
      .filter((poet) => poet.published)
      .forEach((poet) => {
        groups[poet.source || "ganjoor"].push(poet);
      });
    (Object.keys(groups) as PoemLibrarySource[]).forEach((source) => {
      groups[source].sort((left, right) =>
        (left.nickname || left.name).localeCompare(
          right.nickname || right.name,
          "fa",
        ),
      );
    });
    return groups;
  }, [allPoets]);

  const updateParams = useCallback(
    (
      next: { q?: string; source?: SourceFilter; poet?: string | null },
      mode: "push" | "replace" = "replace",
    ) => {
      const params = new URLSearchParams();
      const query = (next.q ?? urlQuery).trim();
      const source = next.source ?? sourceFilter;
      const poet = next.poet === undefined ? urlPoetKey : next.poet;
      if (query) {
        params.set("q", query);
      }
      if (source !== "all") {
        params.set("source", source);
      }
      if (poet) {
        params.set("poet", poet);
      }
      const href = params.toString() ? `/search?${params.toString()}` : "/search";
      if (mode === "push") {
        router.push(href);
      } else {
        router.replace(href);
      }
    },
    [router, sourceFilter, urlPoetKey, urlQuery],
  );

  const runSearch = useCallback(
    async (pageNumber: number, append: boolean) => {
      const parsedIntent = parseSearchIntent(urlQuery, allPoets);
      const term = parsedIntent.term;
      if (normalizeSearchText(urlQuery).length < MIN_SEARCH_QUERY_LENGTH) {
        setHits([]);
        setPaging(emptyPaging);
        setExtraCount(0);
        setIntent(null);
        setError(null);
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }

      const effectivePoet = selectedPoet || parsedIntent.poet;
      const includeGanjoor =
        (sourceFilter === "all" || sourceFilter === "ganjoor") &&
        (!effectivePoet || !effectivePoet.source || effectivePoet.source === "ganjoor");
      const includeLocal =
        (sourceFilter === "all" || sourceFilter === "custom") &&
        (!effectivePoet || effectivePoet.source === "custom");
      const includeEcholalia =
        (sourceFilter === "all" || sourceFilter === "echolalia") &&
        (!effectivePoet || effectivePoet.source === "echolalia");

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      setIntent(parsedIntent);

      try {
        const [ganjoorPage, localHits, echolaliaHits] = await Promise.all([
          includeGanjoor
            ? ganjoorApi.searchPoems(term, {
                pageNumber,
                pageSize: PAGE_SIZE,
                poetId: effectivePoet?.source === "custom" || effectivePoet?.source === "echolalia"
                  ? undefined
                  : effectivePoet?.id,
              })
            : Promise.resolve({ items: [], paging: emptyPaging }),
          !append && includeLocal
            ? searchLocalPoems(term, effectivePoet?.source === "custom" ? effectivePoet : null)
            : Promise.resolve([]),
          !append && includeEcholalia
            ? searchEcholaliaHits(
                term,
                effectivePoet?.source === "echolalia" ? effectivePoet : null,
              )
            : Promise.resolve([]),
        ]);

        if (requestIdRef.current !== requestId) {
          return;
        }

        const ganjoorHits: SearchHit[] = ganjoorPage.items.map((poem) => ({
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
          plainText: poem.plainText || poem.poemSummary || "",
          collection: poem.bookTitle,
        }));

        const nextHits = append
          ? ganjoorHits
          : [...localHits, ...echolaliaHits, ...ganjoorHits];

        setHits((current) => (append ? [...current, ...ganjoorHits] : nextHits));
        setPaging(includeGanjoor ? ganjoorPage.paging : emptyPaging);
        if (!append) {
          setExtraCount(localHits.length + echolaliaHits.length);
        }
      } catch (searchError) {
        logger.error("Search page failed:", searchError);
        if (requestIdRef.current === requestId) {
          setError("جستجو کامل نشد. کمی بعد دوباره تلاش کنید.");
          if (!append) {
            setHits([]);
          }
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [allPoets, selectedPoet, sourceFilter, urlQuery],
  );

  useEffect(() => {
    if (!hasLoadedPoets) {
      if (normalizeSearchText(urlQuery).length >= MIN_SEARCH_QUERY_LENGTH) {
        setIsLoading(true);
      }
      return;
    }

    const timer = window.setTimeout(() => {
      void runSearch(1, false);
    }, 80);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hasLoadedPoets, runSearch, urlQuery]);

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !paging.hasNextPage) {
      return;
    }
    void runSearch(paging.currentPage + 1, true);
  }, [isLoading, isLoadingMore, paging.currentPage, paging.hasNextPage, runSearch]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, hits.length]);

  const shouldSearch =
    normalizeSearchText(urlQuery).length >= MIN_SEARCH_QUERY_LENGTH;
  const totalCount = paging.totalCount + extraCount;
  const showIntent =
    Boolean(intent?.poet) &&
    !selectedPoet &&
    intent?.term !== normalizeSearchText(urlQuery);

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
          <p>در اشعار گنجور، شاعران محلی و اکولالیا بگردید. نتیجه را می‌توانید به اشتراک بگذارید.</p>
        </header>

        <form
          className="search-page-form"
          onSubmit={(event) => {
            event.preventDefault();
            updateParams({ q: draftQuery }, "push");
          }}
        >
          <div className="search-page-input-wrap">
            <FaSearch aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="واژه، مصرع یا نام شاعر..."
              aria-label="جستجوی شعر"
              autoFocus
            />
            {draftQuery && (
              <button
                type="button"
                onClick={() => {
                  setDraftQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="پاک کردن جستجو"
              >
                <FaTimes />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="search-page-submit"
            disabled={normalizeSearchText(draftQuery).length < MIN_SEARCH_QUERY_LENGTH}
          >
            جستجو
          </button>
        </form>

        <div className="search-page-filters">
          <div className="search-page-source-filters" role="group" aria-label="منبع">
            {SOURCE_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={sourceFilter === option.value ? "active" : ""}
                onClick={() => updateParams({ source: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="search-page-poet-filter">
            <label htmlFor="search-page-poet">شاعر</label>
            <select
              id="search-page-poet"
              value={selectedPoet ? encodePoetKey(selectedPoet) : ""}
              onChange={(event) =>
                updateParams({ poet: event.target.value || null })
              }
            >
              <option value="">همه شاعران</option>
              {groupedPoets.ganjoor.length > 0 && (
                <optgroup label="گنجور">
                  {groupedPoets.ganjoor.map((poet) => (
                    <option key={encodePoetKey(poet)} value={encodePoetKey(poet)}>
                      {poet.nickname || poet.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {groupedPoets.custom.length > 0 && (
                <optgroup label="محلی">
                  {groupedPoets.custom.map((poet) => (
                    <option key={encodePoetKey(poet)} value={encodePoetKey(poet)}>
                      {poet.nickname || poet.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {groupedPoets.echolalia.length > 0 && (
                <optgroup label="اکولالیا">
                  {groupedPoets.echolalia.map((poet) => (
                    <option key={encodePoetKey(poet)} value={encodePoetKey(poet)}>
                      {poet.nickname || poet.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {showIntent && intent?.poet && (
          <p className="search-page-intent">
            جستجو برای «{intent.term}» در اشعار {intent.poet.nickname || intent.poet.name}
          </p>
        )}

        {!shouldSearch && (
          <p className="search-page-empty">
            حداقل دو نویسه وارد کنید. می‌توانید بنویسید «شعر حافظ درمورد عشق».
          </p>
        )}

        {shouldSearch && isLoading && hits.length === 0 && (
          <p className="search-page-status">در حال جستجو...</p>
        )}
        {error && <p className="search-page-error">{error}</p>}
        {shouldSearch && !isLoading && !error && hits.length === 0 && (
          <p className="search-page-empty">نتیجه‌ای پیدا نشد.</p>
        )}

        {hits.length > 0 && (
          <>
            <div className="search-page-meta">
              <span>
                {formatPersianNumber(totalCount || hits.length)} نتیجه
              </span>
              {paging.currentPage > 1 && (
                <span>
                  صفحه {formatPersianNumber(paging.currentPage)}
                  {paging.totalPages
                    ? ` از ${formatPersianNumber(paging.totalPages)}`
                    : ""}
                </span>
              )}
            </div>
            <ul className="search-page-list">
              {hits.map((hit) => {
                const snippet = getVerseSnippet(hit.plainText, intent?.term || urlQuery);
                return (
                  <li key={hit.key} className="search-page-item">
                    <Link href={hit.href} className="search-page-link">
                      <strong>{hit.title}</strong>
                      <span className="search-page-item-meta">
                        <span>{hit.poetName}</span>
                        {hit.collection && <span>{hit.collection}</span>}
                        <span className="search-page-source">
                          {SOURCE_LABELS[hit.source]}
                        </span>
                      </span>
                      {snippet.contextPosition === "before" && snippet.contextLine && (
                        <span className="search-page-context">
                          … {snippet.contextLine}
                        </span>
                      )}
                      {snippet.matchLine && (
                        <p className="search-page-match">
                          <HighlightedText
                            text={snippet.matchLine}
                            highlight={snippet.highlight}
                          />
                        </p>
                      )}
                      {snippet.contextPosition === "after" && snippet.contextLine && (
                        <span className="search-page-context">
                          {snippet.contextLine} …
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {paging.hasNextPage && (
              <div className="search-page-load-more">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? "در حال بارگذاری..." : "نتایج بیشتر"}
                </button>
              </div>
            )}
            <div ref={sentinelRef} className="search-page-sentinel" aria-hidden="true" />
          </>
        )}
      </main>
    </div>
  );
};

export default SearchPage;
