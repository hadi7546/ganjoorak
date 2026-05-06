"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaBookOpen,
  FaFeatherAlt,
  FaSearch,
  FaTimes,
  FaUser,
} from "react-icons/fa";
import ganjoorApi from "@/api/GanjoorApi";
import customApi from "@/api/CustomApi";
import echolaliaApi from "@/api/EcholaliaApi";
import type { GanjoorCategory, GanjoorPoemSearchResult } from "@/types/ganjoor";
import type { Poet } from "@/types/poet";
import { PoetSlug } from "@/types/poet";
import { logger } from "@/utils/logger";

type SearchFilter = "all" | "poets" | "poems" | "books";

interface LocalPoemSearchResult {
  id: number;
  title: string;
  poetName: string;
  poetSlug: string;
  excerpt: string;
  collection: string | null;
  source: "custom" | "echolalia";
}

interface BookSearchResult {
  key: string;
  title: string;
  poetName: string;
  href: string;
}

interface SearchState {
  poets: Poet[];
  poems: Array<GanjoorPoemSearchResult | LocalPoemSearchResult>;
  books: BookSearchResult[];
}

interface GlobalSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilter?: SearchFilter;
}

const SEARCH_FILTERS: Array<{ value: SearchFilter; label: string }> = [
  { value: "all", label: "همه" },
  { value: "poets", label: "شاعران" },
  { value: "poems", label: "شعرها" },
  { value: "books", label: "دفترها" },
];

const normalizeSearchText = (value: string) =>
  value
    .trim()
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/\s+/g, " ")
    .toLowerCase();

const getPoetHref = (poet: Poet) => {
  if (poet.source === "echolalia") {
    return poet.fullUrl;
  }

  if (/^https?:\/\//.test(poet.fullUrl)) {
    return poet.fullUrl;
  }

  const poetPath = poet.fullUrl.startsWith("/")
    ? poet.fullUrl
    : `/${poet.fullUrl || poet.urlSlug}`;
  return poetPath;
};

const getPoemHref = (poem: GanjoorPoemSearchResult | LocalPoemSearchResult) => {
  if (!("fullUrl" in poem)) {
    return `/${poem.poetSlug}/${poem.id}`;
  }
  return `/poem/${poem.id}`;
};

const getResultExcerpt = (
  poem: GanjoorPoemSearchResult | LocalPoemSearchResult,
  query: string,
) => {
  if ("excerpt" in poem) {
    return poem.excerpt;
  }

  const lines = poem.plainText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const normalizedQuery = normalizeSearchText(query);
  const matchingLine = lines.find((line) =>
    normalizeSearchText(line).includes(normalizedQuery),
  );
  return matchingLine || poem.poemSummary || lines[0] || poem.fullTitle;
};

const poetMatchesQuery = (poet: Poet, query: string) =>
  normalizeSearchText(
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
  ).includes(query);

const uniqueBooks = (books: BookSearchResult[]) => {
  const map = new Map<string, BookSearchResult>();
  books.forEach((book) => {
    if (!map.has(book.key)) {
      map.set(book.key, book);
    }
  });
  return Array.from(map.values());
};

const flattenGanjoorBooks = (
  category: GanjoorCategory,
  poetName: string,
  poetSlug: string,
): BookSearchResult[] => {
  const children = category.children ?? [];
  const current =
    category.id > 0 && category.title
      ? [
          {
            key: `ganjoor-cat-${category.id}`,
            title: category.title,
            poetName,
            href: `/${poetSlug}`,
          },
        ]
      : [];

  return [
    ...current,
    ...children.flatMap((child) => flattenGanjoorBooks(child, poetName, poetSlug)),
  ];
};

const searchGanjoorBooks = async (
  query: string,
  poets: Poet[],
): Promise<BookSearchResult[]> => {
  const candidatePoets = poets
    .filter((poet) => poet.source === "ganjoor" || !poet.source)
    .filter((poet) => poet.published && poetMatchesQuery(poet, query))
    .slice(0, 6);

  const catalogs = await Promise.allSettled(
    candidatePoets.map(async (poet) => {
      const catalog = await ganjoorApi.getPoetCatalog(poet.urlSlug, poet.id);
      return {
        poet,
        catalog,
      };
    }),
  );

  return catalogs.flatMap((result) => {
    if (result.status !== "fulfilled") {
      return [];
    }

    const { poet, catalog } = result.value;
    return flattenGanjoorBooks(
      catalog.category,
      poet.nickname || poet.name,
      catalog.poet.urlSlug || poet.urlSlug,
    ).filter((book) =>
      normalizeSearchText(`${book.title} ${book.poetName}`).includes(query),
    );
  });
};

const searchLocalPoemsAndBooks = async (
  query: string,
): Promise<{
  poems: LocalPoemSearchResult[];
  books: BookSearchResult[];
}> => {
  const poetSlugs = Object.values(PoetSlug);
  const datasets = await Promise.allSettled(
    poetSlugs.map(async (slug) => ({
      slug,
      data: await customApi._getPoetData(slug),
    })),
  );
  const poems: LocalPoemSearchResult[] = [];
  const books: BookSearchResult[] = [];

  datasets.forEach((result) => {
    if (result.status !== "fulfilled") {
      return;
    }

    const { slug, data } = result.value;
    const poetName = data?.poet || slug;
    const seenCollections = new Set<string>();

    (data?.poems ?? []).forEach((poem: any) => {
      const collection =
        typeof poem?.collection === "string" && poem.collection.trim()
          ? poem.collection.trim()
          : null;
      const haystack = normalizeSearchText(
        [poem?.title, poem?.text, collection, poetName].filter(Boolean).join(" "),
      );

      if (collection && !seenCollections.has(collection)) {
        seenCollections.add(collection);
        if (
          normalizeSearchText(`${collection} ${poetName}`).includes(query)
        ) {
          books.push({
            key: `local-${slug}-${collection}`,
            title: collection,
            poetName,
            href: `/${slug}`,
          });
        }
      }

      if (haystack.includes(query) && poems.length < 8) {
        const lines = String(poem?.text ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        const matchingLine = lines.find((line) =>
          normalizeSearchText(line).includes(query),
        );
        poems.push({
          id: poem.id,
          title: poem.title,
          poetName,
          poetSlug: slug,
          excerpt: matchingLine || lines[0] || "",
          collection,
          source: "custom",
        });
      }
    });
  });

  return { poems, books };
};

const searchEcholaliaPoems = async (
  query: string,
): Promise<LocalPoemSearchResult[]> => {
  const poems = await echolaliaApi.searchPoems(query);
  return poems.map((poem) => {
    const lines = poem.plainText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const matchingLine = lines.find((line) =>
      normalizeSearchText(line).includes(normalizeSearchText(query)),
    );

    return {
      id: poem.id,
      title: poem.title,
      poetName: poem.poet,
      poetSlug: poem.poetSlug,
      excerpt: matchingLine || lines[0] || "",
      collection: "اکولالیا",
      source: "echolalia",
    };
  });
};

const deriveBooksFromPoems = (
  poems: GanjoorPoemSearchResult[],
  query: string,
) =>
  poems
    .filter((poem) => poem.bookTitle && poem.bookUrl)
    .filter((poem) =>
      normalizeSearchText(`${poem.bookTitle} ${poem.poetName}`).includes(query),
    )
    .map((poem) => ({
      key: `ganjoor-${poem.bookUrl}`,
      title: poem.bookTitle!,
      poetName: poem.poetName,
      href: `/${poem.poetSlug}`,
    }));

const emptyState: SearchState = {
  poets: [],
  poems: [],
  books: [],
};

const GlobalSearchDialog: React.FC<GlobalSearchDialogProps> = ({
  isOpen,
  onClose,
  initialFilter = "all",
}) => {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SearchFilter>(initialFilter);
  const [results, setResults] = useState<SearchState>(emptyState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allPoets, setAllPoets] = useState<Poet[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const normalizedQuery = useMemo(() => normalizeSearchText(query), [query]);
  const shouldSearch = normalizedQuery.length >= 2;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFilter(initialFilter);
    window.setTimeout(() => inputRef.current?.focus(), 80);
  }, [initialFilter, isOpen]);

  useEffect(() => {
    if (!isOpen || allPoets.length > 0) {
      return;
    }

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
        logger.error("Error loading poets for search:", loadError);
      }
    };

    loadPoets();

    return () => {
      cancelled = true;
    };
  }, [allPoets.length, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!shouldSearch) {
      setResults(emptyState);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const shouldSearchPoems = filter === "all" || filter === "poems";
        const shouldSearchBooks = filter === "all" || filter === "books";
        const shouldSearchPoets = filter === "all" || filter === "poets";

        const matchingPoets = shouldSearchPoets
          ? allPoets
              .filter((poet) => poet.published && poetMatchesQuery(poet, normalizedQuery))
              .slice(0, 10)
          : [];

        const [remotePoems, localResults, echolaliaPoems, ganjoorBookResults] = await Promise.all([
          shouldSearchPoems || shouldSearchBooks
            ? ganjoorApi.searchPoems(query, { pageSize: 14 })
            : Promise.resolve([]),
          shouldSearchPoems || shouldSearchBooks
            ? searchLocalPoemsAndBooks(normalizedQuery)
            : Promise.resolve({ poems: [], books: [] }),
          shouldSearchPoems ? searchEcholaliaPoems(query) : Promise.resolve([]),
          shouldSearchBooks
            ? searchGanjoorBooks(normalizedQuery, allPoets)
            : Promise.resolve([]),
        ]);

        const remoteBookResults = shouldSearchBooks
          ? deriveBooksFromPoems(remotePoems, normalizedQuery)
          : [];

        if (!cancelled) {
          setResults({
            poets: matchingPoets,
            poems: shouldSearchPoems
              ? [
                  ...remotePoems.slice(0, 12),
                  ...localResults.poems,
                  ...echolaliaPoems,
                ].slice(0, 18)
              : [],
            books: shouldSearchBooks
              ? uniqueBooks([
                  ...ganjoorBookResults,
                  ...remoteBookResults,
                  ...localResults.books,
                ]).slice(0, 12)
              : [],
          });
        }
      } catch (searchError) {
        logger.error("Global search failed:", searchError);
        if (!cancelled) {
          setError("جستجو کامل نشد. کمی بعد دوباره تلاش کنید.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [allPoets, filter, isOpen, normalizedQuery, query, shouldSearch]);

  const hasResults =
    results.poets.length > 0 ||
    results.poems.length > 0 ||
    results.books.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="settings-backdrop global-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="global-search-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="global-search-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="global-search-title"
              initial={{ scale: 0.96, opacity: 0, y: 18 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 18 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.18 }}
            >
              <header className="global-search-header">
                <h2 id="global-search-title">جستجو</h2>
                <button type="button" onClick={onClose} aria-label="بستن">
                  <FaTimes />
                </button>
              </header>

              <div className="global-search-input-wrap">
                <FaSearch aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="نام شاعر، شعر یا دفتر..."
                  aria-label="جستجوی سراسری"
                />
              </div>

              <div className="global-search-filters">
                {SEARCH_FILTERS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={filter === option.value ? "active" : ""}
                    onClick={() => setFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="global-search-results modern-scrollbar">
                {!shouldSearch && (
                  <p className="global-search-empty">
                    حداقل دو نویسه وارد کنید.
                  </p>
                )}
                {isLoading && (
                  <p className="global-search-empty">در حال جستجو...</p>
                )}
                {error && <p className="global-search-error">{error}</p>}
                {shouldSearch && !isLoading && !error && !hasResults && (
                  <p className="global-search-empty">نتیجه‌ای پیدا نشد.</p>
                )}

                {results.poets.length > 0 && (
                  <SearchSection title="شاعران" icon={<FaUser />}>
                    {results.poets.map((poet) => {
                      const poetHref = getPoetHref(poet);
                      const resultContent = (
                        <>
                          <span>{poet.nickname || poet.name}</span>
                          {poet.nickname && <small>{poet.name}</small>}
                        </>
                      );

                      if (/^https?:\/\//.test(poetHref)) {
                        return (
                          <a
                            key={`${poet.id}-${poet.urlSlug}`}
                            href={poetHref}
                            className="global-search-result"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={onClose}
                          >
                            {resultContent}
                          </a>
                        );
                      }

                      return (
                        <Link
                          key={`${poet.id}-${poet.urlSlug}`}
                          href={poetHref}
                          className="global-search-result"
                          onClick={onClose}
                        >
                          {resultContent}
                        </Link>
                      );
                    })}
                  </SearchSection>
                )}

                {results.books.length > 0 && (
                  <SearchSection title="دفترها و مجموعه‌ها" icon={<FaBookOpen />}>
                    {results.books.map((book) => (
                      <Link
                        key={book.key}
                        href={book.href}
                        className="global-search-result"
                        onClick={onClose}
                      >
                        <span>{book.title}</span>
                        <small>{book.poetName}</small>
                      </Link>
                    ))}
                  </SearchSection>
                )}

                {results.poems.length > 0 && (
                  <SearchSection title="شعرها" icon={<FaFeatherAlt />}>
                    {results.poems.map((poem) => (
                      <Link
                        key={`${"fullUrl" in poem ? "g" : "l"}-${poem.id}-${poem.poetSlug}`}
                        href={getPoemHref(poem)}
                        className="global-search-result"
                        onClick={onClose}
                      >
                        <span>{poem.title}</span>
                        <small>
                          {poem.poetName}
                          {"collection" in poem && poem.collection
                            ? `، ${poem.collection}`
                            : ""}
                        </small>
                        <p>{getResultExcerpt(poem, normalizedQuery)}</p>
                      </Link>
                    ))}
                  </SearchSection>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

function SearchSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="global-search-section">
      <h3>
        {icon}
        <span>{title}</span>
      </h3>
      <div>{children}</div>
    </section>
  );
}

export default GlobalSearchDialog;
