import poetSourceIndex from "@/data/poet-source-index.json";
import ganjoorApi from "@/api/GanjoorApi";
import { customPoetIds } from "@/api/CustomApi";
import { PoetSlug, poetNames } from "@/types/poet";
import type { PoemLibrarySource } from "@/utils/poemLibrary";
import { logger } from "@/utils/logger";
import type { SearchPoetRef } from "@/utils/searchText";

/**
 * A lightweight, instantly available list of every poet the site knows about.
 *
 * The bundled `poet-source-index.json` already ships ids, names, slugs and
 * local avatars for Ganjoor and Echolalia poets, so the search page can render
 * its poet filter and parse "شعر حافظ درمورد عشق" without waiting on the
 * network. Ganjoor nicknames (e.g. «فردوسی» for «ابوالقاسم فردوسی») are merged
 * in lazily from the catalog request and remembered for the session.
 */
export interface DirectoryPoet extends SearchPoetRef {
  key: string;
  source: PoemLibrarySource;
  imageUrl: string | null;
  pinOrder: number;
}

interface IndexEntry {
  source: "ganjoor" | "echolalia";
  id: number;
  name: string;
  localImageUrl?: string;
  pinOrder?: number;
}

interface StoredGanjoorPoet {
  id: number;
  slug: string;
  name: string;
  nickname: string | null;
  published: boolean;
}

const SESSION_KEY = "ganjoorak:ganjoor-poets:v1";
const entries = poetSourceIndex.sourcesBySlug as Record<string, IndexEntry>;

const displayName = (poet: Pick<DirectoryPoet, "name" | "nickname">) =>
  poet.nickname || poet.name;

const sortPoets = (poets: DirectoryPoet[]) =>
  poets.sort((left, right) => {
    const pinDelta =
      (left.pinOrder > 0 ? left.pinOrder : Number.MAX_SAFE_INTEGER) -
      (right.pinOrder > 0 ? right.pinOrder : Number.MAX_SAFE_INTEGER);
    if (pinDelta !== 0) {
      return pinDelta;
    }
    return displayName(left).localeCompare(displayName(right), "fa");
  });

const buildStaticDirectory = (): DirectoryPoet[] => {
  const ganjoor: DirectoryPoet[] = [];
  const echolalia: DirectoryPoet[] = [];

  Object.entries(entries).forEach(([slug, entry]) => {
    if (!entry?.id || !entry.name) {
      return;
    }
    const poet: DirectoryPoet = {
      key: slug,
      id: entry.id,
      name: entry.name,
      nickname: null,
      urlSlug: slug,
      source: entry.source,
      published: true,
      imageUrl: entry.localImageUrl ?? null,
      pinOrder: entry.pinOrder ?? 0,
    };
    (entry.source === "ganjoor" ? ganjoor : echolalia).push(poet);
  });

  const custom: DirectoryPoet[] = Object.values(PoetSlug).map((slug) => ({
    key: slug,
    id: customPoetIds[slug],
    name: poetNames[slug],
    nickname: null,
    urlSlug: slug,
    source: "custom",
    published: true,
    imageUrl: `/images/poets/${slug}.jpeg`,
    pinOrder: 0,
  }));

  return [...sortPoets(ganjoor), ...sortPoets(custom), ...sortPoets(echolalia)];
};

const staticDirectory = buildStaticDirectory();
let enrichedDirectory: DirectoryPoet[] | null = null;
let enrichPromise: Promise<DirectoryPoet[]> | null = null;
const listeners = new Set<() => void>();

const mergeGanjoorPoets = (ganjoorPoets: StoredGanjoorPoet[]) => {
  const bySlug = new Map(ganjoorPoets.map((poet) => [poet.slug, poet]));
  const byId = new Map(ganjoorPoets.map((poet) => [poet.id, poet]));
  const seen = new Set<string>();

  const ganjoor = staticDirectory
    .filter((poet) => poet.source === "ganjoor")
    .flatMap((poet) => {
      const fetched = bySlug.get(poet.urlSlug) ?? byId.get(poet.id);
      if (fetched) {
        seen.add(fetched.slug);
        if (!fetched.published) {
          return [];
        }
        return [{ ...poet, nickname: fetched.nickname || null, name: fetched.name || poet.name }];
      }
      return [poet];
    });

  ganjoorPoets.forEach((poet) => {
    if (seen.has(poet.slug) || !poet.published || !poet.slug) {
      return;
    }
    ganjoor.push({
      key: poet.slug,
      id: poet.id,
      name: poet.name,
      nickname: poet.nickname,
      urlSlug: poet.slug,
      source: "ganjoor",
      published: true,
      imageUrl: null,
      pinOrder: 0,
    });
  });

  return [
    ...sortPoets(ganjoor),
    ...staticDirectory.filter((poet) => poet.source !== "ganjoor"),
  ];
};

const readSession = (): StoredGanjoorPoet[] | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredGanjoorPoet[]) : null;
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
};

const writeSession = (poets: StoredGanjoorPoet[]) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(poets));
  } catch {
    // Quota or privacy mode: the in-memory copy is enough for this session.
  }
};

const applyEnrichment = (poets: StoredGanjoorPoet[]) => {
  enrichedDirectory = mergeGanjoorPoets(poets);
  listeners.forEach((listener) => listener());
  return enrichedDirectory;
};

/** Synchronous: static index, or the enriched list once it's available. */
export const getPoetDirectory = (): DirectoryPoet[] => {
  if (enrichedDirectory) {
    return enrichedDirectory;
  }
  const stored = readSession();
  if (stored) {
    return applyEnrichment(stored);
  }
  return staticDirectory;
};

export const isPoetDirectoryEnriched = () => enrichedDirectory !== null;

/** Fetches Ganjoor nicknames once per session and merges them in. */
export const loadPoetDirectory = (): Promise<DirectoryPoet[]> => {
  if (enrichedDirectory) {
    return Promise.resolve(enrichedDirectory);
  }
  const stored = readSession();
  if (stored) {
    return Promise.resolve(applyEnrichment(stored));
  }
  if (!enrichPromise) {
    enrichPromise = ganjoorApi
      .getPoets()
      .then((poets) => {
        const compact: StoredGanjoorPoet[] = poets.map((poet) => ({
          id: poet.id,
          slug: poet.urlSlug,
          name: poet.name,
          nickname: poet.nickname,
          published: poet.published,
        }));
        writeSession(compact);
        return applyEnrichment(compact);
      })
      .catch((error) => {
        logger.warn("Could not load Ganjoor poets for the directory:", error);
        enrichPromise = null;
        return staticDirectory;
      });
  }
  return enrichPromise;
};

export const subscribePoetDirectory = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Accepts the slug key, or the legacy `source:id` / bare id formats. */
export const findDirectoryPoet = (
  value: string | null | undefined,
  directory: DirectoryPoet[] = getPoetDirectory(),
): DirectoryPoet | null => {
  if (!value) {
    return null;
  }
  const bySlug = directory.find((poet) => poet.key === value);
  if (bySlug) {
    return bySlug;
  }
  const [sourceOrId, maybeId] = value.includes(":")
    ? value.split(":")
    : ["", value];
  const id = Number(maybeId || sourceOrId);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return (
    directory.find(
      (poet) =>
        poet.id === id && (!sourceOrId || poet.source === sourceOrId),
    ) ||
    directory.find((poet) => poet.id === id) ||
    null
  );
};

export const findDirectoryPoetByEcholaliaCategory = (
  categoryIds: number[],
  directory: DirectoryPoet[] = getPoetDirectory(),
) => {
  for (const id of categoryIds) {
    const poet = directory.find(
      (candidate) => candidate.source === "echolalia" && candidate.id === id,
    );
    if (poet) {
      return poet;
    }
  }
  return null;
};

export const getDirectoryPoetDisplayName = displayName;
