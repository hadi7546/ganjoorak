import { NextRequest, NextResponse } from "next/server";
import axios, { AxiosError } from "axios";
import { logger } from "@/utils/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const API_BASE_URL = "https://api.ganjoor.net/api/ganjoor";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

type PoetRecord = {
  id: number;
  name: string;
  rootCatId: number;
  fullUrl: string;
  published: boolean;
};

const poetCache: { value: PoetRecord[] | null; fetchedAt: number | null } = {
  value: null,
  fetchedAt: null,
};

const poemIdCache = new Map<number, number[]>();
const pendingPoemIdRequests = new Map<number, Promise<number[]>>();

const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

const isAxiosError = axios.isAxiosError;

const ensureArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const addPoemIds = (collection: Set<number>, poems: unknown) => {
  for (const poem of ensureArray(poems)) {
    const poemId = typeof poem === "object" && poem !== null ? (poem as any).id : undefined;
    if (typeof poemId === "number" && Number.isFinite(poemId)) {
      collection.add(poemId);
    }
  }
};

const childCategoryKeys = [
  "subCats",
  "subcats",
  "children",
  "categories",
  "catChildren",
  "subcategories",
];

const sectionKeys = [
  "sections",
  "mainSections",
  "categorySections",
  "subSections",
];

const nestedSectionCategoryKeys = ["categories", "subCats", "children", "subcategories"];

const extractChildCategoryIds = (category: any, queue: number[], collectedPoems: Set<number>) => {
  for (const key of childCategoryKeys) {
    const children = ensureArray(category?.[key]);
    for (const child of children) {
      if (child && typeof child === "object") {
        if (Array.isArray((child as any).poems)) {
          addPoemIds(collectedPoems, (child as any).poems);
        }
        const childId = (child as any).id;
        if (typeof childId === "number" && Number.isFinite(childId)) {
          queue.push(childId);
        }
      }
    }
  }
};

const extractSectionData = (category: any, queue: number[], collectedPoems: Set<number>) => {
  for (const key of sectionKeys) {
    const sections = ensureArray(category?.[key]);
    for (const section of sections) {
      if (section && typeof section === "object") {
        if (Array.isArray((section as any).poems)) {
          addPoemIds(collectedPoems, (section as any).poems);
        }
        for (const nestedKey of nestedSectionCategoryKeys) {
          const nestedCategories = ensureArray((section as any)[nestedKey]);
          for (const nestedCategory of nestedCategories) {
            if (nestedCategory && typeof nestedCategory === "object") {
              if (Array.isArray((nestedCategory as any).poems)) {
                addPoemIds(collectedPoems, (nestedCategory as any).poems);
              }
              const nestedId = (nestedCategory as any).id;
              if (typeof nestedId === "number" && Number.isFinite(nestedId)) {
                queue.push(nestedId);
              }
            }
          }
        }
      }
    }
  }
};

async function fetchPoets(): Promise<PoetRecord[]> {
  const now = Date.now();
  if (poetCache.value && poetCache.fetchedAt && now - poetCache.fetchedAt < CACHE_TTL_MS) {
    return poetCache.value;
  }

  const response = await axios.get(`${API_BASE_URL}/poets`, {
    timeout: 10000,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  const poets: PoetRecord[] = ensureArray(response.data).map((poet: any) => ({
    id: Number(poet.id),
    name: String(poet.name || ""),
    rootCatId: Number(poet.rootCatId),
    fullUrl: typeof poet.fullUrl === "string" ? poet.fullUrl : "",
    published: Boolean(poet.published ?? true),
  }));

  poetCache.value = poets;
  poetCache.fetchedAt = now;
  return poets;
}

async function collectPoemIdsForPoet(poet: PoetRecord): Promise<number[]> {
  const cached = poemIdCache.get(poet.id);
  if (cached) {
    return cached;
  }

  const pending = pendingPoemIdRequests.get(poet.id);
  if (pending) {
    return pending;
  }

  const request = (async () => {
    if (!poet.rootCatId || !Number.isFinite(poet.rootCatId)) {
      logger.warn(`Poet ${poet.name} (${poet.id}) is missing a valid root category.`);
      return [];
    }

    const collectedPoems = new Set<number>();
    const visitedCategories = new Set<number>();
    const queue: number[] = [poet.rootCatId];

    while (queue.length > 0) {
      const categoryId = queue.shift();
      if (typeof categoryId !== "number" || visitedCategories.has(categoryId)) {
        continue;
      }
      visitedCategories.add(categoryId);

      try {
        const response = await axios.get(`${API_BASE_URL}/cat/${categoryId}`, {
          params: {
            poems: true,
            mainSections: true,
            sections: true,
            subCats: true,
            subcats: true,
            catInfo: true,
            navigation: false,
          },
          timeout: 15000,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        const category = response.data?.cat ?? response.data;
        if (!category) {
          continue;
        }

        if (Array.isArray(category.poems)) {
          addPoemIds(collectedPoems, category.poems);
        }

        extractSectionData(category, queue, collectedPoems);
        extractChildCategoryIds(category, queue, collectedPoems);
      } catch (error) {
        logger.error(`Failed to collect poems for category ${categoryId}:`, error);
      }
    }

    const poemIds = Array.from(collectedPoems);
    poemIdCache.set(poet.id, poemIds);
    return poemIds;
  })();

  pendingPoemIdRequests.set(poet.id, request);
  try {
    const ids = await request;
    return ids;
  } finally {
    pendingPoemIdRequests.delete(poet.id);
  }
}

const chooseRandomPoet = (poets: PoetRecord[]): PoetRecord | null => {
  const available = poets.filter((poet) => poet.published !== false && Number.isFinite(poet.rootCatId));
  if (available.length === 0) {
    return null;
  }
  const index = Math.floor(Math.random() * available.length);
  return available[index] ?? null;
};

const chooseRandomPoemId = (poemIds: number[]): number | null => {
  if (!poemIds.length) {
    return null;
  }
  const index = Math.floor(Math.random() * poemIds.length);
  return poemIds[index] ?? null;
};

async function fetchPoemDetails(poemId: number) {
  const response = await axios.get(`${API_BASE_URL}/poem/${poemId}`, {
    params: {
      catInfo: true,
      catPoems: false,
      rhymes: false,
      recitations: true,
      images: false,
      songs: false,
      comments: false,
      verseDetails: false,
      navigation: false,
      relatedPoems: false,
    },
    timeout: 15000,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  return response.data;
}

function parsePoetId(param: string | null): number | null {
  if (!param) {
    return null;
  }
  const trimmed = param.trim();
  if (!trimmed || trimmed === "0") {
    return null;
  }
  const poetId = Number(trimmed);
  if (!Number.isFinite(poetId) || poetId <= 0) {
    return NaN;
  }
  return poetId;
}

function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const poetParam = url.searchParams.get("poet") ?? url.searchParams.get("poetId");

    const parsedPoetId = parsePoetId(poetParam);
    if (Number.isNaN(parsedPoetId)) {
      return errorResponse("شناسه شاعر معتبر نیست", 400);
    }

    const poets = await fetchPoets();

    let poet: PoetRecord | null = null;
    if (parsedPoetId && Number.isFinite(parsedPoetId)) {
      poet = poets.find((item) => item.id === parsedPoetId) ?? null;
      if (!poet) {
        return errorResponse("شاعر مورد نظر یافت نشد", 404);
      }
    } else {
      poet = chooseRandomPoet(poets);
      if (!poet) {
        return errorResponse("هیچ شاعری برای انتخاب یافت نشد", 500);
      }
    }

    const poemIds = await collectPoemIdsForPoet(poet);
    if (!poemIds.length) {
      logger.warn(`No poems found for poet ${poet.name} (${poet.id})`);
      return errorResponse("هیچ شعری برای این شاعر یافت نشد", 404);
    }

    const poemId = chooseRandomPoemId(poemIds);
    if (!poemId) {
      return errorResponse("امکان انتخاب شعر تصادفی وجود ندارد", 500);
    }

    const poem = await fetchPoemDetails(poemId);
    return NextResponse.json(poem, { headers: corsHeaders });
  } catch (error) {
    logger.error("Error generating random poem:", error);

    if (isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status ?? 500;
      const message =
        typeof axiosError.response?.data === "object" && axiosError.response?.data
          ? (axiosError.response?.data as any).message || axiosError.message
          : axiosError.message;
      return errorResponse(message || "خطای ناشناخته در دریافت شعر تصادفی", status);
    }

    const message = error instanceof Error ? error.message : "خطای ناشناخته در دریافت شعر تصادفی";
    return errorResponse(message, 500);
  }
}

