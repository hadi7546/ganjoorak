import axios from "axios";
import type { Poem, PoemRecitation, VerseSync } from "@/types/poem";
import type { Poet, Century } from "@/types/poet";
import poemIdData from "@/data/poem-ids.json";
import { logger } from "@/utils/logger";

const API_BASE_URL = "https://api.ganjoor.net";

const ALL_POEM_IDS: number[] = (poemIdData as number[]).filter((id) =>
  typeof id === "number" && Number.isFinite(id) && id > 0,
);

const poemIdToPoetId = new Map<number, number>();
const poetIdToPoemIds = new Map<number, Set<number>>();
const poetScanIndex = new Map<number, number>();

const MAX_GENERAL_RANDOM_ATTEMPTS = Math.min(ALL_POEM_IDS.length, 120);

// Cache for poet data
const poetCache: Record<string, Poet> = {};

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

const getRandomPoemIdFromPool = (exclude: Set<number>): number | null => {
  if (exclude.size >= ALL_POEM_IDS.length || ALL_POEM_IDS.length === 0) {
    return null;
  }

  let candidate: number | null = null;
  while (candidate === null) {
    const index = Math.floor(Math.random() * ALL_POEM_IDS.length);
    const poemId = ALL_POEM_IDS[index];
    if (!exclude.has(poemId)) {
      candidate = poemId;
    }
  }

  return candidate;
};

const getRandomPoemIdFromSet = (poemIds: Set<number>): number | null => {
  if (poemIds.size === 0) {
    return null;
  }

  const ids = Array.from(poemIds);
  const index = Math.floor(Math.random() * ids.length);
  return ids[index] ?? null;
};

const recordPoemAssociation = (poem: Poem) => {
  if (poem.poetId === null || poem.poetId === undefined) {
    return;
  }

  poemIdToPoetId.set(poem.id, poem.poetId);

  let cached = poetIdToPoemIds.get(poem.poetId);
  if (!cached) {
    cached = new Set<number>();
    poetIdToPoemIds.set(poem.poetId, cached);
  }

  cached.add(poem.id);
};

const getSequentialIndex = (poetId: number): number => {
  if (ALL_POEM_IDS.length === 0) {
    return 0;
  }

  const current = poetScanIndex.get(poetId) ?? 0;
  poetScanIndex.set(poetId, (current + 1) % ALL_POEM_IDS.length);
  return current;
};

const ganjoorApi = {
  async getRandomPoem(): Promise<Poem> {
    const attemptedPoemIds = new Set<number>();

    for (let attempt = 0; attempt < MAX_GENERAL_RANDOM_ATTEMPTS; attempt++) {
      const poemId = getRandomPoemIdFromPool(attemptedPoemIds);
      if (poemId === null) {
        break;
      }

      attemptedPoemIds.add(poemId);

      try {
        const poem = await ganjoorApi.getPoemById(poemId);
        return poem;
      } catch (error) {
        logger.warn("Skipping poem during random selection:", {
          poemId,
          error,
        });
      }
    }

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

      const poem = ganjoorApi.mapPoemResponse(response.data);
      recordPoemAssociation(poem);
      return poem;
    } catch (fallbackError) {
      logger.error("Error fetching random poem (fallback):", fallbackError);
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
      const poem = ganjoorApi.mapPoemResponse(response.data);
      recordPoemAssociation(poem);
      return poem;
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
    const cachedPoems = poetIdToPoemIds.get(poet.id);
    if (cachedPoems && cachedPoems.size > 0) {
      const cachedPoemId = getRandomPoemIdFromSet(cachedPoems);
      if (cachedPoemId !== null) {
        return ganjoorApi.getPoemById(cachedPoemId);
      }
    }

    const attemptedPoemIds = new Set<number>();
    const randomAttempts = Math.min(MAX_GENERAL_RANDOM_ATTEMPTS, ALL_POEM_IDS.length);

    for (let attempt = 0; attempt < randomAttempts; attempt++) {
      const poemId = getRandomPoemIdFromPool(attemptedPoemIds);
      if (poemId === null) {
        break;
      }

      attemptedPoemIds.add(poemId);

      const knownPoetId = poemIdToPoetId.get(poemId);
      if (knownPoetId !== undefined && knownPoetId !== poet.id) {
        continue;
      }

      try {
        const poem = await ganjoorApi.getPoemById(poemId);
        if (poem.poetId === poet.id) {
          return poem;
        }
      } catch (error) {
        logger.warn("Skipping poem during poet-specific random selection:", {
          poemId,
          poetId: poet.id,
          error,
        });
      }
    }

    for (let scanCount = 0; scanCount < ALL_POEM_IDS.length; scanCount++) {
      const index = getSequentialIndex(poet.id);
      const poemId = ALL_POEM_IDS[index];

      if (attemptedPoemIds.has(poemId)) {
        continue;
      }

      const knownPoetId = poemIdToPoetId.get(poemId);
      if (knownPoetId !== undefined && knownPoetId !== poet.id) {
        continue;
      }

      try {
        const poem = await ganjoorApi.getPoemById(poemId);
        if (poem.poetId === poet.id) {
          return poem;
        }
      } catch (error) {
        logger.warn("Skipping poem during sequential poet scan:", {
          poemId,
          poetId: poet.id,
          error,
        });
      }
    }

    try {
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

      const poem = ganjoorApi.mapPoemResponse(response.data);
      recordPoemAssociation(poem);
      return poem;
    } catch (fallbackError) {
      logger.error("Error fetching random poem for poet (fallback):", {
        poetId: poet.id,
        error: fallbackError,
      });
      throw new Error(
        "متأسفانه در دریافت شعر مشکلی پیش آمد. لطفاً دوباره تلاش کنید",
      );
    }
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
    const poem = ganjoorApi.mapPoemResponse(response.data);
    recordPoemAssociation(poem);
    return poem;
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

    const poetId = data?.category?.poet?.id ?? data?.poetId ?? null;
    const imgUrl = `${API_BASE_URL}/api/ganjoor/poet/image/${helpers.getPoetSlug(data.fullUrl)}.gif`;

    return {
      id: data.id,
      poetId,
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
