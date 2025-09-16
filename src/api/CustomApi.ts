import type { Poem, PoemRecitation } from "@/types/poem";
import { PoetSlug, poetNames, createPoet, Poet } from "@/types/poet";
import { list } from "@vercel/blob";

let poetPoemsCache: Record<string, any> = {};

const poetFallbackPaths: Record<string, string> = {
  rahmani: "/poems/rahmani.json",
  farrokhzad: "/poems/farrokhzad.json",
};

const customApi = {
  async _getPoetData(poetSlug: PoetSlug): Promise<any> {
    try {
      if (poetPoemsCache[poetSlug]) {
        return poetPoemsCache[poetSlug];
      }

      try {
        const origin =
          typeof window !== "undefined"
            ? window.location.origin
            : process.env.VERCEL_URL
              ? `https://${process.env.VERCEL_URL}`
              : "http://localhost:3000";

        const apiUrl = `${origin}/api/poet/${poetSlug}`;

        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch poet data: ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();

        if (!data || !data.poems || !Array.isArray(data.poems)) {
          throw new Error("Invalid data structure received from API");
        }

        poetPoemsCache[poetSlug] = data;
        return data;
      } catch (apiError: any) {
        try {
          const fallbackPath = poetFallbackPaths[poetSlug];

          if (!fallbackPath) {
            throw new Error(`No fallback path defined for poet: ${poetSlug}`);
          }

          const fallbackResponse = await fetch(fallbackPath);

          if (!fallbackResponse.ok) {
            throw new Error(
              `Fallback fetch failed: ${fallbackResponse.status}`,
            );
          }

          const fallbackData = await fallbackResponse.json();

          if (
            !fallbackData ||
            !fallbackData.poems ||
            !Array.isArray(fallbackData.poems)
          ) {
            throw new Error("Invalid data structure in fallback data");
          }

          poetPoemsCache[poetSlug] = fallbackData;
          return fallbackData;
        } catch (fallbackError) {
          throw new Error(
            `Failed to fetch poet data: ${apiError?.message || String(apiError)}`,
          );
        }
      }
    } catch (error) {
      throw new Error("متأسفانه در دریافت اطلاعات شاعر مشکلی پیش آمد");
    }
  },

  async _getPoetImageUrl(poetSlug: PoetSlug): Promise<string> {
    const poetData = await customApi._getPoetData(poetSlug);
    return poetData.imageUrl;
  },

  async getRandomPoem(poetSlug: PoetSlug): Promise<Poem> {
    try {
      const poetData = await customApi._getPoetData(poetSlug);
      const poems = poetData.poems;

      const randomIndex = Math.floor(Math.random() * poems.length);
      const randomPoem = poems[randomIndex];

      return await customApi.mapLocalPoemToPoem(randomPoem, poetSlug);
    } catch (error) {
      throw new Error(
        "متأسفانه در دریافت شعر تصادفی مشکلی پیش آمد. لطفاً دوباره تلاش کنید",
      );
    }
  },

  async getPoemById(id: number, poetSlug: PoetSlug): Promise<Poem> {
    try {
      if (isNaN(id) || id < 1) {
        throw new Error("شناسه شعر معتبر نیست");
      }

      const poetData = await customApi._getPoetData(poetSlug);

      const poem = poetData.poems.find((poem: any) => poem.id === id);

      if (!poem) {
        throw new Error("متأسفانه شعر مورد نظر پیدا نشد");
      }

      return await customApi.mapLocalPoemToPoem(poem, poetSlug);
    } catch (error) {
      throw error;
    }
  },

  async getPoetInfo(poetSlug: PoetSlug): Promise<Poet> {
    try {
      const poetData = await customApi._getPoetData(poetSlug);

      return createPoet({
        id: 0,
        name: poetData.poet,
        nickname: "",
        fullUrl: poetData.poetSlug,
        urlSlug: poetData.poetSlug,
        imageUrl: poetData.imageUrl,
        published: true,
        description: null,
        rootCatId: 0,
        birthYearInLHijri: null,
        validBirthDate: false,
        deathYearInLHijri: null,
        validDeathDate: false,
        pinOrder: 0,
        birthPlace: null,
        birthPlaceLatitude: null,
        birthPlaceLongitude: null,
        deathPlace: null,
        deathPlaceLatitude: null,
        deathPlaceLongitude: null,
      });
    } catch (error) {
      throw new Error("متأسفانه در دریافت اطلاعات شاعر مشکلی پیش آمد");
    }
  },

  async getPoets(): Promise<Poet[]> {
    try {
      const poetSlugs = Object.values(PoetSlug);

      const poetPromises = poetSlugs.map(async (slug) => {
        try {
          const poetInfo = await customApi.getPoetInfo(slug);
          return poetInfo;
        } catch (error) {
          try {
            const fallbackPoet = createPoet({
              id: 0,
              name: poetNames[slug],
              nickname: "",
              fullUrl: slug,
              urlSlug: slug,
              imageUrl: `https://7elmsr3m4bc7q4th.public.blob.vercel-storage.com/poets/${slug}.jpeg`,
              published: true,
              description: null,
              rootCatId: 0,
              birthYearInLHijri: null,
              validBirthDate: false,
              deathYearInLHijri: null,
              validDeathDate: false,
              pinOrder: 0,
              birthPlace: null,
              birthPlaceLatitude: null,
              birthPlaceLongitude: null,
              deathPlace: null,
              deathPlaceLatitude: null,
              deathPlaceLongitude: null,
            });
            return fallbackPoet;
          } catch (fallbackError) {
            console.error(
              `Failed to create fallback poet for ${slug}:`,
              fallbackError,
            );
            return null;
          }
        }
      });

      const poets = await Promise.all(poetPromises);

      return poets.filter((poet): poet is Poet => poet !== null);
    } catch (error) {
      return [];
    }
  },

  async mapLocalPoemToPoem(localPoem: any, poetSlug: PoetSlug): Promise<Poem> {
    if (!localPoem || !localPoem.id) {
      throw new Error("متأسفانه شعر مورد نظر یافت نشد");
    }

    const plainText = localPoem.text;
    const htmlText = localPoem.text;

    let recitationUrl = "";
    if (localPoem.recitation) {
      const allowedDomains = [
        "https://bayanbox.ir/",
        "https://api.ganjoor.net/",
        "https://ganjgah.ir/",
      ];
      const isAllowed = allowedDomains.some((domain) =>
        localPoem.recitation.startsWith(domain),
      );

      if (isAllowed) {
        recitationUrl = `/api/audio?url=${encodeURIComponent(localPoem.recitation)}`;
      } else {
        console.warn(
          `Skipping unauthorized recitation URL: ${localPoem.recitation}`,
        );
      }
    }

    const recitations: PoemRecitation[] = recitationUrl
      ? [
          {
            id: localPoem.id,
            poemId: localPoem.id,
            poemFullTitle: localPoem.title,
            poemFullUrl: localPoem.source || "",
            audioTitle: localPoem.title,
            audioArtist: poetNames[poetSlug],
            audioArtistUrl: "",
            audioSrc: recitationUrl,
            audioSrcUrl: recitationUrl,
            legacyAudioGuid: "",
            mp3FileCheckSum: "",
            mp3SizeInBytes: 0,
            publishDate: "",
            fileLastUpdated: "",
            mp3Url: recitationUrl,
            xmlText: "",
            plainText: plainText,
            htmlText: htmlText,
            mistakes: [],
            audioOrder: 1,
            recitationType: 0,
            inSyncWithText: false,
            upVotedByUser: false,
          },
        ]
      : [];

    return {
      id: localPoem.id,
      title: localPoem.title,
      fullTitle: localPoem.title,
      urlSlug: "",
      fullUrl: localPoem.source || "",
      plainText: plainText,
      htmlText: htmlText,
      recitations: recitations,
      isCustom: true,
      poet: poetNames[poetSlug],
      poetSlug: poetSlug,
      poetNickname: "",
      poetImageUrl: await customApi._getPoetImageUrl(poetSlug),
    };
  },
};

export default customApi;
