import type { Poem, PoemRecitation } from "@/types/poem";
import rahmaniPoems from "../../poems/rahmani.json";
import { Poet, poetNames } from "@/types/poets";

const customApi = {
  /**
   * Get a random poem from the local collection
   */
  async getRandomPoem(poet: Poet): Promise<Poem> {
    try {
      // For now, we only have Rahmani's poems
      if (poet !== Poet.RAHMANI) {
        throw new Error("شعر این شاعر در دسترس نیست");
      }

      const poems = rahmaniPoems.poems;
      const randomIndex = Math.floor(Math.random() * poems.length);
      const randomPoem = poems[randomIndex];

      return customApi.mapLocalPoemToPoem(randomPoem, poet);
    } catch (error) {
      console.error("Error fetching random poem from local source:", error);
      throw new Error("خطا در دریافت شعر تصادفی");
    }
  },

  /**
   * Get a poem by ID from the local collection
   */
  async getPoemById(id: number, poet: Poet): Promise<Poem> {
    try {
      // Validate ID before searching
      if (isNaN(id) || id < 1) {
        throw new Error("شناسه شعر نامعتبر است");
      }

      // For now, we only have Rahmani's poems
      if (poet !== Poet.RAHMANI) {
        throw new Error("شعر این شاعر در دسترس نیست");
      }

      console.log("Fetching local poem with ID:", id);
      const poem = rahmaniPoems.poems.find((poem) => poem.id === id);

      if (!poem) {
        throw new Error(`شعر با شناسه ${id} پیدا نشد`);
      }

      return customApi.mapLocalPoemToPoem(poem, poet);
    } catch (error) {
      console.error("Error fetching poem by ID from local source:", error);
      throw error;
    }
  },

  /**
   * Map the local poem format to the Poem type used in the app
   */
  mapLocalPoemToPoem(localPoem: any, poet: Poet): Poem {
    if (!localPoem || !localPoem.id) {
      throw new Error("شعر یافت نشد");
    }

    // For modern poems, we'll keep the HTML formatting
    const plainText = localPoem.htmlPoem;
    const htmlText = localPoem.htmlPoem;

    // Create a recitation object if available
    const recitations: PoemRecitation[] = localPoem.recitation
      ? [
        {
          id: localPoem.id,
          poemId: localPoem.id,
          poemFullTitle: localPoem.title,
          poemFullUrl: localPoem.url || "",
          audioTitle: localPoem.title,
          audioArtist: poetNames[poet], // Use the display name from our mapping
          audioArtistUrl: "",
          audioSrc: `/api/audio?url=${encodeURIComponent(localPoem.recitation)}`,
          audioSrcUrl: `/api/audio?url=${encodeURIComponent(localPoem.recitation)}`,
          legacyAudioGuid: "",
          mp3FileCheckSum: "",
          mp3SizeInBytes: 0,
          publishDate: "",
          fileLastUpdated: "",
          mp3Url: `/api/audio?url=${encodeURIComponent(localPoem.recitation)}`, // Use proxy endpoint
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
      fullUrl: localPoem.url || "",
      plainText: plainText,
      htmlText: htmlText,
      recitations: recitations,
      poet: poetNames[poet], // Use the display name from our mapping
    };
  },
};

export default customApi;
