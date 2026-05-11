import poetSourceIndex from "@/data/poet-source-index.json";

type PoetImageSource = "ganjoor" | "echolalia";

interface PoetImageIndexEntry {
  source: PoetImageSource;
  localImageUrl?: string;
}

const sourcesBySlug = poetSourceIndex.sourcesBySlug as Record<
  string,
  PoetImageIndexEntry | undefined
>;

export const getIndexedPoetImageUrl = (
  source: PoetImageSource,
  slug?: string | null,
) => {
  if (!slug) {
    return null;
  }

  const entry = sourcesBySlug[slug];
  if (entry?.source !== source || !entry.localImageUrl) {
    return null;
  }

  return entry.localImageUrl;
};
