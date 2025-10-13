"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaExternalLinkAlt, FaSearch, FaSpinner, FaTimes } from "react-icons/fa";
import Link from "next/link";
import ganjoorApi from "@/api/GanjoorApi";
import type { PoemSearchResult } from "@/types/poem";

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onResultSelect?: () => void;
  initialQuery?: string;
}

const SearchDialog: React.FC<SearchDialogProps> = ({
  isOpen,
  onClose,
  onResultSelect,
  initialQuery = "",
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PoemSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExecutedQuery, setLastExecutedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setResults([]);
      setError(null);
      setIsSearching(false);
      setLastExecutedQuery("");
      return;
    }

    setQuery(initialQuery);

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
      if (initialQuery) {
        inputRef.current?.select();
      }
    }, 120);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [initialQuery, isOpen, onClose]);

  const runSearch = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      setLastExecutedQuery("");
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const data = await ganjoorApi.searchPoems(trimmed);
      setResults(data);
      setLastExecutedQuery(trimmed);
    } catch (err) {
      console.error("Search error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "در جست‌وجوی اشعار مشکلی پیش آمد. لطفاً دوباره تلاش کنید",
      );
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      setLastExecutedQuery("");
      return;
    }

    if (trimmed === lastExecutedQuery) {
      return;
    }

    const timer = window.setTimeout(() => {
      runSearch(trimmed);
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen, query, lastExecutedQuery, runSearch]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      runSearch(query);
    },
    [query, runSearch],
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleResultClick = useCallback(() => {
    onResultSelect?.();
    onClose();
  }, [onClose, onResultSelect]);

  const helperText = useMemo(() => {
    if (error) return error;
    if (!query.trim()) return "برای جست‌وجو، عبارت یا نام شاعر را بنویسید.";
    if (isSearching) return "در حال جست‌وجو...";
    if (lastExecutedQuery && results.length === 0) {
      return `موردی برای «${lastExecutedQuery}» یافت نشد.`;
    }
    return null;
  }, [error, isSearching, lastExecutedQuery, query, results.length]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="search-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            className="search-dialog"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-dialog-title"
          >
            <motion.div
              className="search-panel"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            >
              <div className="search-header">
                <h2 id="search-dialog-title">جست‌وجوی شعر</h2>
                <button
                  type="button"
                  className="search-close-button"
                  onClick={handleClose}
                  aria-label="بستن جست‌وجو"
                >
                  <FaTimes />
                </button>
              </div>
              <form className="search-form" onSubmit={handleSubmit} role="search">
                <div className="search-input-wrapper">
                  <FaSearch className="search-input-icon" aria-hidden="true" />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="search-input"
                    placeholder="عبارت مورد نظر را وارد کنید"
                    aria-label="عبارت جست‌وجو"
                  />
                  {query && (
                    <button
                      type="button"
                      className="search-clear-button"
                      onClick={() => setQuery("")}
                      aria-label="پاک کردن عبارت جست‌وجو"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
              </form>
              {helperText && (
                <p className="search-helper-text">
                  {isSearching && <FaSpinner className="search-spinner" aria-hidden="true" />}
                  {helperText}
                </p>
              )}
              <ul className="search-results">
                {results.map((result) => (
                  <li key={`${result.id}-${result.fullUrl}`}>
                    <Link
                      href={result.fullUrl || "/"}
                      className="search-result-item"
                      onClick={handleResultClick}
                    >
                      <div className="search-result-header">
                        <span className="search-result-title">{result.title}</span>
                        {result.poetName && (
                          <span className="search-result-poet">{result.poetName}</span>
                        )}
                      </div>
                      {result.excerpt && (
                        <p className="search-result-excerpt">{result.excerpt}</p>
                      )}
                      <span className="search-result-action" aria-hidden="true">
                        <FaExternalLinkAlt />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SearchDialog;
