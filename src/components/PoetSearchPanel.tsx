"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FaSearch, FaTimes } from "react-icons/fa";
import ganjoorApi from "@/api/GanjoorApi";
import customApi from "@/api/CustomApi";
import echolaliaApi from "@/api/EcholaliaApi";
import type { GanjoorPoemSearchResult } from "@/types/ganjoor";
import type { Poet } from "@/types/poet";
import { PoetSlug, isValidPoetSlug } from "@/types/poet";
import { logger } from "@/utils/logger";

interface LocalPoemSearchResult {
  id: number;
  title: string;
  poetName: string;
  poetSlug: string;
  excerpt: string;
  collection: string | null;
  source: "custom" | "echolalia";
}

type LocalPoemSummary = {
  id: number;
  title: string;
  collection?: string;
  text?: string;
};

interface PoetSearchPanelProps {
  poet: Poet;
  localSummaries?: LocalPoemSummary[];
}

const EMPTY_LOCAL_SUMMARIES: LocalPoemSummary[] = [];

const normalizeSearchText = (value: string) =>
  value
    .trim()
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/\s+/g, " ")
    .toLowerCase();

const getLocalResults = (
  query: string,
  poet: Poet,
  poetSlug: string,
  localSummaries: LocalPoemSummary[],
): LocalPoemSearchResult[] => {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2) {
    return [];
  }

  return localSummaries
    .filter((poem) => {
      const haystack = normalizeSearchText(
        [poem.title, poem.collection, poem.text].filter(Boolean).join(" "),
      );
      return haystack.includes(normalizedQuery);
    })
    .slice(0, 12)
    .map(
      (poem): LocalPoemSearchResult => ({
        id: poem.id,
        title: poem.title,
        poetName: poet.nickname || poet.name,
        poetSlug,
        excerpt:
          (poem.text || "")
            .split("\n")
            .map((line) => line.trim())
            .find(Boolean) || poem.title,
        collection: poem.collection || null,
        source: poet.source === "echolalia" ? "echolalia" : "custom",
      }),
    );
};

const PoetSearchPanel = ({
  poet,
  localSummaries = EMPTY_LOCAL_SUMMARIES,
}: PoetSearchPanelProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    Array<GanjoorPoemSearchResult | LocalPoemSearchResult>
  >([]);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  const poetSlug = poet.urlSlug;
  const poetRef = useRef(poet);
  poetRef.current = poet;

  useEffect(() => {
    const currentPoet = poetRef.current;
    const normalizedQuery = normalizeSearchText(query);
    if (normalizedQuery.length < 2) {
      setResults((current) => (current.length === 0 ? current : []));
      setLoading(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      const localResults = getLocalResults(
        query,
        currentPoet,
        poetSlug,
        localSummaries,
      );

      try {
        let remoteResults: Array<GanjoorPoemSearchResult | LocalPoemSearchResult> =
          [];

        if (currentPoet.source === "ganjoor" || !currentPoet.source) {
          remoteResults = await ganjoorApi.searchPoems(normalizedQuery, {
            poetId: currentPoet.id,
            pageSize: 12,
          });
        } else if (currentPoet.source === "echolalia") {
          const poems = await echolaliaApi.searchPoemsByPoetSlug(
            poetSlug,
            normalizedQuery,
          );
          remoteResults = poems.map((poem) => ({
            id: poem.id,
            title: poem.title,
            poetName: currentPoet.nickname || currentPoet.name,
            poetSlug,
            excerpt: poem.excerpt,
            collection: poem.collection,
            source: "echolalia" as const,
          }));
        } else if (isValidPoetSlug(poetSlug)) {
          const poems = await customApi.searchPoemsInPoet(
            poetSlug as PoetSlug,
            normalizedQuery,
          );
          remoteResults = poems.map((poem) => ({
            id: poem.id,
            title: poem.title,
            poetName: currentPoet.nickname || currentPoet.name,
            poetSlug,
            excerpt: poem.excerpt,
            collection: poem.collection,
            source: "custom" as const,
          }));
        }

        if (requestIdRef.current !== requestId) {
          return;
        }

        setResults([...localResults, ...remoteResults].slice(0, 16));
      } catch (error) {
        logger.error("Poet search failed:", error);
        if (requestIdRef.current === requestId) {
          setResults(localResults);
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [localSummaries, poet.id, poet.source, poetSlug, query]);

  const getHref = (poem: GanjoorPoemSearchResult | LocalPoemSearchResult) => {
    if ("fullUrl" in poem) {
      return `/poem/${poem.id}`;
    }
    return `/${poem.poetSlug}/${poem.id}`;
  };

  return (
    <section className="poet-search-panel" aria-label="جستجو در اشعار شاعر">
      <h3 className="poet-info-section-title">جستجو در اشعار</h3>
      <form
        className="poet-search-form"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`جستجو در ${poet.nickname || poet.name}`}
          aria-label="جستجو در اشعار این شاعر"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="پاک کردن جستجو"
          >
            <FaTimes />
          </button>
        ) : (
          <span aria-hidden="true">
            <FaSearch />
          </span>
        )}
      </form>
      {loading && <p className="poet-search-status">در حال جستجو...</p>}
      {!loading && query.trim().length >= 2 && results.length === 0 && (
        <p className="poet-search-status">نتیجه‌ای پیدا نشد.</p>
      )}
      {results.length > 0 && (
        <ul className="poet-search-results">
          {results.map((poem) => (
            <li key={`${"source" in poem ? poem.source : "ganjoor"}-${poem.id}`}>
              <Link href={getHref(poem)} className="poet-search-result-link">
                <strong>{poem.title}</strong>
                {"collection" in poem && poem.collection && (
                  <span>{poem.collection}</span>
                )}
                <p>{("excerpt" in poem && poem.excerpt) || poem.title}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default PoetSearchPanel;
