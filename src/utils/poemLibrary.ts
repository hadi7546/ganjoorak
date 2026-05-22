import type { Poem } from "@/types/poem";

export type PoemLibrarySource = "ganjoor" | "custom" | "echolalia";

export interface PoemLibraryEntry {
  key: string;
  id: number;
  source: PoemLibrarySource;
  poetSlug: string;
  poetName: string;
  title: string;
  excerpt: string;
  href: string;
  savedAt: number;
}

const FAVORITES_KEY = "ganjoorak:favorites:v1";
const HISTORY_KEY = "ganjoorak:history:v1";
const MAX_FAVORITES = 200;
const MAX_HISTORY = 30;

const getSource = (poem: Poem): PoemLibrarySource =>
  poem.source === "custom" || poem.source === "echolalia" ? poem.source : "ganjoor";

export const getPoemLibraryKey = (poem: Pick<Poem, "id" | "source" | "poetSlug">) => {
  const source = getSource(poem as Poem);
  const slug = poem.poetSlug || "unknown";
  return `${source}:${slug}:${poem.id}`;
};

export const getPoemHref = (poem: Pick<Poem, "id" | "source" | "poetSlug" | "fullUrl">) => {
  const source = getSource(poem as Poem);
  if (source === "ganjoor") {
    return `/poem/${poem.id}`;
  }
  const slug = poem.poetSlug || "";
  return slug ? `/${slug}/${poem.id}` : `/poem/${poem.id}`;
};

const getPoemTitle = (poem: Poem) => {
  const parts = poem.fullTitle
    .split(" » ")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || poem.title || "بدون عنوان";
};

const getPoemExcerpt = (poem: Poem) => {
  const line = (poem.plainText || "")
    .split("\n")
    .map((value) => value.trim())
    .find(Boolean);
  return line || "";
};

export const poemToLibraryEntry = (poem: Poem): PoemLibraryEntry => ({
  key: getPoemLibraryKey(poem),
  id: poem.id,
  source: getSource(poem),
  poetSlug: poem.poetSlug || "",
  poetName: poem.poet || "نامشخص",
  title: getPoemTitle(poem),
  excerpt: getPoemExcerpt(poem),
  href: getPoemHref(poem),
  savedAt: Date.now(),
});

const readEntries = (storageKey: string): PoemLibraryEntry[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is PoemLibraryEntry =>
        Boolean(
          entry &&
            typeof entry === "object" &&
            typeof (entry as PoemLibraryEntry).key === "string" &&
            typeof (entry as PoemLibraryEntry).id === "number" &&
            typeof (entry as PoemLibraryEntry).href === "string",
        ),
    );
  } catch {
    return [];
  }
};

const writeEntries = (storageKey: string, entries: PoemLibraryEntry[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(entries));
};

export const readFavorites = () => readEntries(FAVORITES_KEY);

export const readHistory = () => readEntries(HISTORY_KEY);

export const isFavorite = (key: string) =>
  readFavorites().some((entry) => entry.key === key);

export const toggleFavorite = (poem: Poem) => {
  const entry = poemToLibraryEntry(poem);
  const favorites = readFavorites();
  const existingIndex = favorites.findIndex((item) => item.key === entry.key);

  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1);
    writeEntries(FAVORITES_KEY, favorites);
    return false;
  }

  const next = [entry, ...favorites.filter((item) => item.key !== entry.key)].slice(
    0,
    MAX_FAVORITES,
  );
  writeEntries(FAVORITES_KEY, next);
  return true;
};

export const removeFavorite = (key: string) => {
  writeEntries(
    FAVORITES_KEY,
    readFavorites().filter((entry) => entry.key !== key),
  );
};

export const addToHistory = (poem: Poem) => {
  const entry = poemToLibraryEntry(poem);
  const next = [
    entry,
    ...readHistory().filter((item) => item.key !== entry.key),
  ].slice(0, MAX_HISTORY);
  writeEntries(HISTORY_KEY, next);
};

export const clearHistory = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(HISTORY_KEY);
  }
};
