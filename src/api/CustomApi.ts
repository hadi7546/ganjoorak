import type { Poem, PoemRecitation } from "@/types/poem";
import { PoetSlug, poetNames, createPoet, Poet } from "@/types/poet";
import { list } from "@vercel/blob";

// Cache for poets' poems
let poetPoemsCache: Record<string, any> = {};

// Define fallback paths for local JSON files
const poetFallbackPaths: Record<string, string> = {
  'rahmani': '/poems/rahmani.json',
  'farrokhzad': '/poems/farrokhzad.json',
};

const customApi = {
  /**
   * Get poet data from blob storage or local cache
   */
  async _getPoetData(poetSlug: PoetSlug): Promise<any> {
    try {
      // Return from cache if available
      if (poetPoemsCache[poetSlug]) {
        console.log(`Using cached data for poet: ${poetSlug}`);
        return poetPoemsCache[poetSlug];
      }

      console.log(`Fetching poet data for: ${poetSlug}`);
      // Try to fetch from our proxy API route
      try {
        // Use absolute URL with origin for server components
        const origin = typeof window !== 'undefined'
          ? window.location.origin
          : process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000';

        const apiUrl = `${origin}/api/poet/${poetSlug}`;
        console.log(`Making request to: ${apiUrl}`);

        const response = await fetch(apiUrl);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API error (${response.status}): ${errorText}`);
          throw new Error(`Failed to fetch poet data: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Successfully fetched data for poet: ${poetSlug}`);

        // Validate the data has the expected structure
        if (!data || !data.poems || !Array.isArray(data.poems)) {
          console.error('Invalid data structure received:', data);
          throw new Error('Invalid data structure received from API');
        }

        // Cache the data
        poetPoemsCache[poetSlug] = data;
        return data;
      } catch (apiError: any) {
        console.error("Error fetching from API:", apiError);

        // Try fallback to local JSON files
        try {
          console.log(`Trying fallback to local file for poet: ${poetSlug}`);
          const fallbackPath = poetFallbackPaths[poetSlug];

          if (!fallbackPath) {
            throw new Error(`No fallback path defined for poet: ${poetSlug}`);
          }

          console.log(`Fetching from fallback path: ${fallbackPath}`);
          const fallbackResponse = await fetch(fallbackPath);

          if (!fallbackResponse.ok) {
            throw new Error(`Fallback fetch failed: ${fallbackResponse.status}`);
          }

          const fallbackData = await fallbackResponse.json();
          console.log(`Successfully fetched fallback data for poet: ${poetSlug}`);

          if (!fallbackData || !fallbackData.poems || !Array.isArray(fallbackData.poems)) {
            throw new Error('Invalid data structure in fallback data');
          }

          // Cache the fallback data
          poetPoemsCache[poetSlug] = fallbackData;
          return fallbackData;
        } catch (fallbackError) {
          console.error("Error fetching from fallback:", fallbackError);
          throw new Error(`Failed to fetch poet data: ${apiError?.message || String(apiError)}`);
        }
      }
    } catch (error) {
      console.error(`Error getting poet data for ${poetSlug}:`, error);
      throw new Error("متأسفانه در دریافت اطلاعات شاعر مشکلی پیش آمد");
    }
  },

  async _getPoetImageUrl(poetSlug: PoetSlug): Promise<string> {
    const poetData = await customApi._getPoetData(poetSlug);
    return poetData.imageUrl;
  },


  /**
   * Get a random poem from the local collection
   */
  async getRandomPoem(poetSlug: PoetSlug): Promise<Poem> {
    try {
      // Get poet's poems from blob or local file
      const poetData = await customApi._getPoetData(poetSlug);
      const poems = poetData.poems;

      const randomIndex = Math.floor(Math.random() * poems.length);
      const randomPoem = poems[randomIndex];

      return await customApi.mapLocalPoemToPoem(randomPoem, poetSlug);
    } catch (error) {
      console.error("Error fetching random poem from local source:", error);
      throw new Error("متأسفانه در دریافت شعر تصادفی مشکلی پیش آمد. لطفاً دوباره تلاش کنید");
    }
  },

  /**
   * Get a poem by ID from the local collection
   */
  async getPoemById(id: number, poetSlug: PoetSlug): Promise<Poem> {
    try {
      // Validate ID before searching
      if (isNaN(id) || id < 1) {
        throw new Error("شناسه شعر معتبر نیست");
      }

      // Get poet's poems from blob or local file
      const poetData = await customApi._getPoetData(poetSlug);

      console.log("Fetching local poem with ID:", id);
      const poem = poetData.poems.find((poem: any) => poem.id === id);

      if (!poem) {
        throw new Error("متأسفانه شعر مورد نظر پیدا نشد");
      }

      return await customApi.mapLocalPoemToPoem(poem, poetSlug);
    } catch (error) {
      console.error("Error fetching poem by ID from local source:", error);
      throw error;
    }
  },

  /**
   * Get poet information including image from blob storage
   */
  async getPoetInfo(poetSlug: PoetSlug): Promise<Poet> {
    try {
      // Get poet's data from blob or local file
      const poetData = await customApi._getPoetData(poetSlug);

      // Create a complete Poet object
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
        deathPlaceLongitude: null

      });
    } catch (error) {
      console.error("Error fetching poet info:", error);
      throw new Error("متأسفانه در دریافت اطلاعات شاعر مشکلی پیش آمد");
    }
  },

  /**
   * Get all custom poets information
   */
  async getPoets(): Promise<Poet[]> {
    try {
      // Get all poet slugs from the PoetSlug enum
      const poetSlugs = Object.values(PoetSlug);
      console.log(`Attempting to fetch ${poetSlugs.length} custom poets`, poetSlugs);

      // Create an array of promises to fetch poet info for each slug
      const poetPromises = poetSlugs.map(async (slug) => {
        try {
          const poetInfo = await customApi.getPoetInfo(slug);
          console.log(`Successfully fetched poet info for ${slug}`);
          return poetInfo;
        } catch (error) {
          console.error(`Error fetching poet info for ${slug}:`, error);

          // Create fallback poet info if fetch fails
          try {
            console.log(`Creating fallback poet info for ${slug}`);
            const fallbackPoet = createPoet({
              id: 0,
              name: poetNames[slug],
              nickname: "",
              fullUrl: slug,
              urlSlug: slug,
              imageUrl: `https://7elmsr3m4bc7q4th.public.blob.vercel-storage.com/poets/${slug}.jpeg`, // Fallback to local image
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
              deathPlaceLongitude: null
            });
            console.log(`Created fallback poet for ${slug}:`, fallbackPoet);
            return fallbackPoet;
          } catch (fallbackError) {
            console.error(`Failed to create fallback poet for ${slug}:`, fallbackError);
            return null;
          }
        }
      });

      // Wait for all promises to resolve
      const poets = await Promise.all(poetPromises);
      console.log(`Fetched ${poets.filter(p => p !== null).length} poets out of ${poetSlugs.length}`);

      // Filter out any null values (failed fetches)
      return poets.filter((poet): poet is Poet => poet !== null);
    } catch (error) {
      console.error("Error fetching all custom poets:", error);
      return [];
    }
  },

  /**
   * Map the local poem format to the Poem type used in the app
   */
  async mapLocalPoemToPoem(localPoem: any, poetSlug: PoetSlug): Promise<Poem> {
    if (!localPoem || !localPoem.id) {
      throw new Error("متأسفانه شعر مورد نظر یافت نشد");
    }

    // For modern poems, we'll keep the HTML formatting
    const plainText = localPoem.text;
    const htmlText = localPoem.text;

    // Validate recitation URL if present
    let recitationUrl = "";
    if (localPoem.recitation) {
      // Make sure the recitation URL is from an allowed domain
      const allowedDomains = ['https://bayanbox.ir/', 'https://api.ganjoor.net/', 'https://ganjgah.ir/'];
      const isAllowed = allowedDomains.some(domain => localPoem.recitation.startsWith(domain));

      if (isAllowed) {
        recitationUrl = `/api/audio?url=${encodeURIComponent(localPoem.recitation)}`;
      } else {
        console.warn(`Skipping unauthorized recitation URL: ${localPoem.recitation}`);
      }
    }

    // Create a recitation object if available
    const recitations: PoemRecitation[] = recitationUrl
      ? [
        {
          id: localPoem.id,
          poemId: localPoem.id,
          poemFullTitle: localPoem.title,
          poemFullUrl: localPoem.source || "",
          audioTitle: localPoem.title,
          audioArtist: poetNames[poetSlug], // Use the display name from our mapping
          audioArtistUrl: "",
          audioSrc: recitationUrl,
          audioSrcUrl: recitationUrl,
          legacyAudioGuid: "",
          mp3FileCheckSum: "",
          mp3SizeInBytes: 0,
          publishDate: "",
          fileLastUpdated: "",
          mp3Url: recitationUrl, // Use proxy endpoint
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
