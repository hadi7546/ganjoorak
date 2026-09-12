import ganjoorApi from "@/api/GanjoorApi";
import { getInterestByKey, type PoemInterest } from "@/data/interests";
import type { Poem } from "@/types/poem";
import { logger } from "@/utils/logger";

const SEMANTIC_TOP_K = 50;
const POOL_REFILL_THRESHOLD = 4;
const QUALITY_SCORE_RATIO = 0.88;
const MIN_KEPT_PER_QUERY = 10;
const MAX_POEMS_PER_POET = 2;
const MAX_REFILL_ATTEMPTS = 3;

interface PoolEntry {
  poemId: number;
  poetSlug: string;
  score: number;
}

interface InterestPool {
  pending: PoolEntry[];
  servedIds: Set<number>;
  usedQueryIndexes: Set<number>;
  failedQueryIndexes: Set<number>;
  lastPoetSlug: string | null;
  inFlight: Promise<void> | null;
}

const pools = new Map<string, InterestPool>();

const getPool = (key: string): InterestPool => {
  const existing = pools.get(key);
  if (existing) {
    return existing;
  }

  const created: InterestPool = {
    pending: [],
    servedIds: new Set<number>(),
    usedQueryIndexes: new Set<number>(),
    failedQueryIndexes: new Set<number>(),
    lastPoetSlug: null,
    inFlight: null,
  };
  pools.set(key, created);
  return created;
};

const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const pickQueryIndex = (interest: PoemInterest, pool: InterestPool) => {
  const total = interest.queries.length;

  if (pool.failedQueryIndexes.size >= total) {
    pool.failedQueryIndexes.clear();
  }

  const usable = interest.queries
    .map((_, index) => index)
    .filter((index) => !pool.failedQueryIndexes.has(index));

  if (pool.usedQueryIndexes.size >= usable.length) {
    pool.usedQueryIndexes.clear();
  }

  const available = usable.filter((index) => !pool.usedQueryIndexes.has(index));
  const candidates = available.length > 0 ? available : usable;
  const chosen =
    candidates[Math.floor(Math.random() * candidates.length)] ?? 0;

  pool.usedQueryIndexes.add(chosen);
  return chosen;
};

const selectQualityEntries = (
  results: Array<{ poemId: number; poetSlug: string; score: number }>,
): PoolEntry[] => {
  const usable = results
    .map((result) => ({
      poemId: Number(result.poemId),
      poetSlug: result.poetSlug || "",
      score: Number(result.score) || 0,
    }))
    .filter((entry) => Number.isFinite(entry.poemId) && entry.poemId > 0)
    .sort((a, b) => b.score - a.score);

  if (usable.length === 0) {
    return [];
  }

  const topScore = usable[0].score;
  const floor = topScore * QUALITY_SCORE_RATIO;
  const aboveFloor = usable.filter((entry) => entry.score >= floor);
  const kept =
    aboveFloor.length >= MIN_KEPT_PER_QUERY
      ? aboveFloor
      : usable.slice(0, MIN_KEPT_PER_QUERY);

  const perPoet = new Map<string, number>();
  return kept.filter((entry) => {
    const seen = perPoet.get(entry.poetSlug) ?? 0;
    if (entry.poetSlug && seen >= MAX_POEMS_PER_POET) {
      return false;
    }
    perPoet.set(entry.poetSlug, seen + 1);
    return true;
  });
};

const refillPool = async (interest: PoemInterest, pool: InterestPool) => {
  if (pool.inFlight) {
    return pool.inFlight;
  }

  const task = (async () => {
    for (let attempt = 0; attempt < MAX_REFILL_ATTEMPTS; attempt += 1) {
      const queryIndex = pickQueryIndex(interest, pool);
      const query = interest.queries[queryIndex];

      try {
        const response = await ganjoorApi.searchPoemsSemantic(query, {
          topK: SEMANTIC_TOP_K,
          disableScopeDetection: true,
        });

        const pendingIds = new Set(pool.pending.map((entry) => entry.poemId));
        const fresh = selectQualityEntries(response.results).filter(
          (entry) =>
            !pool.servedIds.has(entry.poemId) && !pendingIds.has(entry.poemId),
        );

        if (fresh.length > 0) {
          pool.pending = [...pool.pending, ...shuffle(fresh)];
          return;
        }
      } catch (error) {
        pool.failedQueryIndexes.add(queryIndex);
        logger.error(
          `Interest query failed for "${interest.key}" (${query}):`,
          error,
        );
      }
    }
  })();

  pool.inFlight = task.finally(() => {
    pool.inFlight = null;
  });

  return pool.inFlight;
};

const takeEntry = (pool: InterestPool, preferredPoetSlugs: Set<string>) => {
  const differentPoet = (entry: PoolEntry) =>
    !pool.lastPoetSlug || entry.poetSlug !== pool.lastPoetSlug;

  const order = [
    (entry: PoolEntry) =>
      preferredPoetSlugs.has(entry.poetSlug) && differentPoet(entry),
    differentPoet,
    () => true,
  ];

  for (const matches of order) {
    const index = pool.pending.findIndex(matches);
    if (index >= 0) {
      return pool.pending.splice(index, 1)[0];
    }
  }

  return undefined;
};

export const fetchInterestPoem = async (
  interestKey: string,
  preferredPoetSlugs: string[] = [],
): Promise<Poem> => {
  const interest = getInterestByKey(interestKey);
  if (!interest) {
    throw new Error(`Unknown interest: ${interestKey}`);
  }

  const pool = getPool(interestKey);

  if (pool.pending.length === 0) {
    await refillPool(interest, pool);
  }

  if (pool.pending.length === 0) {
    pool.servedIds.clear();
    await refillPool(interest, pool);
  }

  const entry = takeEntry(pool, new Set(preferredPoetSlugs));
  if (!entry) {
    throw new Error(`No poems available for interest: ${interestKey}`);
  }

  pool.servedIds.add(entry.poemId);
  pool.lastPoetSlug = entry.poetSlug || null;

  if (pool.pending.length <= POOL_REFILL_THRESHOLD && !pool.inFlight) {
    refillPool(interest, pool).catch(() => undefined);
  }

  return ganjoorApi.getPoemById(entry.poemId);
};

export const primeInterestPool = (interestKey: string) => {
  const interest = getInterestByKey(interestKey);
  if (!interest) {
    return;
  }

  const pool = getPool(interestKey);
  if (pool.pending.length > 0 || pool.inFlight) {
    return;
  }

  refillPool(interest, pool).catch(() => undefined);
};
