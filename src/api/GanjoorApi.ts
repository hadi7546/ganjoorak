import axios from "axios";
import type { Poem, PoemRecitation, VerseSync } from "@/types/poem";
import type { Poet, Century } from "@/types/poet";
import type {
  GanjoorPoemSummary,
  GanjoorCategory,
  GanjoorPoetCatalog,
  GanjoorCategoryReference,
  GanjoorPoemSearchResult,
} from "@/types/ganjoor";
import { logger } from "@/utils/logger";

const API_TIMEOUT_MS = 15000;

const SERVER_API_BASE_URL =
  process.env.GANJOOR_API_BASE_URL ||
  process.env.NEXT_PUBLIC_GANJOOR_API_BASE_URL ||
  "http://api.offline.ganjoor.net";

const BROWSER_API_BASE_URL =
  process.env.NEXT_PUBLIC_GANJOOR_API_BASE_URL || "";

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, "");

const API_BASE_URL =
  typeof window === "undefined"
    ? normalizeBaseUrl(SERVER_API_BASE_URL)
    : normalizeBaseUrl(BROWSER_API_BASE_URL);

const ganjoorHttp = axios.create({
  proxy: false,
});

const getAudioProxyUrl = (url?: string) =>
  url ? `/api/audio?url=${encodeURIComponent(url)}` : "";

// Cache for poet data
const poetCache: Record<string, Poet | undefined> = {};
const poetCatalogCache: Record<string, GanjoorPoetCatalog | undefined> = {};
const poetCatalogPromiseCache: Record<
  string,
  Promise<GanjoorPoetCatalog> | undefined
> = {};

const cachePoetCatalog = (catalog: GanjoorPoetCatalog, aliases: string[] = []) => {
  const keys = [
    catalog.poet.urlSlug,
    catalog.poet.id ? `id:${catalog.poet.id}` : "",
    ...aliases,
  ].filter(Boolean);

  keys.forEach((key) => {
    poetCatalogCache[key] = catalog;
  });
};

const getCachedPoetCatalog = (keys: string[]) =>
  keys.map((key) => poetCatalogCache[key]).find(Boolean);

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
  mapPoemSummary: (poem: any): GanjoorPoemSummary => ({
    id: poem?.id ?? 0,
    title: poem?.title ?? "",
    urlSlug: poem?.urlSlug ?? null,
    fullUrl: poem?.fullUrl ?? null,
    excerpt: poem?.excerpt ?? null,
    mainSections: poem?.mainSections ?? null,
  }),
  mapCategoryReference: (category: any): GanjoorCategoryReference => ({
    id: category?.id ?? 0,
    title: category?.title ?? "",
    urlSlug: category?.urlSlug ?? null,
    fullUrl: category?.fullUrl ?? "",
    tableOfContentsStyle: category?.tableOfContentsStyle ?? null,
    catType: category?.catType ?? null,
    description: category?.description ?? null,
    descriptionHtml: category?.descriptionHtml ?? null,
    published: category?.published ?? false,
    bookName: category?.bookName ?? null,
  }),
  mapCategory: (category: any): GanjoorCategory => {
    const base = helpers.mapCategoryReference(category);
    const children = Array.isArray(category?.children)
      ? category.children.map((child: any) => helpers.mapCategory(child))
      : [];
    const poems = Array.isArray(category?.poems)
      ? category.poems.map((poem: any) => helpers.mapPoemSummary(poem))
      : [];
    const ancestors = Array.isArray(category?.ancestors)
      ? category.ancestors.map((ancestor: any) =>
        helpers.mapCategoryReference(ancestor),
      )
      : [];

    return {
      ...base,
      children,
      poems,
      ancestors,
      next: category?.next ? helpers.mapCategoryReference(category.next) : null,
      previous: category?.previous
        ? helpers.mapCategoryReference(category.previous)
        : null,
      sumUpSubsGeoLocations: category?.sumUpSubsGeoLocations ?? false,
      mapName: category?.mapName ?? null,
      rImageId: category?.rImageId ?? null,
    };
  },
  mapPoemSearchResult: (poem: any): GanjoorPoemSearchResult => {
    const fullTitle = poem?.fullTitle ?? "";
    const fullUrl = poem?.fullUrl ?? "";
    const fullTitleParts = fullTitle
      .split(" » ")
      .map((part: string) => part.trim())
      .filter(Boolean);
    const poetName = fullTitleParts[0] || helpers.getPoetName(fullTitle);
    const bookTitle =
      poem?.oldTag ||
      (fullTitleParts.length > 2
        ? fullTitleParts.slice(1, -1).join(" » ")
        : null);
    const bookUrl =
      poem?.oldTagPageUrl ||
      (fullUrl.split("/").filter(Boolean).length > 2
        ? `/${fullUrl.split("/").filter(Boolean).slice(0, -1).join("/")}`
        : null);

    return {
      id: poem?.id ?? 0,
      title: poem?.title ?? "",
      fullTitle,
      fullUrl,
      plainText: poem?.plainText ?? "",
      poemSummary: poem?.poemSummary ?? null,
      poetName,
      poetSlug: helpers.getPoetSlug(fullUrl),
      bookTitle,
      bookUrl,
    };
  },
};

const ganjoorApi = {
  async getRandomPoem(): Promise<Poem> {
    try {
      const response = await ganjoorHttp.get(
        `${API_BASE_URL}/api/ganjoor/poem/random`,
        {
          timeout: API_TIMEOUT_MS,
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
      const response = await ganjoorHttp.get(
        `${API_BASE_URL}/api/ganjoor/poem/${id}`,
        {
          timeout: API_TIMEOUT_MS,
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
    const response = await ganjoorHttp.get(`${API_BASE_URL}/api/ganjoor/poets`, {
      timeout: API_TIMEOUT_MS,
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
      source: "ganjoor",
      sourceGroupName: "شاعران کهن",
    }));
  },

  async searchPoems(
    term: string,
    { pageSize = 12, pageNumber = 1 }: { pageSize?: number; pageNumber?: number } = {},
  ): Promise<GanjoorPoemSearchResult[]> {
    const normalizedTerm = term.trim();
    if (normalizedTerm.length < 2) {
      return [];
    }

    try {
      const response = await ganjoorHttp.get(
        `${API_BASE_URL}/api/ganjoor/poems/search`,
        {
          timeout: API_TIMEOUT_MS,
          params: {
            term: normalizedTerm,
            PageNumber: pageNumber,
            PageSize: pageSize,
          },
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );

      return Array.isArray(response.data)
        ? response.data.map((poem: any) => helpers.mapPoemSearchResult(poem))
        : [];
    } catch (error) {
      logger.error("Error searching poems:", error);
      throw new Error("متأسفانه در جستجوی شعرها مشکلی پیش آمد");
    }
  },

  async getCenturies(): Promise<Century[]> {
    const response = await ganjoorHttp.get(`${API_BASE_URL}/api/ganjoor/centuries`, {
      timeout: API_TIMEOUT_MS,
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

  async getRandomPoemByPoetId(poetId: number): Promise<Poem> {
    if (!Number.isInteger(poetId) || poetId < 1) {
      throw new Error("شناسه شاعر معتبر نیست");
    }

    try {
      // Don't use session storage cache - always get fresh data
      const response = await ganjoorHttp.get(
        `${API_BASE_URL}/api/ganjoor/poem/random?poetId=${poetId}`,
        {
          timeout: API_TIMEOUT_MS,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );

      // Don't check or store in cache
      return ganjoorApi.mapPoemResponse(response.data);
    } catch (error) {
      logger.error("Error fetching random poem:", error);
      throw new Error(
        "متأسفانه در دریافت شعر مشکلی پیش آمد. لطفاً دوباره تلاش کنید",
      );
    }
  },

  async getRandomPoemByPoet(slug: string): Promise<Poem> {
    const poet = await ganjoorApi.getPoetBySlug(slug);
    return ganjoorApi.getRandomPoemByPoetId(poet.id);
  },

  async getPoetImage(poetSlug: string): Promise<string> {
    const response = await ganjoorHttp.get(
      `${API_BASE_URL}/api/ganjoor/poet/image/${poetSlug}.gif`,
      {
        timeout: API_TIMEOUT_MS,
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
      source: "ganjoor",
      sourceGroupName: "شاعران کهن",
    };
  },

  async getPoetCatalogById(poetId: number): Promise<GanjoorPoetCatalog> {
    try {
      if (!Number.isInteger(poetId) || poetId < 1) {
        throw new Error("شناسه شاعر معتبر نیست");
      }

      const cacheKey = `id:${poetId}`;
      if (poetCatalogCache[cacheKey]) {
        return poetCatalogCache[cacheKey];
      }

      if (poetCatalogPromiseCache[cacheKey]) {
        return await poetCatalogPromiseCache[cacheKey];
      }

      const request = (async () => {
        const response = await ganjoorHttp.get(
          `${API_BASE_URL}/api/ganjoor/poet/${poetId}`,
          {
            timeout: API_TIMEOUT_MS,
            params: {
              catPoems: true,
            },
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.data?.poet || !response.data?.cat) {
          throw new Error("Invalid poet catalog data");
        }

        const mappedPoet = ganjoorApi.mapPoetResponse(response.data);
        if (mappedPoet.urlSlug) {
          poetCache[mappedPoet.urlSlug] = mappedPoet;
        }

        const catalog = {
          poet: mappedPoet,
          category: helpers.mapCategory(response.data.cat),
        };
        cachePoetCatalog(catalog, [cacheKey]);
        return catalog;
      })();

      poetCatalogPromiseCache[cacheKey] = request;
      return await request;
    } catch (error) {
      logger.error("Error fetching poet catalog by id:", error);
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new Error("شاعر مورد نظر یافت نشد");
      }
      throw new Error("متأسفانه در دریافت اطلاعات شاعر مشکلی پیش آمد");
    } finally {
      delete poetCatalogPromiseCache[`id:${poetId}`];
    }
  },

  async getPoetCatalog(
    slug: string,
    poetId?: number,
  ): Promise<GanjoorPoetCatalog> {
    try {
      const normalizedPoetId =
        typeof poetId === "number" && Number.isInteger(poetId) && poetId > 0
          ? poetId
          : 0;
      const cacheKeys = [
        slug,
        normalizedPoetId > 0 ? `id:${normalizedPoetId}` : "",
      ].filter(Boolean);
      const cachedCatalog = getCachedPoetCatalog(cacheKeys);
      if (cachedCatalog) {
        return cachedCatalog;
      }

      if (normalizedPoetId > 0) {
        const catalog = await ganjoorApi.getPoetCatalogById(normalizedPoetId);
        if (!catalog.poet.urlSlug || catalog.poet.urlSlug === slug) {
          if (catalog.poet.urlSlug) {
            poetCache[catalog.poet.urlSlug] = catalog.poet;
          }
          poetCache[slug] = catalog.poet;
          cachePoetCatalog(catalog, [slug]);
          return catalog;
        }
      }

      const poet = await ganjoorApi.getPoetBySlug(slug);
      const catalog = await ganjoorApi.getPoetCatalogById(poet.id);
      if (catalog.poet.urlSlug) {
        poetCache[catalog.poet.urlSlug] = catalog.poet;
      }
      poetCache[slug] = catalog.poet;
      cachePoetCatalog(catalog, [slug]);
      return catalog;
    } catch (error) {
      logger.error("Error fetching poet catalog:", error);
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new Error("شاعر مورد نظر یافت نشد");
      }
      throw new Error("متأسفانه در دریافت اطلاعات شاعر مشکلی پیش آمد");
    }
  },

  async getPoetBySlug(slug: string): Promise<Poet> {
    if (poetCache[slug]) {
      return poetCache[slug];
    }

    const response = await ganjoorHttp.get(
      `${API_BASE_URL}/api/ganjoor/poet?url=/${slug}`,
      {
        timeout: API_TIMEOUT_MS,
        headers: {
          Accept: "application/json",
        },
      },
    );
    const poet = ganjoorApi.mapPoetResponse(response.data);
    poetCache[slug] = poet;
    return poet;
  },

  async getCategoryWithPoems(
    categoryId: number,
    { includeMainSections = false }: { includeMainSections?: boolean } = {},
  ): Promise<GanjoorCategory> {
    try {
      const response = await ganjoorHttp.get(
        `${API_BASE_URL}/api/ganjoor/cat/${categoryId}`,
        {
          timeout: API_TIMEOUT_MS,
          params: {
            poems: true,
            mainSections: includeMainSections,
          },
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );
      return helpers.mapCategory(response.data.cat);
    } catch (error) {
      logger.error("Error fetching category poems:", error);
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new Error("مجموعهٔ درخواستی یافت نشد");
      }
      throw new Error("متأسفانه در دریافت مجموعهٔ اشعار مشکلی پیش آمد");
    }
  },

  async getPoemByUrl(url: string): Promise<Poem> {
    const response = await ganjoorHttp.get(
      `${API_BASE_URL}/api/ganjoor/poem?url=${url}`,
      {
        timeout: API_TIMEOUT_MS,
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

      const response = await ganjoorHttp.get(
        `${API_BASE_URL}/api/audio/verses/${recitationId}`,
        {
          timeout: API_TIMEOUT_MS,
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
      data.recitations?.map((rec: any) => {
        const proxiedMp3Url = getAudioProxyUrl(rec.mp3Url);

        return {
          id: rec.id,
          poemId: rec.poemId,
          poemFullTitle: rec.poemFullTitle,
          poemFullUrl: rec.poemFullUrl,
          audioTitle: rec.audioTitle,
          audioArtist: rec.audioArtist,
          audioArtistUrl: rec.audioArtistUrl,
          audioSrc: proxiedMp3Url || rec.audioSrc,
          audioSrcUrl: proxiedMp3Url || rec.audioSrcUrl,
          legacyAudioGuid: rec.legacyAudioGuid,
          mp3FileCheckSum: rec.mp3FileCheckSum,
          mp3SizeInBytes: rec.mp3SizeInBytes,
          publishDate: rec.publishDate,
          fileLastUpdated: rec.fileLastUpdated,
          mp3Url: proxiedMp3Url || rec.mp3Url,
          xmlText: rec.xmlText,
          plainText: rec.plainText,
          htmlText: rec.htmlText,
          mistakes: rec.mistakes || [],
          audioOrder: rec.audioOrder,
          recitationType: rec.recitationType,
          inSyncWithText: rec.inSyncWithText,
          upVotedByUser: rec.upVotedByUser,
        };
      }) || [];

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
      source: "ganjoor",
    };
  },
};

export default ganjoorApi;
