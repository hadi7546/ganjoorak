"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useSearchParams } from "next/navigation";
import { FaInfoCircle, FaTimes } from "react-icons/fa";
import PoemViewer from "@/components/PoemViewer";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorScreen from "@/components/ErrorScreen";
import AppNotFound from "@/app/not-found";
import ganjoorApi from "@/api/GanjoorApi";
import customApi from "@/api/CustomApi";
import type { Poem } from "@/types/poem";
import type { Poet } from "@/types/poet";
import type { GanjoorCategory, GanjoorPoetCatalog } from "@/types/ganjoor";
import { PoetSlug, isValidPoetSlug } from "@/types/poet";
import PoetImage from "@/components/PoetImage";
import { useSettings } from "@/context/SettingsContext";
import { logger } from "@/utils/logger";
// Sidebar collapse icons removed (no longer used)

const persianNumberFormatter = new Intl.NumberFormat("fa-IR");

const formatPersianNumber = (value: number) =>
  persianNumberFormatter.format(value);

const createPoemOrder = (ids: number[], randomize: boolean): number[] => {
  const uniqueIds = Array.from(
    new Set(ids.filter((id) => typeof id === "number" && id > 0)),
  );
  if (!randomize) {
    return uniqueIds;
  }
  const shuffled = [...uniqueIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const indexCategories = (
  root: GanjoorCategory,
): Record<number, GanjoorCategory> => {
  const map: Record<number, GanjoorCategory> = {};
  const traverse = (node: GanjoorCategory) => {
    map[node.id] = node;
    if (Array.isArray(node.children)) {
      node.children.forEach(traverse);
    }
  };
  traverse(root);
  return map;
};

interface CategoryListProps {
  categories: GanjoorCategory[];
  selectedId: number | null;
  onSelectCategory: (categoryId: number) => void;
  categoryCache: Record<number, GanjoorCategory>;
  level?: number;
}

function CategoryList({
  categories,
  selectedId,
  onSelectCategory,
  categoryCache,
  level = 0,
}: CategoryListProps) {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <ul
      className={
        level === 0
          ? "space-y-2"
          : "space-y-1 border-r border-neutral-800/50 pr-4"
      }
    >
      {categories.map((category) => {
        const cached = categoryCache[category.id] ?? category;
        const poemCount = cached.poems?.length ?? 0;
        const childNodes =
          cached.children && cached.children.length > 0
            ? cached.children
            : category.children;
        const isSelected = selectedId === category.id;

        return (
          <li key={category.id}>
            <button
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={`w-full rounded-lg border px-3 py-2 text-right transition ${
                isSelected
                  ? "border-neutral-700 bg-neutral-800/70 text-neutral-50"
                  : "border-transparent text-neutral-200 hover:bg-neutral-800/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{category.title}</span>
                {poemCount > 0 && (
                  <span className="text-xs text-neutral-400">
                    {formatPersianNumber(poemCount)}
                  </span>
                )}
              </div>
            </button>
            {childNodes && childNodes.length > 0 && (
              <div className="mt-2">
                <CategoryList
                  categories={childNodes}
                  selectedId={selectedId}
                  onSelectCategory={onSelectCategory}
                  categoryCache={categoryCache}
                  level={level + 1}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PoetDetails({ poet }: { poet: Poet }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <PoetImage
          imgUrl={poet.imageUrl}
          alt={poet.name}
          poetSlug={poet.urlSlug}
          width={72}
          height={72}
        />
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-neutral-50">
            {poet.nickname || poet.name}
          </h1>
          {poet.nickname && (
            <span className="text-sm text-neutral-400">{poet.name}</span>
          )}
          <div className="flex flex-wrap gap-x-3 text-xs text-neutral-500">
            {poet.birthPlace && <span>زادگاه: {poet.birthPlace}</span>}
            {poet.deathPlace && <span>آرامگاه: {poet.deathPlace}</span>}
          </div>
        </div>
      </div>
      {poet.description && (
        <p className="modern-scrollbar max-h-64 overflow-y-auto whitespace-pre-line text-sm leading-7 text-neutral-300">
          {poet.description}
        </p>
      )}
    </div>
  );
}

function GanjoorPoetPage({ slug, poetId }: { slug: string; poetId?: number }) {
  const { settings } = useSettings();
  const randomizePoems = settings.randomizePoems;

  const [catalog, setCatalog] = useState<GanjoorPoetCatalog | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [categoryCache, setCategoryCache] = useState<
    Record<number, GanjoorCategory>
  >({});
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [poemOrder, setPoemOrder] = useState<number[]>([]);
  const [currentPoemIndex, setCurrentPoemIndex] = useState(0);
  const [currentPoem, setCurrentPoem] = useState<Poem | null>(null);
  const [poemError, setPoemError] = useState<string | null>(null);
  const [poemLoading, setPoemLoading] = useState(false);

  const poemCacheRef = useRef<Record<number, Poem>>({});
  const poemOrderRef = useRef<number[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      setLoadingCatalog(true);
      setCatalogError(null);
      setNotFound(false);
      setCatalog(null);
      setCategoryCache({});
      setSelectedCategoryId(null);
      setCategoryError(null);
      setPoemOrder([]);
      setCurrentPoem(null);
      setPoemError(null);
      setCurrentPoemIndex(0);
      poemCacheRef.current = {};
      poemOrderRef.current = [];

      try {
        const fetchedCatalog = await ganjoorApi.getPoetCatalog(slug, poetId);
        if (cancelled) return;
        setCatalog(fetchedCatalog);
        setCategoryCache(indexCategories(fetchedCatalog.category));
        const defaultCategoryId =
          fetchedCatalog.category.children[0]?.id ?? fetchedCatalog.category.id;
        setSelectedCategoryId(defaultCategoryId);
      } catch (error: any) {
        if (cancelled) return;
        logger.error("Error loading poet catalog:", error);
        if (
          error instanceof Error &&
          error.message &&
          /یافت نشد/.test(error.message)
        ) {
          setNotFound(true);
        } else {
          setCatalogError(
            "متأسفانه در دریافت اطلاعات شاعر مشکلی پیش آمد. لطفاً دوباره تلاش کنید.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingCatalog(false);
        }
      }
    };

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [slug, poetId, reloadKey]);

  const cachedCategory = selectedCategoryId
    ? categoryCache[selectedCategoryId]
    : undefined;

  const fetchPoemById = useCallback(async (poemId: number) => {
    if (poemCacheRef.current[poemId]) {
      return poemCacheRef.current[poemId];
    }
    const poemData = await ganjoorApi.getPoemById(poemId);
    poemCacheRef.current[poemId] = poemData;
    return poemData;
  }, []);

  const loadPoemAtIndex = useCallback(
    async (index: number, orderOverride?: number[]) => {
      const order = orderOverride ?? poemOrderRef.current;
      if (!order.length || index < 0 || index >= order.length) {
        return;
      }

      setPoemLoading(true);
      setPoemError(null);
      try {
        const poemId = order[index];
        const poemData = await fetchPoemById(poemId);
        setCurrentPoem(poemData);
        setCurrentPoemIndex(index);
      } catch (error) {
        logger.error("Error loading poem:", error);
        setPoemError(
          "متأسفانه در دریافت شعر مشکلی پیش آمد. لطفاً دوباره تلاش کنید.",
        );
      } finally {
        setPoemLoading(false);
      }
    },
    [fetchPoemById],
  );

  useEffect(() => {
    if (!selectedCategoryId) return;
    let cancelled = false;

    const applyCategory = async (categoryData: GanjoorCategory) => {
      const poemIds = (categoryData.poems ?? []).map((poem) => poem.id);
      const order = createPoemOrder(poemIds, randomizePoems);
      if (cancelled) return;

      poemOrderRef.current = order;
      setPoemOrder(order);

      if (order.length === 0) {
        setCurrentPoem(null);
        setCurrentPoemIndex(0);
        setPoemError("در این مجموعه شعری ثبت نشده است.");
        return;
      }

      await loadPoemAtIndex(0, order);
    };

    const hasPoems =
      cachedCategory && cachedCategory.poems && cachedCategory.poems.length > 0;

    if (hasPoems) {
      setCategoryLoading(false);
      setCategoryError(null);
      setPoemError(null);
      applyCategory(cachedCategory!);
      return;
    }

    setCategoryLoading(true);
    setCategoryError(null);
    setPoemError(null);

    const fetchCategory = async () => {
      try {
        const fetched =
          await ganjoorApi.getCategoryWithPoems(selectedCategoryId);
        if (cancelled) return;
        setCategoryCache((prev) => ({
          ...prev,
          [selectedCategoryId]: fetched,
        }));
        await applyCategory(fetched);
      } catch (error) {
        if (cancelled) return;
        logger.error("Error fetching category data:", error);
        setCategoryError(
          "متأسفانه در دریافت مجموعهٔ اشعار مشکلی پیش آمد. لطفاً دوباره تلاش کنید.",
        );
        setPoemOrder([]);
        poemOrderRef.current = [];
        setCurrentPoem(null);
        setCurrentPoemIndex(0);
      } finally {
        if (!cancelled) {
          setCategoryLoading(false);
        }
      }
    };

    fetchCategory();

    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId, cachedCategory, randomizePoems, loadPoemAtIndex]);

  const handleSelectCategory = useCallback(
    (categoryId: number) => {
      if (categoryId === selectedCategoryId) {
        return;
      }
      setCategoryError(null);
      setPoemError(null);
      setPoemOrder([]);
      poemOrderRef.current = [];
      setCurrentPoem(null);
      setCurrentPoemIndex(0);
      setSelectedCategoryId(categoryId);
    },
    [selectedCategoryId],
  );

  const handleRetryCatalog = () => setReloadKey((prev) => prev + 1);

  const handleRetryCategory = useCallback(() => {
    if (!selectedCategoryId) return;
    setCategoryCache((prev) => {
      const next = { ...prev };
      delete next[selectedCategoryId];
      return next;
    });
    setCategoryError(null);
  }, [selectedCategoryId]);

  const handleRetryPoem = useCallback(() => {
    loadPoemAtIndex(currentPoemIndex);
  }, [currentPoemIndex, loadPoemAtIndex]);

  const handleNext = useCallback(() => {
    const order = poemOrderRef.current;
    if (!order.length) return;
    const nextIndex = currentPoemIndex + 1;

    if (nextIndex < order.length) {
      loadPoemAtIndex(nextIndex);
      return;
    }

    if (randomizePoems && order.length > 0) {
      const reshuffled = createPoemOrder(order, true);
      poemOrderRef.current = reshuffled;
      setPoemOrder(reshuffled);
      loadPoemAtIndex(0, reshuffled);
    }
  }, [currentPoemIndex, randomizePoems, loadPoemAtIndex]);

  const handlePrevious = useCallback(() => {
    const order = poemOrderRef.current;
    if (!order.length) return;
    const prevIndex = currentPoemIndex - 1;

    if (prevIndex >= 0) {
      loadPoemAtIndex(prevIndex);
    }
  }, [currentPoemIndex, loadPoemAtIndex]);

  const topLevelCategories = useMemo(() => {
    if (!catalog) return [];
    const root = categoryCache[catalog.category.id] ?? catalog.category;
    if ((root.poems?.length ?? 0) > 0) {
      return [root];
    }
    return root.children ?? [];
  }, [catalog, categoryCache]);

  const selectedCategory = cachedCategory ?? null;
  const isFirstPoem = currentPoemIndex <= 0;
  const isLastPoem =
    !randomizePoems &&
    (poemOrder.length === 0 || currentPoemIndex >= poemOrder.length - 1);
  const showPoemLoadingOverlay = poemLoading && !currentPoem;
  const containerClassName = [
    "poet-page",
    "sidebar-open",
    // Sidebar width marker for correct toggle positioning (wide sidebar variant)
    "relative flex h-screen flex-col bg-neutral-950 text-neutral-100 lg:flex-row sidebar-w-96",
  ].join(" ");

  if (loadingCatalog) {
    return <LoadingScreen />;
  }

  if (notFound) {
    return <AppNotFound />;
  }

  if (catalogError) {
    return <ErrorScreen message={catalogError} onRetry={handleRetryCatalog} />;
  }

  if (!catalog) {
    return null;
  }

  return (
    <div className={containerClassName}>
      <div
        className={
          isSidebarOpen ? "relative w-full lg:w-96" : "relative hidden lg:w-0"
        }
      >
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="sidebar-panel absolute inset-0 z-20 w-full border-b border-neutral-800/60 bg-neutral-900/40 px-6 pb-6 pt-6 backdrop-blur lg:border-b-0 lg:border-l lg:pt-6"
            >
              <div className="relative flex items-center justify-center pb-4 pr-4 pl-0">
                <h2 className="text-sm font-semibold text-neutral-200">
                  اطلاعات شاعر
                </h2>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="settings-close absolute left-0"
                  aria-label="بستن"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="space-y-6 pl-4">
                <div>
                  <div className="mt-0">
                    <PoetDetails poet={catalog.poet} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h2 className="mb-3 text-sm font-semibold text-neutral-200">
                      مجموعه‌ها
                    </h2>
                    {topLevelCategories.length > 0 ? (
                      <CategoryList
                        categories={topLevelCategories}
                        selectedId={selectedCategoryId}
                        onSelectCategory={handleSelectCategory}
                        categoryCache={categoryCache}
                      />
                    ) : (
                      <p className="text-sm text-neutral-400">
                        مجموعه‌ای برای این شاعر ثبت نشده است.
                      </p>
                    )}
                    {categoryLoading && (
                      <p className="mt-3 text-xs text-neutral-500">
                        در حال بارگذاری مجموعه...
                      </p>
                    )}
                    {categoryError && (
                      <div className="mt-3 rounded-md bg-red-900/30 px-3 py-2 text-xs text-red-200">
                        <p>{categoryError}</p>
                        <button
                          type="button"
                          className="mt-2 rounded bg-red-600/80 px-3 py-1 text-xs text-white hover:bg-red-600"
                          onClick={handleRetryCategory}
                        >
                          تلاش مجدد
                        </button>
                      </div>
                    )}
                  </div>
                  {selectedCategory &&
                    !currentPoem &&
                    selectedCategory.description && (
                      <div className="rounded-lg border border-neutral-800/60 bg-neutral-900/50 p-3 text-xs leading-6 text-neutral-400">
                        {selectedCategory.description}
                      </div>
                    )}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {!isSidebarOpen && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="sidebar-toggle-button"
            aria-label="نمایش اطلاعات شاعر"
          >
            <FaInfoCircle size={16} />
          </button>
        )}
        {selectedCategory && !currentPoem && (
          <div className="border-b border-neutral-800/60 bg-neutral-900/40 px-5 py-3 text-sm text-neutral-300">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1 text-right">
                <span className="text-base font-semibold text-neutral-100">
                  {selectedCategory.title}
                </span>
                {selectedCategory.bookName && (
                  <span className="text-xs text-neutral-500">
                    {selectedCategory.bookName}
                  </span>
                )}
              </div>
              {poemOrder.length > 0 && (
                <span className="text-xs text-neutral-500">
                  {formatPersianNumber(currentPoemIndex + 1)} از{" "}
                  {formatPersianNumber(poemOrder.length)}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="relative flex flex-1 flex-col overflow-hidden">
          {showPoemLoadingOverlay && <LoadingScreen />}

          {!showPoemLoadingOverlay && poemError && (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="text-sm text-neutral-300">{poemError}</p>
              {poemOrder.length > 0 && (
                <button
                  type="button"
                  onClick={handleRetryPoem}
                  className="rounded bg-neutral-700 px-4 py-2 text-sm text-neutral-50 hover:bg-neutral-600"
                >
                  تلاش مجدد
                </button>
              )}
            </div>
          )}

          {!showPoemLoadingOverlay && !poemError && currentPoem && (
            <PoemViewer
              poem={currentPoem}
              onNext={handleNext}
              onPrevious={handlePrevious}
              isFirst={isFirstPoem}
              isLast={isLastPoem}
              isModern={false}
              poetSlug={catalog.poet.urlSlug}
              isPoetPage={true}
            />
          )}

          {!showPoemLoadingOverlay && !poemError && !currentPoem && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-neutral-400">
              <p className="text-sm">هیچ شعری برای نمایش وجود ندارد.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function CustomPoetPage({ poetSlug }: { poetSlug: PoetSlug }) {
  const { settings } = useSettings();
  const randomizePoems = settings.randomizePoems;

  const [poetInfo, setPoetInfo] = useState<Poet | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [poemIds, setPoemIds] = useState<number[]>([]);
  const [poemOrder, setPoemOrder] = useState<number[]>([]);
  const [currentPoemIndex, setCurrentPoemIndex] = useState(0);
  const [currentPoem, setCurrentPoem] = useState<Poem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [poemError, setPoemError] = useState<string | null>(null);
  const [poemLoading, setPoemLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const poemMapRef = useRef<Record<number, any>>({});
  const poemCacheRef = useRef<Record<number, Poem>>({});
  const poemOrderRef = useRef<number[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadPoet = async () => {
      setLoading(true);
      setError(null);
      setPoemError(null);
      setPoemIds([]);
      setPoemOrder([]);
      poemOrderRef.current = [];
      setCurrentPoem(null);
      setCurrentPoemIndex(0);
      poemMapRef.current = {};
      poemCacheRef.current = {};

      try {
        const [info, dataset] = await Promise.all([
          customApi.getPoetInfo(poetSlug),
          customApi._getPoetData(poetSlug),
        ]);
        if (cancelled) return;

        setPoetInfo(info);

        if (!dataset || !Array.isArray(dataset.poems)) {
          setError("مجموعهٔ شعرهای این شاعر در دسترس نیست.");
          return;
        }

        const ids: number[] = [];
        const map: Record<number, any> = {};
        dataset.poems.forEach((poem: any) => {
          if (poem?.id) {
            map[poem.id] = poem;
            ids.push(poem.id);
          }
        });

        poemMapRef.current = map;
        setPoemIds(ids);
      } catch (err) {
        if (cancelled) return;
        logger.error("Error loading custom poet:", err);
        setError("متأسفانه در دریافت اطلاعات شاعر مشکلی پیش آمد.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPoet();

    return () => {
      cancelled = true;
    };
  }, [poetSlug, reloadKey]);

  const loadCustomPoem = useCallback(
    async (poemId: number) => {
      if (poemCacheRef.current[poemId]) {
        return poemCacheRef.current[poemId];
      }
      const localPoem = poemMapRef.current[poemId];
      if (!localPoem) {
        throw new Error("شعر یافت نشد");
      }
      const mapped = await customApi.mapLocalPoemToPoem(localPoem, poetSlug);
      poemCacheRef.current[poemId] = mapped;
      return mapped;
    },
    [poetSlug],
  );

  const loadPoemAtIndex = useCallback(
    async (index: number, orderOverride?: number[]) => {
      const order = orderOverride ?? poemOrderRef.current;
      if (!order.length || index < 0 || index >= order.length) {
        return;
      }

      setPoemLoading(true);
      setPoemError(null);

      try {
        const poemId = order[index];
        const poemData = await loadCustomPoem(poemId);
        setCurrentPoem(poemData);
        setCurrentPoemIndex(index);
      } catch (err) {
        logger.error("Error loading custom poem:", err);
        setPoemError("متأسفانه در دریافت شعر مشکلی پیش آمد.");
      } finally {
        setPoemLoading(false);
      }
    },
    [loadCustomPoem],
  );

  useEffect(() => {
    if (!poemIds.length) {
      setPoemOrder([]);
      poemOrderRef.current = [];
      setCurrentPoem(null);
      return;
    }

    const order = createPoemOrder(poemIds, randomizePoems);
    poemOrderRef.current = order;
    setPoemOrder(order);

    if (order.length === 0) {
      setCurrentPoem(null);
      setPoemError("شعری برای این شاعر ثبت نشده است.");
      return;
    }

    loadPoemAtIndex(0, order);
  }, [poemIds, randomizePoems, loadPoemAtIndex]);

  const handleNext = useCallback(() => {
    const order = poemOrderRef.current;
    if (!order.length) return;
    const nextIndex = currentPoemIndex + 1;

    if (nextIndex < order.length) {
      loadPoemAtIndex(nextIndex);
      return;
    }

    if (randomizePoems && order.length > 0) {
      const reshuffled = createPoemOrder(order, true);
      poemOrderRef.current = reshuffled;
      setPoemOrder(reshuffled);
      loadPoemAtIndex(0, reshuffled);
    }
  }, [currentPoemIndex, randomizePoems, loadPoemAtIndex]);

  const handlePrevious = useCallback(() => {
    const order = poemOrderRef.current;
    if (!order.length) return;
    const prevIndex = currentPoemIndex - 1;

    if (prevIndex >= 0) {
      loadPoemAtIndex(prevIndex);
    }
  }, [currentPoemIndex, loadPoemAtIndex]);

  const handleRetryPoem = useCallback(() => {
    loadPoemAtIndex(currentPoemIndex);
  }, [currentPoemIndex, loadPoemAtIndex]);

  const handleRetryPoet = () => setReloadKey((prev) => prev + 1);

  const isFirstPoem = currentPoemIndex <= 0;
  const isLastPoem =
    !randomizePoems &&
    (poemOrder.length === 0 || currentPoemIndex >= poemOrder.length - 1);
  const showPoemLoadingOverlay = poemLoading && !currentPoem;
  const containerClassName = [
    "poet-page",
    "sidebar-open",
    // Sidebar width marker for correct toggle positioning (narrow sidebar variant)
    "relative flex h-screen flex-col bg-neutral-950 text-neutral-100 lg:flex-row sidebar-w-80",
  ].join(" ");

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} onRetry={handleRetryPoet} />;
  }

  if (!poetInfo) {
    return null;
  }

  return (
    <div className={containerClassName}>
      <div
        className={
          isSidebarOpen ? "relative w-full lg:w-80" : "relative hidden lg:w-0"
        }
      >
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="sidebar-panel absolute inset-0 z-20 w-full border-b border-neutral-800/60 bg-neutral-900/40 px-6 pb-6 pt-6 backdrop-blur lg:border-b-0 lg:border-l lg:pt-6"
            >
              <div className="relative flex items-center justify-center pb-4 pr-4 pl-0">
                <h2 className="text-sm font-semibold text-neutral-200">
                  اطلاعات شاعر
                </h2>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="settings-close absolute left-0"
                  aria-label="بستن"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="space-y-6 pl-4">
                <div>
                  <div className="mt-0">
                    <PoetDetails poet={poetInfo} />
                  </div>
                </div>
                <div className="rounded-lg border border-neutral-800/60 bg-neutral-900/50 px-4 py-3 text-sm text-neutral-300">
                  <div className="flex items-center justify-between">
                    <span>تعداد شعرها</span>
                    <span>{formatPersianNumber(poemIds.length)}</span>
                  </div>
                </div>
                {poemError && (
                  <div className="rounded-md bg-red-900/30 px-3 py-2 text-xs text-red-200">
                    <p>{poemError}</p>
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {!isSidebarOpen && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="sidebar-toggle-button"
            aria-label="نمایش اطلاعات شاعر"
          >
            <FaInfoCircle size={16} />
          </button>
        )}
        <div className="border-b border-neutral-800/60 bg-neutral-900/40 px-5 py-3 text-sm text-neutral-300">
          <div className="flex items-center justify-between gap-2">
            <span className="text-base font-semibold text-neutral-100">
              شعرهای تصادفی از {poetInfo.nickname || poetInfo.name}
            </span>
            {poemOrder.length > 0 && (
              <span className="text-xs text-neutral-500">
                {formatPersianNumber(currentPoemIndex + 1)} از{" "}
                {formatPersianNumber(poemOrder.length)}
              </span>
            )}
          </div>
        </div>
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {showPoemLoadingOverlay && <LoadingScreen />}

          {!showPoemLoadingOverlay && poemError && (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="text-sm text-neutral-300">{poemError}</p>
              {poemOrder.length > 0 && (
                <button
                  type="button"
                  onClick={handleRetryPoem}
                  className="rounded bg-neutral-700 px-4 py-2 text-sm text-neutral-50 hover:bg-neutral-600"
                >
                  تلاش مجدد
                </button>
              )}
            </div>
          )}

          {!showPoemLoadingOverlay && !poemError && currentPoem && (
            <PoemViewer
              poem={currentPoem}
              onNext={handleNext}
              onPrevious={handlePrevious}
              isFirst={isFirstPoem}
              isLast={isLastPoem}
              isModern={true}
              poetSlug={poetSlug}
              isPoetPage={true}
            />
          )}

          {!showPoemLoadingOverlay && !poemError && !currentPoem && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-neutral-400">
              <p className="text-sm">هیچ شعری برای نمایش وجود ندارد.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function PoetPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const poetSlug = (params?.poet as string) || "";
  const poetIdParam = searchParams.get("poetId");
  const parsedPoetId = poetIdParam ? Number(poetIdParam) : NaN;
  const poetId =
    Number.isInteger(parsedPoetId) && parsedPoetId > 0
      ? parsedPoetId
      : undefined;

  if (!poetSlug || poetSlug.length < 2 || /[^a-z0-9-]/i.test(poetSlug)) {
    return <AppNotFound />;
  }

  if (isValidPoetSlug(poetSlug)) {
    return <CustomPoetPage poetSlug={poetSlug as PoetSlug} />;
  }

  return <GanjoorPoetPage slug={poetSlug} poetId={poetId} />;
}
