import { normalizeSearchText } from "@/utils/searchText";

const STORAGE_KEY = "ganjoorak:recent-searches:v1";
export const MAX_RECENT_SEARCHES = 8;

const read = (): string[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && !!item)
      : [];
  } catch {
    return [];
  }
};

const write = (items: string[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Private mode / quota: recents are a convenience, not a requirement.
  }
};

export const readRecentSearches = read;

/** Moves `query` to the front, replacing any entry that normalizes the same. */
export const rememberRecentSearch = (query: string) => {
  const trimmed = query.trim();
  const normalized = normalizeSearchText(trimmed);
  if (!normalized) {
    return read();
  }
  const next = [
    trimmed,
    ...read().filter((item) => normalizeSearchText(item) !== normalized),
  ].slice(0, MAX_RECENT_SEARCHES);
  write(next);
  return next;
};

export const forgetRecentSearch = (query: string) => {
  const next = read().filter((item) => item !== query);
  write(next);
  return next;
};

export const clearRecentSearches = () => {
  write([]);
  return [] as string[];
};
