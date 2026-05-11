"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useSearchParams } from "next/navigation";
import PoemFeedPager from "@/components/PoemFeedPager";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorScreen from "@/components/ErrorScreen";
import AppNotFound from "@/app/not-found";
import PoetInfoDialog from "@/components/PoetInfoDialog";
import ganjoorApi from "@/api/GanjoorApi";
import customApi from "@/api/CustomApi";
import echolaliaApi, { type EcholaliaPoemSummary } from "@/api/EcholaliaApi";
import type { Poem } from "@/types/poem";
import type { Poet } from "@/types/poet";
import type { GanjoorCategory, GanjoorPoetCatalog } from "@/types/ganjoor";
import { PoetSlug, isValidPoetSlug } from "@/types/poet";
import PoetImage from "@/components/PoetImage";
import { useSettings } from "@/context/SettingsContext";
import { logger } from "@/utils/logger";
import poetSourceIndex from "@/data/poet-source-index.json";
import { FaSpinner } from "react-icons/fa";

type RemotePoetSource = "ganjoor" | "echolalia";

interface PoetSourceIndexEntry {
  source: RemotePoetSource;
  id?: number | null;
  name?: string;
  sourceGroupName?: string | null;
}

const indexedPoetSources = poetSourceIndex.sourcesBySlug as Record<
  string,
  PoetSourceIndexEntry | undefined
>;
const isValidPoetRouteSlug = (slug: string) =>
  slug.length >= 2 && !/[/?#\\\u0000-\u001F\u007F]/.test(slug);

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
  loadingCategoryId?: number | null;
  level?: number;
}

function CategoryList({
  categories,
  selectedId,
  onSelectCategory,
  categoryCache,
  loadingCategoryId = null,
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
        const isLoading = loadingCategoryId === category.id;

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
                {isLoading ? (
                  <FaSpinner
                    className="h-3.5 w-3.5 shrink-0 animate-spin text-neutral-400"
                    aria-label="در حال بارگذاری"
                  />
                ) : poemCount > 0 ? (
                  <span className="text-xs text-neutral-400">
                    {formatPersianNumber(poemCount)}
                  </span>
                ) : null}
              </div>
            </button>
            {childNodes && childNodes.length > 0 && (
              <div className="mt-2">
                <CategoryList
                  categories={childNodes}
                  selectedId={selectedId}
                  onSelectCategory={onSelectCategory}
                  categoryCache={categoryCache}
                  loadingCategoryId={loadingCategoryId}
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

function RandomizePoemsPrompt({
  poetName,
  onChoose,
}: {
  poetName: string;
  onChoose: (randomize: boolean, rememberChoice: boolean) => void;
}) {
  const [rememberChoice, setRememberChoice] = useState(false);

  return (
    <AnimatePresence>
      <motion.div
        className="settings-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="settings-dialog"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="settings-panel max-w-md text-right"
          role="dialog"
          aria-modal="true"
          aria-labelledby="randomize-poems-title"
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.25 }}
        >
          <div className="settings-form">
            <h2 id="randomize-poems-title" className="settings-title">
              شعرهای {poetName} چطور نمایش داده شوند؟
            </h2>
            <p className="mt-3 text-sm leading-7 text-neutral-400">
              می‌توانید شعرها را به صورت تصادفی بخوانید یا از ابتدای مجموعه
              پیاپی جلو بروید.
            </p>
            <label className="mt-5 flex cursor-pointer items-center justify-start gap-3 rounded-xl bg-neutral-800/60 px-4 py-3 text-sm text-neutral-200">
              <input
                type="checkbox"
                checked={rememberChoice}
                onChange={(event) => setRememberChoice(event.target.checked)}
                className="h-4 w-4 accent-neutral-100"
              />
              <span>برای همهٔ شاعران همین را استفاده کن و دوباره نپرس</span>
            </label>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="settings-action-button primary justify-center"
                onClick={() => onChoose(true, rememberChoice)}
              >
                تصادفی
              </button>
              <button
                type="button"
                className="settings-action-button secondary justify-center"
                onClick={() => onChoose(false, rememberChoice)}
              >
                پیاپی
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function GanjoorPoetPage({ slug, poetId }: { slug: string; poetId?: number }) {
  const { settings, setRandomizePoems, setAskRandomizePoemsOnPoetPages } =
    useSettings();
  const [randomizeChoice, setRandomizeChoice] = useState<boolean | null>(null);
  const shouldAskRandomizeChoice = settings.askRandomizePoemsOnPoetPages;
  const randomizePoems = randomizeChoice ?? settings.randomizePoems;

  const [catalog, setCatalog] = useState<GanjoorPoetCatalog | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(true);
  const [categoryCache, setCategoryCache] = useState<
    Record<number, GanjoorCategory>
  >({});
  const [loadedCategoryIds, setLoadedCategoryIds] = useState<Set<number>>(
    () => new Set(),
  );
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
  const shouldAutoCloseInfoRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      setRandomizeChoice(null);
      setLoadingCatalog(true);
      setCatalogError(null);
      setNotFound(false);
      setCatalog(null);
      setIsInfoOpen(true);
      setCategoryCache({});
      setLoadedCategoryIds(new Set());
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
  const selectedCategoryIsLoaded = selectedCategoryId
    ? loadedCategoryIds.has(selectedCategoryId)
    : false;

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
    if (!currentPoem) return;
    const order = poemOrderRef.current;
    if (!order.length) return;

    [currentPoemIndex + 1, currentPoemIndex - 1].forEach((index) => {
      const poemId = order[index];
      if (!poemId || poemCacheRef.current[poemId]) return;
      fetchPoemById(poemId).catch((error) => {
        logger.error("Error preloading Ganjoor poem:", error);
      });
    });
  }, [currentPoem, currentPoemIndex, fetchPoemById, poemOrder]);

  useEffect(() => {
    if (!selectedCategoryId) return;
    let cancelled = false;

    const clearPoems = () => {
      poemOrderRef.current = [];
      setPoemOrder([]);
      setCurrentPoem(null);
      setCurrentPoemIndex(0);
      setPoemError(null);
    };

    const applyCategory = async (categoryData: GanjoorCategory) => {
      if ((categoryData.children?.length ?? 0) > 0) {
        clearPoems();
        return;
      }

      const poemIds = (categoryData.poems ?? []).map((poem) => poem.id);

      if (poemIds.length === 0) {
        poemOrderRef.current = [];
        setPoemOrder([]);
        setCurrentPoem(null);
        setCurrentPoemIndex(0);
        setPoemError("در این مجموعه شعری ثبت نشده است.");
        return;
      }

      if (shouldAskRandomizeChoice && randomizeChoice === null) {
        clearPoems();
        return;
      }

      const order = createPoemOrder(poemIds, randomizePoems);
      if (cancelled) return;

      poemOrderRef.current = order;
      setPoemOrder(order);

      await loadPoemAtIndex(0, order);
    };

    const hasCachedChildren = (cachedCategory?.children?.length ?? 0) > 0;
    const hasCachedPoems = (cachedCategory?.poems?.length ?? 0) > 0;
    const canUseCachedCategory =
      cachedCategory &&
      (hasCachedChildren || hasCachedPoems || selectedCategoryIsLoaded);

    if (canUseCachedCategory) {
      setCategoryLoading(false);
      setCategoryError(null);
      applyCategory(cachedCategory);
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
        const fetchedCategories = indexCategories(fetched);
        setCategoryCache((prev) => ({
          ...fetchedCategories,
          ...prev,
          [selectedCategoryId]: fetched,
        }));
        setLoadedCategoryIds((prev) => {
          const next = new Set(prev);
          next.add(selectedCategoryId);
          return next;
        });
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
  }, [
    selectedCategoryId,
    cachedCategory,
    selectedCategoryIsLoaded,
    randomizeChoice,
    randomizePoems,
    shouldAskRandomizeChoice,
    loadPoemAtIndex,
  ]);

  const handleSelectCategory = useCallback(
    (categoryId: number) => {
      if (categoryId === selectedCategoryId) {
        return;
      }

      const nextCategory = categoryCache[categoryId];
      const needsCategoryLoad =
        !nextCategory ||
        (((nextCategory.children?.length ?? 0) === 0 ||
          !nextCategory.children) &&
          ((nextCategory.poems?.length ?? 0) === 0 || !nextCategory.poems) &&
          !loadedCategoryIds.has(categoryId));

      setRandomizeChoice(null);
      setCategoryLoading(needsCategoryLoad);
      setCategoryError(null);
      setPoemError(null);
      setPoemOrder([]);
      poemOrderRef.current = [];
      setCurrentPoem(null);
      setCurrentPoemIndex(0);
      shouldAutoCloseInfoRef.current = true;
      setSelectedCategoryId(categoryId);
    },
    [categoryCache, loadedCategoryIds, selectedCategoryId],
  );

  const handleRetryCatalog = () => setReloadKey((prev) => prev + 1);

  const handleRetryCategory = useCallback(() => {
    if (!selectedCategoryId) return;
    setCategoryCache((prev) => {
      const next = { ...prev };
      delete next[selectedCategoryId];
      return next;
    });
    setLoadedCategoryIds((prev) => {
      const next = new Set(prev);
      next.delete(selectedCategoryId);
      return next;
    });
    setCategoryError(null);
  }, [selectedCategoryId]);

  const handleRetryPoem = useCallback(() => {
    loadPoemAtIndex(currentPoemIndex);
  }, [currentPoemIndex, loadPoemAtIndex]);

  const handleRandomizeChoice = useCallback(
    (shouldRandomize: boolean, rememberChoice: boolean) => {
      setRandomizePoems(shouldRandomize);
      if (rememberChoice) {
        setAskRandomizePoemsOnPoetPages(false);
      }
      setRandomizeChoice(shouldRandomize);
      setPoemError(null);
    },
    [setAskRandomizePoemsOnPoetPages, setRandomizePoems],
  );

  const selectedCategory = cachedCategory ?? null;
  const selectedCategoryHasChildren =
    (selectedCategory?.children?.length ?? 0) > 0;

  useEffect(() => {
    if (!isInfoOpen) return;
    if (selectedCategoryId === null) return;
    if (categoryLoading) return;
    if (poemLoading) return;
    if (selectedCategoryHasChildren) return;
    if (!shouldAutoCloseInfoRef.current) return;
    shouldAutoCloseInfoRef.current = false;
    setIsInfoOpen(false);
  }, [
    isInfoOpen,
    selectedCategoryId,
    categoryLoading,
    poemLoading,
    selectedCategoryHasChildren,
  ]);

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

  const isFirstPoem = currentPoemIndex <= 0;
  const isLastPoem =
    !randomizePoems &&
    (poemOrder.length === 0 || currentPoemIndex >= poemOrder.length - 1);
  const nextPoemId = poemOrder[currentPoemIndex + 1];
  const nextPoem = nextPoemId ? poemCacheRef.current[nextPoemId] : undefined;
  const showPoemLoadingOverlay = poemLoading && !currentPoem;
  const loadingCategoryId =
    selectedCategoryId !== null && (categoryLoading || poemLoading)
      ? selectedCategoryId
      : null;
  const containerClassName = [
    "poet-page",
    "relative flex h-screen flex-col bg-neutral-950 text-neutral-100",
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

  const showRandomizePrompt =
    !!selectedCategoryId &&
    !isInfoOpen &&
    shouldAskRandomizeChoice &&
    randomizeChoice === null;

  return (
    <div className={containerClassName}>
      {showRandomizePrompt && (
        <RandomizePoemsPrompt
          poetName={catalog.poet.nickname || catalog.poet.name}
          onChoose={handleRandomizeChoice}
        />
      )}
      <PoetInfoDialog
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title="اطلاعات شاعر"
      >
        <section className="poet-info-section">
          <PoetDetails poet={catalog.poet} />
        </section>
        <section className="poet-info-section">
          <h3 className="poet-info-section-title">مجموعه‌ها</h3>
          {topLevelCategories.length > 0 && selectedCategoryId === null && (
            <p className="mb-3 text-xs leading-6 text-neutral-500">
              برای شروع خواندن، یک مجموعه را انتخاب کنید.
            </p>
          )}
          {topLevelCategories.length > 0 ? (
            <CategoryList
              categories={topLevelCategories}
              selectedId={selectedCategoryId}
              onSelectCategory={handleSelectCategory}
              categoryCache={categoryCache}
              loadingCategoryId={loadingCategoryId}
            />
          ) : (
            <p className="text-sm text-neutral-400">
              مجموعه‌ای برای این شاعر ثبت نشده است.
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
        </section>
      </PoetInfoDialog>
      <main
        className="relative flex flex-1 flex-col overflow-hidden"
      >
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
            <PoemFeedPager
              poem={currentPoem}
              nextPoem={nextPoem}
              currentIndex={currentPoemIndex}
              onNext={handleNext}
              onPrevious={handlePrevious}
              isFirst={isFirstPoem}
              isLast={isLastPoem}
              isPreparingNextPoem={poemLoading && !nextPoem && !isLastPoem}
              poetSlug={catalog.poet.urlSlug}
              isPoetPage={true}
              onTogglePoetInfo={() => {
                shouldAutoCloseInfoRef.current = false;
                setIsInfoOpen(true);
              }}
              onOpenFeed={() => {
                shouldAutoCloseInfoRef.current = false;
                setIsInfoOpen(true);
              }}
              onOpenFeedLabel="مجموعه‌های شاعر"
            />
          )}

          {!showPoemLoadingOverlay && !poemError && !currentPoem && (
            categoryLoading ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 bg-black px-6 text-center text-neutral-400">
                <p className="text-sm text-neutral-300">در حال بارگذاری مجموعه...</p>
                <p className="text-xs text-neutral-500">
                  شعرهای این بخش تا چند لحظه دیگر نمایش داده می‌شوند.
                </p>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center bg-black px-6 text-center text-neutral-400">
                <button
                  type="button"
                  onClick={() => {
                    shouldAutoCloseInfoRef.current = false;
                    setIsInfoOpen(true);
                  }}
                  className="rounded-lg px-4 py-3 text-sm leading-7 text-neutral-300 transition hover:bg-neutral-900 hover:text-neutral-100"
                >
                  برای شروع، یک مجموعه از اطلاعات شاعر انتخاب کنید.
                </button>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}

function EcholaliaPoetPage({ poetSlug }: { poetSlug: string }) {
  const { settings, setRandomizePoems, setAskRandomizePoemsOnPoetPages } =
    useSettings();
  const [randomizeChoice, setRandomizeChoice] = useState<boolean | null>(null);
  const shouldAskRandomizeChoice = settings.askRandomizePoemsOnPoetPages;
  const randomizePoems = randomizeChoice ?? settings.randomizePoems;

  const [poet, setPoet] = useState<Poet | null>(null);
  const [summaries, setSummaries] = useState<EcholaliaPoemSummary[]>([]);
  const [poemOrder, setPoemOrder] = useState<number[]>([]);
  const [currentPoemIndex, setCurrentPoemIndex] = useState(0);
  const [currentPoem, setCurrentPoem] = useState<Poem | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [poemError, setPoemError] = useState<string | null>(null);
  const [poemLoading, setPoemLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const poemCacheRef = useRef<Record<number, Poem>>({});
  const poemOrderRef = useRef<number[]>([]);
  const skipNextPoemOrderEffectRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadPoet = async () => {
      setRandomizeChoice(null);
      setLoading(true);
      setError(null);
      setPoemError(null);
      setIsInfoOpen(true);
      setPoet(null);
      setSummaries([]);
      setPoemOrder([]);
      setCurrentPoem(null);
      setCurrentPoemIndex(0);
      poemCacheRef.current = {};
      poemOrderRef.current = [];

      try {
        const [poetInfo, poemSummaries] = await Promise.all([
          echolaliaApi.getPoetBySlug(poetSlug),
          echolaliaApi.getPoemsByPoetSlug(poetSlug),
        ]);
        if (cancelled) return;
        setPoet(poetInfo);
        setSummaries(poemSummaries);
      } catch (err) {
        if (cancelled) return;
        logger.error("Error loading Echolalia poet:", err);
        setError("متأسفانه در دریافت اطلاعات شاعر از اکولالیا مشکلی پیش آمد.");
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

  const loadPoemById = useCallback(async (poemId: number) => {
    if (poemCacheRef.current[poemId]) {
      return poemCacheRef.current[poemId];
    }
    const poem = await echolaliaApi.getPoemById(poemId);
    poemCacheRef.current[poemId] = poem;
    return poem;
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
        const poem = await loadPoemById(order[index]);
        setCurrentPoem(poem);
        setCurrentPoemIndex(index);
      } catch (err) {
        logger.error("Error loading Echolalia poem:", err);
        setPoemError("متأسفانه در دریافت شعر از اکولالیا مشکلی پیش آمد.");
      } finally {
        setPoemLoading(false);
      }
    },
    [loadPoemById],
  );

  useEffect(() => {
    if (!currentPoem) return;
    const order = poemOrderRef.current;
    if (!order.length) return;

    [currentPoemIndex + 1, currentPoemIndex - 1].forEach((index) => {
      const poemId = order[index];
      if (!poemId || poemCacheRef.current[poemId]) return;
      loadPoemById(poemId).catch((error) => {
        logger.error("Error preloading Echolalia poem:", error);
      });
    });
  }, [currentPoem, currentPoemIndex, loadPoemById, poemOrder]);

  useEffect(() => {
    if (shouldAskRandomizeChoice && randomizeChoice === null) {
      return;
    }
    if (skipNextPoemOrderEffectRef.current) {
      skipNextPoemOrderEffectRef.current = false;
      return;
    }
    const order = createPoemOrder(
      summaries.map((poem) => poem.id),
      randomizePoems,
    );
    poemOrderRef.current = order;
    setPoemOrder(order);

    if (order.length === 0) {
      setCurrentPoem(null);
      setPoemError("شعری برای این شاعر ثبت نشده است.");
      return;
    }

    loadPoemAtIndex(0, order);
  }, [
    loadPoemAtIndex,
    randomizeChoice,
    randomizePoems,
    shouldAskRandomizeChoice,
    summaries,
  ]);

  const handleNext = useCallback(() => {
    const order = poemOrderRef.current;
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
  }, [currentPoemIndex, loadPoemAtIndex, randomizePoems]);

  const handlePrevious = useCallback(() => {
    const previousIndex = currentPoemIndex - 1;
    if (previousIndex >= 0) {
      loadPoemAtIndex(previousIndex);
    }
  }, [currentPoemIndex, loadPoemAtIndex]);

  const handleRandomizeChoice = useCallback(
    (shouldRandomize: boolean, rememberChoice: boolean) => {
      setRandomizePoems(shouldRandomize);
      if (rememberChoice) {
        setAskRandomizePoemsOnPoetPages(false);
      }
      setRandomizeChoice(shouldRandomize);
      setPoemError(null);
    },
    [setAskRandomizePoemsOnPoetPages, setRandomizePoems],
  );

  const handleSelectSummary = useCallback(
    (poemId: number) => {
      const order = summaries.map((summary) => summary.id);
      const index = order.indexOf(poemId);
      if (index < 0) return;

      skipNextPoemOrderEffectRef.current = true;
      setRandomizeChoice(false);
      poemOrderRef.current = order;
      setPoemOrder(order);
      setPoemError(null);
      setIsInfoOpen(false);
      loadPoemAtIndex(index, order);
    },
    [loadPoemAtIndex, summaries],
  );

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <ErrorScreen message={error} onRetry={() => setReloadKey((v) => v + 1)} />
    );
  }

  if (!poet) {
    return <AppNotFound />;
  }

  const isFirstPoem = currentPoemIndex <= 0;
  const isLastPoem =
    !randomizePoems &&
    (poemOrder.length === 0 || currentPoemIndex >= poemOrder.length - 1);
  const nextPoemId = poemOrder[currentPoemIndex + 1];
  const nextPoem = nextPoemId ? poemCacheRef.current[nextPoemId] : undefined;
  const showRandomizePrompt =
    !isInfoOpen && shouldAskRandomizeChoice && randomizeChoice === null;

  return (
    <div className="poet-page relative flex h-screen flex-col bg-neutral-950 text-neutral-100">
      {showRandomizePrompt && (
        <RandomizePoemsPrompt
          poetName={poet.nickname || poet.name}
          onChoose={handleRandomizeChoice}
        />
      )}
      <PoetInfoDialog
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title="اطلاعات شاعر"
        showBackdrop={false}
      >
        <section className="poet-info-section">
          <PoetDetails poet={poet} />
        </section>
        <section className="poet-info-section">
          <h3 className="poet-info-section-title">شعرها</h3>
          {summaries.length > 0 ? (
            <div className="space-y-2">
              <div className="rounded-lg border border-neutral-800/60 bg-neutral-900/50 px-4 py-3 text-sm text-neutral-300">
                <div className="flex items-center justify-between">
                  <span>تعداد شعرها</span>
                  <span>{formatPersianNumber(summaries.length)}</span>
                </div>
              </div>
              <ul className="space-y-2">
                {summaries.map((summary) => (
                  <li key={summary.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectSummary(summary.id)}
                      className="w-full rounded-lg border border-transparent px-3 py-2 text-right text-sm text-neutral-200 transition hover:bg-neutral-800/40"
                    >
                      {summary.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-neutral-400">
              شعری برای این شاعر ثبت نشده است.
            </p>
          )}
        </section>
      </PoetInfoDialog>
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {poemLoading && !currentPoem && <LoadingScreen />}
          {poemError && (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="text-sm text-neutral-300">{poemError}</p>
              {poemOrder.length > 0 && (
                <button
                  type="button"
                  onClick={() => loadPoemAtIndex(currentPoemIndex)}
                  className="rounded bg-neutral-700 px-4 py-2 text-sm text-neutral-50 hover:bg-neutral-600"
                >
                  تلاش مجدد
                </button>
              )}
            </div>
          )}
          {!poemError && currentPoem && (
            <PoemFeedPager
              poem={currentPoem}
              nextPoem={nextPoem}
              currentIndex={currentPoemIndex}
              onNext={handleNext}
              onPrevious={handlePrevious}
              isFirst={isFirstPoem}
              isLast={isLastPoem}
              isPreparingNextPoem={poemLoading && !nextPoem && !isLastPoem}
              poetSlug={currentPoem.poetSlug}
              isPoetPage={true}
              onTogglePoetInfo={() => setIsInfoOpen(true)}
              onOpenFeed={() => setIsInfoOpen(true)}
              onOpenFeedLabel="شعرهای شاعر"
            />
          )}
        </div>
      </main>
    </div>
  );
}

function ResolvedRemotePoetPage({
  slug,
  poetId,
}: {
  slug: string;
  poetId?: number;
}) {
  const [source, setSource] = useState<"ganjoor" | "echolalia" | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const resolvePoet = async () => {
      setLoading(true);
      setNotFound(false);
      setError(null);
      setSource(null);

      const [ganjoorResult, echolaliaResult] = await Promise.allSettled([
        ganjoorApi.getPoetCatalog(slug, poetId),
        echolaliaApi.getPoetBySlug(slug),
      ]);

      if (ganjoorResult.status === "fulfilled") {
        if (!cancelled) {
          setSource("ganjoor");
          setLoading(false);
        }
        return;
      }

      if (echolaliaResult.status === "fulfilled") {
        if (!cancelled) {
          setSource("echolalia");
          setLoading(false);
        }
        return;
      }

      if (cancelled) return;
      const ganjoorError = ganjoorResult.reason;
      const ganjoorWasNotFound =
        ganjoorError instanceof Error &&
        ganjoorError.message &&
        /یافت نشد/.test(ganjoorError.message);

      if (ganjoorError && !ganjoorWasNotFound) {
        logger.error("Error resolving poet source:", ganjoorError);
        setError(
          "متأسفانه در دریافت اطلاعات شاعر مشکلی پیش آمد. لطفاً دوباره تلاش کنید.",
        );
      } else {
        setNotFound(true);
      }

      if (!cancelled) {
        setLoading(false);
      }
    };

    resolvePoet();

    return () => {
      cancelled = true;
    };
  }, [slug, poetId, reloadKey]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <ErrorScreen message={error} onRetry={() => setReloadKey((v) => v + 1)} />
    );
  }

  if (notFound || !source) {
    return <AppNotFound />;
  }

  if (source === "echolalia") {
    return <EcholaliaPoetPage poetSlug={slug} />;
  }

  return <GanjoorPoetPage slug={slug} poetId={poetId} />;
}

function CustomPoetPage({ poetSlug }: { poetSlug: PoetSlug }) {
  const { settings, setRandomizePoems, setAskRandomizePoemsOnPoetPages } =
    useSettings();
  const [randomizeChoice, setRandomizeChoice] = useState<boolean | null>(null);
  const shouldAskRandomizeChoice = settings.askRandomizePoemsOnPoetPages;
  const randomizePoems = randomizeChoice ?? settings.randomizePoems;

  const [poetInfo, setPoetInfo] = useState<Poet | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(true);
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
      setRandomizeChoice(null);
      setLoading(true);
      setError(null);
      setPoemError(null);
      setIsInfoOpen(true);
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
    if (!currentPoem) return;
    const order = poemOrderRef.current;
    if (!order.length) return;

    [currentPoemIndex + 1, currentPoemIndex - 1].forEach((index) => {
      const poemId = order[index];
      if (!poemId || poemCacheRef.current[poemId]) return;
      loadCustomPoem(poemId).catch((error) => {
        logger.error("Error preloading custom poem:", error);
      });
    });
  }, [currentPoem, currentPoemIndex, loadCustomPoem, poemOrder]);

  useEffect(() => {
    if (shouldAskRandomizeChoice && randomizeChoice === null) {
      return;
    }
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
  }, [
    poemIds,
    randomizeChoice,
    randomizePoems,
    shouldAskRandomizeChoice,
    loadPoemAtIndex,
  ]);

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

  const handleRandomizeChoice = useCallback(
    (shouldRandomize: boolean, rememberChoice: boolean) => {
      setRandomizePoems(shouldRandomize);
      if (rememberChoice) {
        setAskRandomizePoemsOnPoetPages(false);
      }
      setRandomizeChoice(shouldRandomize);
      setPoemError(null);
    },
    [setAskRandomizePoemsOnPoetPages, setRandomizePoems],
  );

  const isFirstPoem = currentPoemIndex <= 0;
  const isLastPoem =
    !randomizePoems &&
    (poemOrder.length === 0 || currentPoemIndex >= poemOrder.length - 1);
  const nextPoemId = poemOrder[currentPoemIndex + 1];
  const nextPoem = nextPoemId ? poemCacheRef.current[nextPoemId] : undefined;
  const showPoemLoadingOverlay = poemLoading && !currentPoem;
  const containerClassName = [
    "poet-page",
    "relative flex h-screen flex-col bg-neutral-950 text-neutral-100",
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

  const showRandomizePrompt =
    !isInfoOpen && shouldAskRandomizeChoice && randomizeChoice === null;

  return (
    <div className={containerClassName}>
      {showRandomizePrompt && (
        <RandomizePoemsPrompt
          poetName={poetInfo.nickname || poetInfo.name}
          onChoose={handleRandomizeChoice}
        />
      )}
      <PoetInfoDialog
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title="اطلاعات شاعر"
        showBackdrop={false}
      >
        <section className="poet-info-section">
          <PoetDetails poet={poetInfo} />
        </section>
        <section className="poet-info-section">
          <div className="rounded-lg border border-neutral-800/60 bg-neutral-900/50 px-4 py-3 text-sm text-neutral-300">
            <div className="flex items-center justify-between">
              <span>تعداد شعرها</span>
              <span>{formatPersianNumber(poemIds.length)}</span>
            </div>
          </div>
        </section>
      </PoetInfoDialog>
      <main className="relative flex flex-1 flex-col overflow-hidden">
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
            <PoemFeedPager
              poem={currentPoem}
              nextPoem={nextPoem}
              currentIndex={currentPoemIndex}
              onNext={handleNext}
              onPrevious={handlePrevious}
              isFirst={isFirstPoem}
              isLast={isLastPoem}
              isPreparingNextPoem={poemLoading && !nextPoem && !isLastPoem}
              poetSlug={poetSlug}
              isPoetPage={true}
              onTogglePoetInfo={() => setIsInfoOpen(true)}
              onOpenFeed={() => setIsInfoOpen(true)}
              onOpenFeedLabel="اطلاعات شاعر"
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
  const forcedSource = searchParams.get("source");
  const parsedPoetId = poetIdParam ? Number(poetIdParam) : NaN;
  const poetId =
    Number.isInteger(parsedPoetId) && parsedPoetId > 0
      ? parsedPoetId
      : undefined;

  if (!isValidPoetRouteSlug(poetSlug)) {
    return <AppNotFound />;
  }

  if (isValidPoetSlug(poetSlug)) {
    return <CustomPoetPage poetSlug={poetSlug as PoetSlug} />;
  }

  if (forcedSource === "echolalia") {
    return <EcholaliaPoetPage poetSlug={poetSlug} />;
  }

  const indexedSource = indexedPoetSources[poetSlug];

  if (indexedSource?.source === "echolalia") {
    return <EcholaliaPoetPage poetSlug={poetSlug} />;
  }

  if (indexedSource?.source === "ganjoor") {
    const indexedPoetId =
      typeof indexedSource.id === "number" && indexedSource.id > 0
        ? indexedSource.id
        : poetId;

    return <GanjoorPoetPage slug={poetSlug} poetId={indexedPoetId} />;
  }

  return <ResolvedRemotePoetPage slug={poetSlug} poetId={poetId} />;
}
