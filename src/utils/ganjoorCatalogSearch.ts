import type {
  GanjoorCategory,
  GanjoorPoemSearchResult,
  GanjoorPoemSummary,
  GanjoorPoetCatalog,
} from "@/types/ganjoor";
import type { Poet } from "@/types/poet";
import {
  buildPoemNumberTitleCandidates,
  normalizeSearchText,
  parsePoemNumberQuery,
} from "@/utils/searchText";

const KIND_CATEGORY_PATTERNS: Record<string, RegExp> = {
  غزل: /غزل/,
  غزلیه: /غزل/,
  قصیده: /قصیده|قصاید/,
  رباعی: /رباعی|رباعیات/,
  مثنوی: /مثنوی/,
  قطعه: /قطعه|قطعات/,
  گیتی: /گیتی/,
};

const collectCategoryNodes = (category: GanjoorCategory): GanjoorCategory[] => {
  const nodes = [category];
  for (const child of category.children ?? []) {
    nodes.push(...collectCategoryNodes(child));
  }
  return nodes;
};

const mapSummaryToSearchResult = (
  poem: GanjoorPoemSummary,
  poet: Poet,
  bookTitle: string | null,
): GanjoorPoemSearchResult => {
  const poetSlug =
    poet.urlSlug || poem.fullUrl?.split("/").filter(Boolean)[0] || "";
  const fullUrl = poem.fullUrl?.startsWith("/")
    ? poem.fullUrl
    : `/${poem.fullUrl ?? ""}`;
  const excerpt = poem.excerpt?.trim() || "";

  return {
    id: poem.id,
    title: poem.title,
    fullTitle: [poet.nickname || poet.name, bookTitle, poem.title]
      .filter(Boolean)
      .join(" » "),
    fullUrl,
    plainText: excerpt,
    poemSummary: excerpt || null,
    poetName: poet.nickname || poet.name,
    poetSlug,
    bookTitle,
    bookUrl: bookTitle ? `/${poetSlug}` : null,
  };
};

const poemMatchesQuery = (
  poem: GanjoorPoemSummary,
  normalizedQuery: string,
  titleCandidates: string[],
) => {
  const normalizedTitle = normalizeSearchText(poem.title);
  if (normalizedTitle.includes(normalizedQuery)) {
    return true;
  }

  return titleCandidates.some((candidate) => {
    const normalizedCandidate = normalizeSearchText(candidate);
    return (
      normalizedTitle.includes(normalizedCandidate) ||
      normalizedCandidate.includes(normalizedTitle)
    );
  });
};

const findPoemByNumberInCategory = (
  poems: GanjoorPoemSummary[],
  number: number,
) => {
  const persianNumber = number.toLocaleString("fa-IR");
  const patterns = [
    new RegExp(`شماره[ٔه]?\\s*${number}(?:\\b|$)`),
    new RegExp(`شماره[ٔه]?\\s*${persianNumber}(?:\\b|$)`),
    new RegExp(`\\b${number}\\b`),
    new RegExp(`\\b${persianNumber}\\b`),
  ];

  const byTitle = poems.find((poem) => {
    const title = normalizeSearchText(poem.title);
    return patterns.some((pattern) => pattern.test(title));
  });
  if (byTitle) {
    return byTitle;
  }

  const nonMetaPoems = poems.filter((poem) => {
    const title = normalizeSearchText(poem.title);
    return !/(مقدمه|دیباچه|پیشگفتار|خاتمه)/.test(title);
  });
  const ordered = nonMetaPoems.length > 0 ? nonMetaPoems : poems;
  return ordered[number - 1];
};

export const searchGanjoorCatalogPoems = (
  catalog: GanjoorPoetCatalog,
  poemsByCategoryId: Record<number, GanjoorPoemSummary[]>,
  query: string,
  limit = 12,
): GanjoorPoemSearchResult[] => {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2) {
    return [];
  }

  const parsedNumber = parsePoemNumberQuery(query);
  const titleCandidates = parsedNumber
    ? buildPoemNumberTitleCandidates(parsedNumber)
    : [];
  const results: GanjoorPoemSearchResult[] = [];
  const seenIds = new Set<number>();

  const pushPoem = (
    poem: GanjoorPoemSummary,
    categoryTitle: string | null,
  ) => {
    if (!poem.id || seenIds.has(poem.id)) {
      return;
    }
    seenIds.add(poem.id);
    results.push(mapSummaryToSearchResult(poem, catalog.poet, categoryTitle));
  };

  for (const category of collectCategoryNodes(catalog.category)) {
    const poems = poemsByCategoryId[category.id] ?? category.poems ?? [];
    if (poems.length === 0) {
      continue;
    }

    if (parsedNumber) {
      const kindPattern = KIND_CATEGORY_PATTERNS[parsedNumber.kind];
      if (kindPattern && !kindPattern.test(category.title)) {
        continue;
      }

      const numberedPoem = findPoemByNumberInCategory(poems, parsedNumber.number);
      if (numberedPoem) {
        pushPoem(numberedPoem, category.title);
      }
    }

    for (const poem of poems) {
      if (results.length >= limit) {
        return results;
      }
      if (poemMatchesQuery(poem, normalizedQuery, titleCandidates)) {
        pushPoem(poem, category.title);
      }
    }

    if (results.length >= limit) {
      break;
    }
  }

  return results.slice(0, limit);
};

export const findLikelyNumberedPoemCategories = (
  catalog: GanjoorPoetCatalog,
  parsed: { kind: string },
): GanjoorCategory[] => {
  const pattern =
    KIND_CATEGORY_PATTERNS[parsed.kind] || KIND_CATEGORY_PATTERNS.غزل;
  return collectCategoryNodes(catalog.category).filter((category) =>
    pattern.test(category.title),
  );
};
