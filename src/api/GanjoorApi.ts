import axios from "axios";
import type { Poem, PoemRecitation, VerseSync } from "@/types/poem";
import type { Poet, Century } from "@/types/poet";
import { logger } from "@/utils/logger";

const API_BASE_URL = "https://api.ganjoor.net";

// Cache for poet data
const poetCache: Record<string, Poet> = {};
const poetPoemIdsCache: Record<number, number[]> = {};
const poetPoemIdsPromiseCache: Record<number, Promise<number[]>> = {};

const CATEGORY_CHILD_KEYS = [
  "subCats",
  "children",
  "childCats",
  "sections",
  "mainSections",
  "subSections",
  "parts",
  "chapters",
];

const parseNumericId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
};

const collectPoemIdsFromCategory = (
  categoryData: any,
  poemIds: Set<number>,
  pendingCategoryIds: Set<number>,
) => {
  if (!categoryData || typeof categoryData !== "object") {
    return;
  }

  if (Array.isArray(categoryData.poems)) {
    for (const poem of categoryData.poems) {
      const poemId = parseNumericId(poem?.id);
      if (poemId !== null) {
        poemIds.add(poemId);
      }
    }
  }

  for (const key of CATEGORY_CHILD_KEYS) {
    const value = categoryData[key];

    if (Array.isArray(value)) {
      for (const child of value) {
        if (!child || typeof child !== "object") {
          continue;
        }

        collectPoemIdsFromCategory(child, poemIds, pendingCategoryIds);

        const childId = parseNumericId(child.id);
        if (childId !== null) {
          pendingCategoryIds.add(childId);
        }
      }
    } else if (value && typeof value === "object") {
      collectPoemIdsFromCategory(value, poemIds, pendingCategoryIds);
    }
  }
};

const fetchPoemIdsForCategory = async (
  categoryId: number,
  visitedCategories: Set<number>,
): Promise<Set<number>> => {
  if (visitedCategories.has(categoryId)) {
    return new Set<number>();
  }

  visitedCategories.add(categoryId);

  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/ganjoor/cat/${categoryId}?poems=true&mainSections=false`,
      {
        timeout: 10000,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    );

    const categoryData = response.data?.cat;
    const poemIds = new Set<number>();

    if (!categoryData) {
      return poemIds;
    }

    const pendingCategoryIds = new Set<number>();
    collectPoemIdsFromCategory(categoryData, poemIds, pendingCategoryIds);

    for (const childCategoryId of pendingCategoryIds) {
      if (
        childCategoryId !== categoryId &&
        !visitedCategories.has(childCategoryId)
      ) {
        const childPoemIds = await fetchPoemIdsForCategory(
          childCategoryId,
          visitedCategories,
        );
        childPoemIds.forEach((id) => poemIds.add(id));
      }
    }

    return poemIds;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error(
        `Error fetching poems for category ${categoryId}:`,
        error.response?.data || error.message,
      );
    } else {
      logger.error(`Error fetching poems for category ${categoryId}:`, error);
    }

    throw new Error(
      "متأسفانه در جمع‌آوری اشعار شاعر مشکلی پیش آمد. لطفاً دوباره تلاش کنید",
    );
  }
};

const getPoemIdsForPoet = async (poet: Poet): Promise<number[]> => {
  if (poetPoemIdsCache[poet.id]) {
    return poetPoemIdsCache[poet.id];
  }

  if (poetPoemIdsPromiseCache[poet.id]) {
    return poetPoemIdsPromiseCache[poet.id];
  }

  const categoryId = poet.rootCatId || poet.id;

  if (!categoryId) {
    throw new Error("شناسه دسته‌بندی شاعر معتبر نیست");
  }

  const promise = (async () => {
    const poemIdsSet = await fetchPoemIdsForCategory(
      categoryId,
      new Set<number>(),
    );
    const poemIds = Array.from(poemIdsSet);

    if (poemIds.length === 0) {
      throw new Error("هیچ شعری برای این شاعر یافت نشد");
    }

    poetPoemIdsCache[poet.id] = poemIds;
    return poemIds;
  })();

  poetPoemIdsPromiseCache[poet.id] = promise;

  try {
    return await promise;
  } finally {
    delete poetPoemIdsPromiseCache[poet.id];
  }
};

const helpers = {
  getPoetName: (fullTitle: string): string => {
    const parts = fullTitle.split(" » ");
    return parts[0];
  },
  getPoetSlug: (fullUrl: string): string => {
    if (!fullUrl) return "";
    const cleanUrl = fullUrl.startsWith("/") ? fullUrl.substring(1) : fullUrl;
    const parts = cleanUrl.split("/");
    return parts[0] || "";
  },
};

const ganjoorApi = {
  async getRandomPoem(): Promise<Poem> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/ganjoor/poem/random`,
        {
          timeout: 5000,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );

      return ganjoorApi.mapPoemResponse(response.data);
    } catch (error) {
      logger.error("Error fetching random poem:", error);
      throw new Error(
        "متأسفانه در دریافت شعر تصادفی مشکلی پیش آمد. لطفاً دوباره تلاش کنید",
      );
    }
  },

  async getPoemById(id: number): Promise<Poem> {
    try {
      // Validate ID before making request
      if (isNaN(id) || id < 1) {
        throw new Error("شناسه شعر معتبر نیست");
      }

      // No cache check - always fetch fresh data
      logger.log("Fetching poem:", id);
      const response = await axios.get(
        `${API_BASE_URL}/api/ganjoor/poem/${id}`,
        {
          timeout: 5000,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );

      logger.log("API Response:", response.data);
      // Don't cache the response
      return ganjoorApi.mapPoemResponse(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error("API Error:", error.response?.data);
        if (error.response?.status === 404) {
          throw new Error("متأسفانه شعر مورد نظر پیدا نشد");
        }
        throw new Error(
          "متأسفانه در ارتباط با سرور مشکلی پیش آمد. لطفاً دوباره تلاش کنید",
        );
      }
      throw error;
    }
  },

  async getPoets(): Promise<Poet[]> {
    const response = await axios.get(`${API_BASE_URL}/api/ganjoor/poets`, {
      timeout: 5000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    return response.data.map((poet: any) => ({
      id: poet.id,
      name: poet.name,
      description: poet.description,
      fullUrl: poet.fullUrl,
      urlSlug: poet.fullUrl.slice(1), // Remove the leading slash
      rootCatId: poet.rootCatId,
      nickname: poet.nickname,
      published: poet.published,
      imageUrl: `${API_BASE_URL}/api/ganjoor/poet/image/${poet.fullUrl.slice(1)}.gif`,
      birthYearInLHijri: poet.birthYearInLHijri,
      validBirthDate: poet.validBirthDate,
      deathYearInLHijri: poet.deathYearInLHijri,
      validDeathDate: poet.validDeathDate,
      pinOrder: poet.pinOrder,
      birthPlace: poet.birthPlace,
      birthPlaceLatitude: poet.birthPlaceLatitude,
      birthPlaceLongitude: poet.birthPlaceLongitude,
      deathPlace: poet.deathPlace,
      deathPlaceLatitude: poet.deathPlaceLatitude,
      deathPlaceLongitude: poet.deathPlaceLongitude,
    }));
  },

  async getCenturies(): Promise<Century[]> {
    const response = await axios.get(`${API_BASE_URL}/api/ganjoor/centuries`, {
      timeout: 5000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    // Transform the response to fix image URLs
    return response.data.map((century: any) => ({
      ...century,
      poets: century.poets.map((poet: any) => ({
        ...poet,
        imageUrl: `${API_BASE_URL}${poet.imageUrl}`,
        fullUrl: poet.fullUrl.startsWith("/")
          ? poet.fullUrl.slice(1)
          : poet.fullUrl,
      })),
    }));
  },

  async getRandomPoemByPoet(slug: string): Promise<Poem> {
    const poet = await ganjoorApi.getPoetBySlug(slug);
    try {
      // Don't use session storage cache - always get fresh data
      const response = await axios.get(
        `${API_BASE_URL}/api/ganjoor/poem/random?poetId=${poet.id}`,
        {
          timeout: 5000,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );

      // Don't check or store in cache
      return ganjoorApi.mapPoemResponse(response.data);
    } catch (error) {
      logger.warn(
        `Random poem API failed for poet ${poet.name} (${poet.id}). Falling back to manual selection.`,
        error,
      );

      try {
        return await ganjoorApi.getRandomPoemFromPoetCollection(poet);
      } catch (fallbackError) {
        logger.error(
          "Fallback random poem selection failed:",
          fallbackError,
        );

        if (fallbackError instanceof Error) {
          throw fallbackError;
        }

        throw new Error(
          "متأسفانه در دریافت شعر تصادفی مشکلی پیش آمد. لطفاً دوباره تلاش کنید",
        );
      }
    }
  },

  async getRandomPoemFromPoetCollection(poet: Poet): Promise<Poem> {
    const poemIds = await getPoemIdsForPoet(poet);

    if (!poemIds.length) {
      throw new Error("هیچ شعری برای این شاعر یافت نشد");
    }

    const randomIndex = Math.floor(Math.random() * poemIds.length);
    const randomPoemId = poemIds[randomIndex];

    return ganjoorApi.getPoemById(randomPoemId);
  },

  async getPoetImage(poetSlug: string): Promise<string> {
    const response = await axios.get(
      `${API_BASE_URL}/api/ganjoor/poet/image/${poetSlug}.gif`,
      {
        timeout: 5000,
        headers: {
          Accept: "image/gif",
        },
      },
    );
    return response.data;
  },

  mapPoetResponse(data: any): Poet {
    if (!data || !data.poet) {
      throw new Error("Invalid poet data");
    }
    const poet = data.poet;
    return {
      id: poet.id,
      name: poet.name,
      description: poet.description,
      fullUrl: poet.fullUrl,
      urlSlug: poet.fullUrl.startsWith("/")
        ? poet.fullUrl.slice(1)
        : poet.fullUrl,
      rootCatId: poet.rootCatId,
      nickname: poet.nickname,
      published: poet.published,
      imageUrl: `${API_BASE_URL}${poet.imageUrl}`,
      birthYearInLHijri: poet.birthYearInLHijri,
      validBirthDate: poet.validBirthDate,
      deathYearInLHijri: poet.deathYearInLHijri,
      validDeathDate: poet.validDeathDate,
      pinOrder: poet.pinOrder,
      birthPlace: poet.birthPlace,
      birthPlaceLatitude: poet.birthPlaceLatitude,
      birthPlaceLongitude: poet.birthPlaceLongitude,
      deathPlace: poet.deathPlace,
      deathPlaceLatitude: poet.deathPlaceLatitude,
      deathPlaceLongitude: poet.deathPlaceLongitude,
    };
  },

  async getPoetBySlug(slug: string): Promise<Poet> {
    if (poetCache[slug]) {
      return poetCache[slug];
    }

    const response = await axios.get(
      `${API_BASE_URL}/api/ganjoor/poet?url=/${slug}`,
      {
        timeout: 5000,
        headers: {
          Accept: "application/json",
        },
      },
    );
    const poet = ganjoorApi.mapPoetResponse(response.data);
    poetCache[slug] = poet;
    return poet;
  },

  async getPoemByUrl(url: string): Promise<Poem> {
    const response = await axios.get(
      `${API_BASE_URL}/api/ganjoor/poem?url=${url}`,
      {
        timeout: 5000,
        headers: {
          Accept: "application/json",
        },
      },
    );
    return ganjoorApi.mapPoemResponse(response.data);
  },

  async getPoemIdByUrl(url: string): Promise<number> {
    const poem = await this.getPoemByUrl(url);
    return poem.id;
  },

  async getRecitationVerses(recitationId: number): Promise<VerseSync[]> {
    try {
      if (isNaN(recitationId) || recitationId < 1) {
        throw new Error("شناسه خوانش معتبر نیست");
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/audio/verses/${recitationId}`,
        {
          timeout: 10000,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );

      return response.data.map((verse: any) => ({
        verseOrder: verse.verseOrder,
        verseText: verse.verseText,
        audioStartMilliseconds: verse.audioStartMilliseconds,
      }));
    } catch (error) {
      logger.error("Error fetching recitation verses:", error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error("متأسفانه اطلاعات همزمان‌سازی این خوانش یافت نشد");
        }
        throw new Error("متأسفانه در دریافت اطلاعات همزمان‌سازی مشکلی پیش آمد");
      }
      throw error;
    }
  },

  mapPoemResponse(data: any): Poem {
    if (!data || !data.id) {
      throw new Error("متأسفانه شعر مورد نظر یافت نشد");
    }

    // Map recitations to our type if available
    const recitations: PoemRecitation[] =
      data.recitations?.map((rec: any) => ({
        id: rec.id,
        poemId: rec.poemId,
        poemFullTitle: rec.poemFullTitle,
        poemFullUrl: rec.poemFullUrl,
        audioTitle: rec.audioTitle,
        audioArtist: rec.audioArtist,
        audioArtistUrl: rec.audioArtistUrl,
        audioSrc: rec.audioSrc,
        audioSrcUrl: rec.audioSrcUrl,
        legacyAudioGuid: rec.legacyAudioGuid,
        mp3FileCheckSum: rec.mp3FileCheckSum,
        mp3SizeInBytes: rec.mp3SizeInBytes,
        publishDate: rec.publishDate,
        fileLastUpdated: rec.fileLastUpdated,
        mp3Url: rec.mp3Url,
        xmlText: rec.xmlText,
        plainText: rec.plainText,
        htmlText: rec.htmlText,
        mistakes: rec.mistakes || [],
        audioOrder: rec.audioOrder,
        recitationType: rec.recitationType,
        inSyncWithText: rec.inSyncWithText,
        upVotedByUser: rec.upVotedByUser,
      })) || [];

    // Clean up HTML text by removing unnecessary divs and keeping only meaningful structure
    const cleanHtml =
      data.htmlText
        ?.replace(/<div[^>]*class="([^"]*)"[^>]*>/g, "")
        .replace(/<\/div>/g, "")
        .replace(/<p[^>]*>/g, "")
        .replace(/<\/p>/g, "\n")
        .trim() || "";

    const imgUrl = `${API_BASE_URL}/api/ganjoor/poet/image/${helpers.getPoetSlug(data.fullUrl)}.gif`;

    return {
      id: data.id,
      title: data.title || "Unknown Title",
      fullTitle: data.fullTitle || "",
      urlSlug: data.urlSlug || "",
      fullUrl: data.fullUrl || "",
      plainText: cleanHtml || data.plainText,
      htmlText: cleanHtml || "",
      recitations: recitations,
      poet: helpers.getPoetName(data.fullTitle),
      poetSlug: helpers.getPoetSlug(data.fullUrl),
      poetNickname: helpers.getPoetName(data.fullUrl),
      poetImageUrl: imgUrl,
    };
  },
};

export default ganjoorApi;
