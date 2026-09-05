import customApi from "@/api/CustomApi";
import { PoetSlug, poetNames } from "@/types/poet";
import { normalizeSearchText } from "@/utils/searchText";

/**
 * The bundled poets (`/api/poet/{slug}`) are small enough to keep in memory,
 * so they are fetched once per session and pre-normalized. Searching them is
 * then a synchronous `includes` over a few hundred strings, which keeps local
 * results instant while typing instead of re-normalizing every poem per key.
 */
export interface IndexedLocalPoem {
  slug: PoetSlug;
  id: number;
  title: string;
  collection: string | null;
  text: string;
  poetName: string;
  haystack: string;
}

let index: IndexedLocalPoem[] | null = null;
let indexPromise: Promise<IndexedLocalPoem[]> | null = null;

const indexPoet = (slug: PoetSlug, data: any): IndexedLocalPoem[] => {
  const poetName: string = data?.poet || poetNames[slug] || slug;
  const poems: any[] = Array.isArray(data?.poems) ? data.poems : [];

  return poems.flatMap((poem) => {
    if (!poem || typeof poem.id !== "number") {
      return [];
    }
    const collection =
      typeof poem.collection === "string" && poem.collection.trim()
        ? poem.collection.trim()
        : null;
    const text = String(poem.text ?? "");
    const title: string = poem.title || `شعر ${poem.id}`;
    return [
      {
        slug,
        id: poem.id,
        title,
        collection,
        text,
        poetName,
        haystack: normalizeSearchText(
          [title, text, collection, poetName].filter(Boolean).join(" "),
        ),
      },
    ];
  });
};

/** Synchronous access; `null` until {@link loadLocalSearchIndex} resolves. */
export const getLocalSearchIndex = () => index;

export const loadLocalSearchIndex = (): Promise<IndexedLocalPoem[]> => {
  if (index) {
    return Promise.resolve(index);
  }
  if (!indexPromise) {
    indexPromise = Promise.allSettled(
      Object.values(PoetSlug).map(async (slug) => ({
        slug,
        data: await customApi._getPoetData(slug),
      })),
    ).then((results) => {
      const built = results.flatMap((result) =>
        result.status === "fulfilled"
          ? indexPoet(result.value.slug, result.value.data)
          : [],
      );
      const complete = results.every((result) => result.status === "fulfilled");
      if (complete) {
        index = built;
      } else {
        // Allow a later call to retry the poets that failed.
        indexPromise = null;
      }
      return built;
    });
  }
  return indexPromise;
};

export const searchLocalIndex = (
  poems: IndexedLocalPoem[],
  normalizedQuery: string,
  slug?: PoetSlug | null,
) => {
  if (!normalizedQuery) {
    return [];
  }
  return poems.filter(
    (poem) =>
      (!slug || poem.slug === slug) && poem.haystack.includes(normalizedQuery),
  );
};
