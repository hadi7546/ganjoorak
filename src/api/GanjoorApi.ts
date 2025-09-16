import axios from "axios";
import type { Poem, PoemRecitation, VerseSync } from "@/types/poem";
import type { Poet, Century } from "@/types/poet";

const API_BASE_URL = "https://api.ganjoor.net";

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
      throw new Error(
        "متأسفانه در دریافت شعر تصادفی مشکلی پیش آمد. لطفاً دوباره تلاش کنید",
      );
    }
  },

  async getPoemById(id: number): Promise<Poem> {
    try {
      if (isNaN(id) || id < 1) {
        throw new Error("شناسه شعر معتبر نیست");
      }

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

      return ganjoorApi.mapPoemResponse(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
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
      urlSlug: poet.fullUrl.slice(1),
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

      return ganjoorApi.mapPoemResponse(response.data);
    } catch (error) {
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
