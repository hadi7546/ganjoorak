"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  FaBars,
  FaChevronDown,
  FaChevronLeft,
  FaChevronUp,
  FaRandom,
} from "react-icons/fa";

import PoemViewer from "@/components/PoemViewer";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorScreen from "@/components/ErrorScreen";
import customApi from "@/api/CustomApi";
import ganjoorApi from "@/api/GanjoorApi";
import type { Poem } from "@/types/poem";
import AppNotFound from "@/app/not-found";
import {
  GanjoorCategory,
  GanjoorPoemSummary,
  PoetSlug,
  isValidPoetSlug,
  poetNames,
} from "@/types/poet";
import { logger } from "@/utils/logger";

type PoetSource = "ganjoor" | "custom";

export default function PoetPage() {
  const params = useParams();
  const poetSlug = params.poet as string;

  const [poems, setPoems] = useState<Poem[]>([]);
  const [currentPoemIndex, setCurrentPoemIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<PoetSource | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isFetchingPoem, setIsFetchingPoem] = useState(false);

  const [categories, setCategories] = useState<GanjoorCategory[]>([]);
  const [categoryPoems, setCategoryPoems] = useState<
    Record<number, GanjoorPoemSummary[]>
  >({});
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [activeCategoryLoading, setActiveCategoryLoading] = useState<number | null>(
    null,
  );
  const [poetTitle, setPoetTitle] = useState<string>("");
  const [isSideCollapsed, setIsSideCollapsed] = useState(false);

  const currentPoem = useMemo(
    () => poems[currentPoemIndex] || null,
    [currentPoemIndex, poems],
  );

  const addPoemToHistory = (poem: Poem) => {
    setPoems((prev) => {
      const trimmed = prev.slice(0, currentPoemIndex + 1);
      const newPoems = [...trimmed, poem];
      setCurrentPoemIndex(newPoems.length - 1);
      return newPoems;
    });
  };

  const ensureCategoryPoems = async (categoryId: number) => {
    if (categoryPoems[categoryId]) {
      return categoryPoems[categoryId];
    }

    setActiveCategoryLoading(categoryId);
    const category = await ganjoorApi.getCategoryWithPoems(categoryId);
    const poemsList = category.poems || [];
    setCategoryPoems((prev) => ({ ...prev, [categoryId]: poemsList }));
    setActiveCategoryLoading(null);
    return poemsList;
  };

  const fetchRandomFromCategory = async (
    categoryId: number,
    skipLoader = false,
  ) => {
    try {
      if (!skipLoader) {
        setIsFetchingPoem(true);
      }
      const poemsList = await ensureCategoryPoems(categoryId);

      if (!poemsList.length) {
        throw new Error("برای این بخش شعری ثبت نشده است");
      }

      const randomPoem =
        poemsList[Math.floor(Math.random() * poemsList.length)];
      const fullPoem = await ganjoorApi.getPoemById(randomPoem.id);
      addPoemToHistory(fullPoem);
      setError(null);
    } catch (err) {
      logger.error("Error fetching random poem from category", err);
      setError("متأسفانه در دریافت شعر مشکلی پیش آمد. لطفاً دوباره تلاش کنید");
    } finally {
      setIsFetchingPoem(false);
    }
  };

  const fetchPoemById = async (poemId: number) => {
    try {
      setIsFetchingPoem(true);
      const poem = await ganjoorApi.getPoemById(poemId);
      addPoemToHistory(poem);
      setError(null);
    } catch (err) {
      logger.error("Error fetching poem by id", err);
      setError("متأسفانه در دریافت شعر مشکلی پیش آمد. لطفاً دوباره تلاش کنید");
    } finally {
      setIsFetchingPoem(false);
    }
  };

  const loadCustomPoem = async () => {
    try {
      setIsFetchingPoem(true);
      const randomPoem = await customApi.getRandomPoem(poetSlug as PoetSlug);
      addPoemToHistory(randomPoem);
      setError(null);
    } catch (err) {
      logger.error("Error fetching custom poem", err);
      setError("متأسفانه در بارگیری شعرها مشکلی پیش آمد. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsFetchingPoem(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        setError(null);
        setNotFound(false);
        setPoems([]);
        setCategoryPoems({});
        setExpandedCategories(new Set());
        setSelectedCategoryId(null);
        setSource(null);

        if (isValidPoetSlug(poetSlug)) {
          setSource("custom");
          setPoetTitle(poetNames[poetSlug as PoetSlug] || poetSlug);
          await loadCustomPoem();
          return;
        }

        if (!poetSlug || poetSlug.length < 2 || /[^a-zA-Z0-9-]/.test(poetSlug)) {
          setNotFound(true);
          return;
        }

        try {
          const poetId = await ganjoorApi.slugToId(poetSlug);
          const poetWithCategories = await ganjoorApi.getPoetCategories(poetId);
          const books = poetWithCategories.category.children || [];

          if (!books.length) {
            setError("کتاب یا مجموعه‌ای برای این شاعر یافت نشد");
            return;
          }

          setCategories(books);
          setSelectedCategoryId(books[0].id);
          setExpandedCategories(new Set([books[0].id]));
          setPoetTitle(
            poetWithCategories.poet.name ||
              poetWithCategories.poet.nickname ||
              poetSlug,
          );
          setSource("ganjoor");
          await fetchRandomFromCategory(books[0].id, true);
        } catch (err: any) {
          if (err.response?.status === 404) {
            setNotFound(true);
          } else {
            logger.error("Error loading poet info", err);
            setError("متأسفانه در بررسی اطلاعات شاعر مشکلی پیش آمد");
          }
        }
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [poetSlug]);

  const handleNext = () => {
    if (currentPoemIndex < poems.length - 1) {
      setCurrentPoemIndex((prev) => prev + 1);
      return;
    }

    if (source === "custom") {
      void loadCustomPoem();
      return;
    }

    if (source === "ganjoor" && selectedCategoryId) {
      void fetchRandomFromCategory(selectedCategoryId);
    }
  };

  const handlePrevious = () => {
    if (currentPoemIndex > 0) {
      setCurrentPoemIndex((prev) => prev - 1);
    }
  };

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const updated = new Set(prev);
      if (updated.has(categoryId)) {
        updated.delete(categoryId);
      } else {
        updated.add(categoryId);
        void ensureCategoryPoems(categoryId);
      }
      return updated;
    });
  };

  const handlePoemSelect = (poemId: number, categoryId: number) => {
    setSelectedCategoryId(categoryId);
    void fetchPoemById(poemId);
  };

  if (notFound) {
    return <AppNotFound />;
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} onRetry={() => window.location.reload()} />;
  }

  if (!currentPoem) {
    return (
      <ErrorScreen
        message="متأسفانه شعری یافت نشد"
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {source === "ganjoor" && (
        <div
          className={`border-l bg-gray-50 transition-all duration-300 ${
            isSideCollapsed ? "w-14" : "w-80"
          }`}
        >
          <div className="flex items-center justify-between px-3 py-3 border-b">
            <div className="flex items-center gap-2">
              <button
                className="rounded-md p-2 hover:bg-gray-200"
                onClick={() => setIsSideCollapsed((prev) => !prev)}
                aria-label="toggle menu"
              >
                <FaBars />
              </button>
              {!isSideCollapsed && (
                <div>
                  <div className="text-sm text-gray-600">مجموعه‌های شاعر</div>
                  <div className="font-semibold">{poetTitle}</div>
                </div>
              )}
            </div>
            {!isSideCollapsed && selectedCategoryId && (
              <button
                className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
                onClick={() => fetchRandomFromCategory(selectedCategoryId)}
                disabled={isFetchingPoem}
              >
                <FaRandom />
                شعر تصادفی
              </button>
            )}
          </div>

          {!isSideCollapsed && (
            <div className="h-full overflow-y-auto px-3 py-4 space-y-3">
              {categories.map((category) => {
                const isExpanded = expandedCategories.has(category.id);
                const poemsList = categoryPoems[category.id] || [];
                const isLoadingCategory = activeCategoryLoading === category.id;

                return (
                  <div key={category.id} className="rounded-md border bg-white">
                    <button
                      className="flex w-full items-center justify-between px-3 py-2 text-right hover:bg-gray-100"
                      onClick={() => toggleCategory(category.id)}
                    >
                      <span className="font-medium text-gray-800">
                        {category.title}
                      </span>
                      {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                    </button>

                    {isExpanded && (
                      <div className="border-t px-3 py-2 text-sm text-gray-700">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs text-gray-500">فهرست اشعار</span>
                          <button
                            className="flex items-center gap-1 rounded-md bg-gray-800 px-2 py-1 text-white hover:bg-gray-700"
                            onClick={() => fetchRandomFromCategory(category.id)}
                            disabled={isFetchingPoem}
                          >
                            <FaRandom />
                            تصادفی
                          </button>
                        </div>
                        {isLoadingCategory && (
                          <div className="py-2 text-xs text-gray-500">در حال بارگذاری...</div>
                        )}
                        {!isLoadingCategory && (
                          <div className="space-y-1 max-h-64 overflow-y-auto">
                            {poemsList.map((poem) => (
                              <button
                                key={poem.id}
                                className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-right hover:bg-gray-100 ${
                                  selectedCategoryId === category.id &&
                                  currentPoem?.id === poem.id
                                    ? "bg-indigo-50 text-indigo-700"
                                    : ""
                                }`}
                                onClick={() => handlePoemSelect(poem.id, category.id)}
                              >
                                <span className="truncate text-sm">{poem.title}</span>
                                <FaChevronLeft className="text-gray-400" />
                              </button>
                            ))}
                            {!poemsList.length && (
                              <div className="py-2 text-xs text-gray-500">
                                شعری برای این بخش پیدا نشد
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="text-xs text-gray-500">شاعر</div>
            <div className="text-lg font-semibold">{poetTitle}</div>
          </div>
          {source === "ganjoor" && selectedCategoryId && (
            <button
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
              onClick={() => fetchRandomFromCategory(selectedCategoryId)}
              disabled={isFetchingPoem}
            >
              <FaRandom />
              شعر تصادفی دیگر
            </button>
          )}
          {source === "custom" && (
            <button
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
              onClick={() => loadCustomPoem()}
              disabled={isFetchingPoem}
            >
              <FaRandom />
              شعر تصادفی
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          <PoemViewer
            poem={currentPoem}
            onNext={handleNext}
            onPrevious={handlePrevious}
            isFirst={currentPoemIndex === 0}
            isLast={currentPoemIndex === poems.length - 1}
            isModern={source === "custom"}
            poetSlug={poetSlug as PoetSlug}
            isPoetPage={true}
          />
        </div>
      </div>
    </div>
  );
}
