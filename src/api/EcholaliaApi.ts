import axios from "axios";
import type { Poem } from "@/types/poem";
import { createPoet, type Poet } from "@/types/poet";
import { logger } from "@/utils/logger";

const ECHOLALIA_API_BASE_URL = "https://echolalia.ir/wp-json/wp/v2";
const ECHOLALIA_POET_ROOT_SLUG = "sher";
const API_TIMEOUT_MS = 15000;

interface EcholaliaCategory {
  id: number;
  count: number;
  link: string;
  name: string;
  slug: string;
  parent: number;
  description?: string;
}

interface EcholaliaPost {
  id: number;
  date: string;
  slug: string;
  link: string;
  title: {
    rendered: string;
  };
  content?: {
    rendered: string;
  };
  excerpt?: {
    rendered: string;
  };
  categories: number[];
  featured_media?: number;
}

export interface EcholaliaPoemSummary {
  id: number;
  title: string;
  slug: string;
  link: string;
  date: string;
}

const echolaliaHttp = axios.create({
  proxy: false,
  timeout: API_TIMEOUT_MS,
  headers: {
    Accept: "application/json",
  },
});

const poetCache: Record<string, Poet | undefined> = {};
const poetPromiseCache: Record<string, Promise<Poet> | undefined> = {};
const poemSummaryCache: Record<string, EcholaliaPoemSummary[] | undefined> = {};
const poemSummaryPromiseCache: Record<
  string,
  Promise<EcholaliaPoemSummary[]> | undefined
> = {};

const decodeWordPressSlug = (slug: string) => {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
};

const decodeHtmlEntities = (value: string) => {
  const namedEntities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    hellip: "...",
    zwnj: "\u200c",
  };

  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&([a-z]+);/gi, (match, entity) => namedEntities[entity] ?? match);
};

const htmlToPlainText = (html: string) =>
  decodeHtmlEntities(
    html
      .replace(/<div\s+class=["']sing-block["'][\s\S]*$/i, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n"),
  );

const mapPostToSummary = (post: EcholaliaPost): EcholaliaPoemSummary => ({
  id: post.id,
  title: decodeHtmlEntities(post.title?.rendered ?? ""),
  slug: post.slug,
  link: post.link,
  date: post.date,
});

const getPoetImageRoute = (categoryId: number) =>
  `/api/echolalia/poet-image/${categoryId}`;

const extractMetaContent = (html: string, property: string) => {
  const pattern = new RegExp(
    `<meta\\s+(?:name|property)=["']${property}["']\\s+content=["']([^"']*)["']`,
    "i",
  );
  return decodeHtmlEntities(pattern.exec(html)?.[1] ?? "").trim();
};

const mapCategoryToPoet = (
  category: EcholaliaCategory,
  profile?: { description?: string },
  sourceGroupName?: string,
): Poet => {
  const slug = decodeWordPressSlug(category.slug);

  return createPoet({
    id: category.id,
    name: category.name,
    description:
      profile?.description ||
      category.description ||
      "اکولالیا - آرشیو شعر جهان",
    fullUrl: `/${slug}`,
    urlSlug: slug,
    rootCatId: category.id,
    nickname: null,
    published: true,
    imageUrl: getPoetImageRoute(category.id),
    source: "echolalia",
    sourceGroupName,
  });
};

const echolaliaApi = {
  async getPoets(): Promise<Poet[]> {
    try {
      const rootResponse = await echolaliaHttp.get<EcholaliaCategory[]>(
        `${ECHOLALIA_API_BASE_URL}/categories`,
        {
          params: {
            slug: ECHOLALIA_POET_ROOT_SLUG,
            _fields: "id,name,slug,count,parent,link,description",
          },
        },
      );
      const rootCategory = rootResponse.data[0];

      if (!rootCategory) {
        return [];
      }

      const firstPageResponse = await echolaliaHttp.get<EcholaliaCategory[]>(
        `${ECHOLALIA_API_BASE_URL}/categories`,
        {
          params: {
            per_page: 100,
            page: 1,
            _fields: "id,name,slug,count,parent,link,description",
          },
        },
      );
      const totalPages = Number(
        firstPageResponse.headers["x-wp-totalpages"] ?? 1,
      );
      const remainingPages =
        totalPages > 1
          ? await Promise.all(
              Array.from({ length: totalPages - 1 }, (_, index) =>
                echolaliaHttp.get<EcholaliaCategory[]>(
                  `${ECHOLALIA_API_BASE_URL}/categories`,
                  {
                    params: {
                      per_page: 100,
                      page: index + 2,
                      _fields: "id,name,slug,count,parent,link,description",
                    },
                  },
                ),
              ),
            )
          : [];

      const categories = [
        ...firstPageResponse.data,
        ...remainingPages.flatMap((response) => response.data),
      ];
      const childrenByParent = new Map<number, EcholaliaCategory[]>();

      categories.forEach((category) => {
        const siblings = childrenByParent.get(category.parent) ?? [];
        siblings.push(category);
        childrenByParent.set(category.parent, siblings);
      });

      const descendantIds = new Set<number>();
      const collectDescendants = (parentId: number) => {
        (childrenByParent.get(parentId) ?? []).forEach((child) => {
          descendantIds.add(child.id);
          collectDescendants(child.id);
        });
      };
      collectDescendants(rootCategory.id);

      return categories
        .filter((category) => descendantIds.has(category.id))
        .filter((category) => category.count > 0)
        .filter(
          (category) => (childrenByParent.get(category.id) ?? []).length === 0,
        )
        .map((category) => {
          const parent = categories.find((item) => item.id === category.parent);
          return mapCategoryToPoet(category, undefined, parent?.name);
        })
        .sort((a, b) => a.name.localeCompare(b.name, "fa"));
    } catch (error) {
      logger.error("Error fetching Echolalia poets:", error);
      return [];
    }
  },

  async getPoetBySlug(slug: string): Promise<Poet> {
    if (poetCache[slug]) {
      return poetCache[slug];
    }

    if (poetPromiseCache[slug]) {
      return await poetPromiseCache[slug];
    }

    const request = (async () => {
      const response = await echolaliaHttp.get<EcholaliaCategory[]>(
        `${ECHOLALIA_API_BASE_URL}/categories`,
        {
          params: {
            slug,
            _fields: "id,name,slug,count,parent,link,description",
          },
        },
      );
      const category = response.data[0];

      if (!category || category.count <= 0) {
        throw new Error("شاعر مورد نظر در اکولالیا پیدا نشد");
      }

      let profile: { description?: string } | undefined;
      if (typeof window === "undefined") {
        try {
          const profileResponse = await echolaliaHttp.get<string>(category.link, {
            headers: {
              Accept: "text/html",
            },
          });
          profile = {
            description:
              extractMetaContent(profileResponse.data, "description") ||
              extractMetaContent(profileResponse.data, "og:description"),
          };
        } catch (error) {
          logger.warn("Could not fetch Echolalia poet profile page:", error);
        }
      }

      let sourceGroupName: string | undefined;
      if (category.parent) {
        try {
          const parentResponse = await echolaliaHttp.get<EcholaliaCategory>(
            `${ECHOLALIA_API_BASE_URL}/categories/${category.parent}`,
            {
              params: {
                _fields: "id,name,slug,count,parent,link,description",
              },
            },
          );
          sourceGroupName = parentResponse.data.name;
        } catch (error) {
          logger.warn("Could not fetch Echolalia poet parent category:", error);
        }
      }

      const poet = mapCategoryToPoet(category, profile, sourceGroupName);
      poetCache[slug] = poet;
      poetCache[poet.urlSlug] = poet;
      return poet;
    })();

    poetPromiseCache[slug] = request;
    try {
      return await request;
    } finally {
      delete poetPromiseCache[slug];
    }
  },

  async getPoetImageUrl(categoryId: number): Promise<string | null> {
    const postsResponse = await echolaliaHttp.get<EcholaliaPost[]>(
      `${ECHOLALIA_API_BASE_URL}/posts`,
      {
        params: {
          categories: categoryId,
          per_page: 1,
          _fields: "id,featured_media,link",
        },
      },
    );
    const post = postsResponse.data[0];
    const mediaId = post?.featured_media;

    if (mediaId) {
      try {
        const mediaResponse = await echolaliaHttp.get<any>(
          `${ECHOLALIA_API_BASE_URL}/media/${mediaId}`,
          {
            params: {
              _fields:
                "source_url,media_details.sizes.thumbnail.source_url,media_details.sizes.post-image.source_url,media_details.sizes.detail.source_url",
            },
          },
        );

        return (
          mediaResponse.data?.media_details?.sizes?.detail?.source_url ||
          mediaResponse.data?.media_details?.sizes?.thumbnail?.source_url ||
          mediaResponse.data?.media_details?.sizes?.["post-image"]
            ?.source_url ||
          mediaResponse.data?.source_url ||
          null
        );
      } catch (error) {
        if (
          axios.isAxiosError(error) &&
          (error.response?.status === 401 || error.response?.status === 403)
        ) {
          logger.warn(
            `Echolalia media ${mediaId} is not public; trying post metadata instead`,
          );
        } else {
          throw error;
        }
      }
    }

    if (!post?.link) {
      return null;
    }

    try {
      const postPageResponse = await echolaliaHttp.get<string>(post.link, {
        headers: {
          Accept: "text/html",
        },
      });

      return (
        extractMetaContent(postPageResponse.data, "og:image") ||
        extractMetaContent(postPageResponse.data, "twitter:image") ||
        null
      );
    } catch {
      logger.warn("Could not fetch Echolalia post metadata for poet image");
      return null;
    }
  },

  async getPoemsByPoetSlug(slug: string): Promise<EcholaliaPoemSummary[]> {
    if (poemSummaryCache[slug]) {
      return poemSummaryCache[slug];
    }

    if (poemSummaryPromiseCache[slug]) {
      return await poemSummaryPromiseCache[slug];
    }

    const request = (async () => {
    const poet = await echolaliaApi.getPoetBySlug(slug);
    const firstPageResponse = await echolaliaHttp.get<EcholaliaPost[]>(
      `${ECHOLALIA_API_BASE_URL}/posts`,
      {
        params: {
          categories: poet.rootCatId,
          per_page: 100,
          page: 1,
          _fields: "id,date,slug,link,title,categories",
        },
      },
    );
    const totalPages = Number(
      firstPageResponse.headers["x-wp-totalpages"] ?? 1,
    );
    const remainingPages =
      totalPages > 1
        ? await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) =>
              echolaliaHttp.get<EcholaliaPost[]>(
                `${ECHOLALIA_API_BASE_URL}/posts`,
                {
                  params: {
                    categories: poet.rootCatId,
                    per_page: 100,
                    page: index + 2,
                    _fields: "id,date,slug,link,title,categories",
                  },
                },
              ),
            ),
          )
        : [];

    const summaries = [
      ...firstPageResponse.data,
      ...remainingPages.flatMap((response) => response.data),
    ].map(mapPostToSummary);
      poemSummaryCache[slug] = summaries;
      poemSummaryCache[poet.urlSlug] = summaries;
      return summaries;
    })();

    poemSummaryPromiseCache[slug] = request;
    try {
      return await request;
    } finally {
      delete poemSummaryPromiseCache[slug];
    }
  },

  async getPoemById(id: number): Promise<Poem> {
    const response = await echolaliaHttp.get<EcholaliaPost>(
      `${ECHOLALIA_API_BASE_URL}/posts/${id}`,
      {
        params: {
          _fields: "id,date,slug,link,title,content,excerpt,categories",
        },
      },
    );
    const post = response.data;
    const poetCategoryId = post.categories[0];
    const poetResponse = await echolaliaHttp.get<EcholaliaCategory>(
      `${ECHOLALIA_API_BASE_URL}/categories/${poetCategoryId}`,
      {
        params: {
          _fields: "id,name,slug,count,parent,link,description",
        },
      },
    );
    const poet = mapCategoryToPoet(poetResponse.data);
    const title = decodeHtmlEntities(post.title?.rendered ?? "");
    const plainText = htmlToPlainText(post.content?.rendered ?? "");

    return {
      id: post.id,
      title,
      fullTitle: `${poet.name} » ${title}`,
      poet: poet.name,
      poetNickname: "",
      poetSlug: poet.urlSlug,
      poetImageUrl: poet.imageUrl,
      urlSlug: post.slug,
      fullUrl: post.link,
      plainText,
      htmlText: plainText,
      recitations: [],
      isCustom: true,
      source: "echolalia",
    };
  },

  async getRandomPoemByPoetSlug(slug: string): Promise<Poem> {
    const poems = await echolaliaApi.getPoemsByPoetSlug(slug);
    if (!poems.length) {
      throw new Error("شعری برای این شاعر پیدا نشد");
    }
    const poem = poems[Math.floor(Math.random() * poems.length)];
    return echolaliaApi.getPoemById(poem.id);
  },

  async searchPoems(query: string): Promise<Poem[]> {
    const response = await echolaliaHttp.get<EcholaliaPost[]>(
      `${ECHOLALIA_API_BASE_URL}/posts`,
      {
        params: {
          search: query,
          per_page: 8,
          _fields: "id,date,slug,link,title,content,excerpt,categories",
        },
      },
    );
    return Promise.all(
      response.data.map((post) => echolaliaApi.getPoemById(post.id)),
    );
  },
};

export default echolaliaApi;
