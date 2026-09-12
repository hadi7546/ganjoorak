import ganjoorApi from "@/api/GanjoorApi";
import { getInterestByKey, type PoemInterest } from "@/data/interests";
import type { Poem } from "@/types/poem";
import { logger } from "@/utils/logger";

const SEMANTIC_TOP_K = 50;
const POOL_REFILL_THRESHOLD = 4;

interface InterestPool {
  pendingIds: number[];
  servedIds: Set<number>;
  usedQueryIndexes: Set<number>;
  inFlight: Promise<void> | null;
}

const pools = new Map<string, InterestPool>();

const getPool = (key: string): InterestPool => {
  const existing = pools.get(key);
  if (existing) {
    return existing;
  }

  const created: InterestPool = {
    pendingIds: [],
    servedIds: new Set<number>(),
    usedQueryIndexes: new Set<number>(),
    inFlight: null,
  };
  pools.set(key, created);
  return created;
};

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const pickQueryIndex = (interest: PoemInterest, pool: InterestPool) => {
  if (pool.usedQueryIndexes.size >= interest.queries.length) {
    pool.usedQueryIndexes.clear();
  }

  const available = interest.queries
    .map((_, index) => index)
    .filter((index) => !pool.usedQueryIndexes.has(index));

  const chosen = available[Math.floor(Math.random() * available.length)] ?? 0;
  pool.usedQueryIndexes.add(chosen);
  return chosen;
};

const refillPool = async (interest: PoemInterest, pool: InterestPool) => {
  if (pool.inFlight) {
    return pool.inFlight;
  }

  const task = (async () => {
    const queryIndex = pickQueryIndex(interest, pool);
    const query = interest.queries[queryIndex];

    try {
      const response = await ganjoorApi.searchPoemsSemantic(query, {
        topK: SEMANTIC_TOP_K,
        disableScopeDetection: true,
      });

      const pendingSet = new Set(pool.pendingIds);
      const freshIds = response.results
        .map((result) => Number(result.poemId))
        .filter(
          (poemId) =>
            Number.isFinite(poemId) &&
            poemId > 0 &&
            !pool.servedIds.has(poemId) &&
            !pendingSet.has(poemId),
        );

      pool.pendingIds = [...pool.pendingIds, ...shuffle(freshIds)];
    } catch (error) {
      logger.error(`Failed to load interest pool for "${interest.key}":`, error);
      throw error;
    }
  })();

  pool.inFlight = task.finally(() => {
    pool.inFlight = null;
  });

  return pool.inFlight;
};

export const fetchInterestPoem = async (interestKey: string): Promise<Poem> => {
  const interest = getInterestByKey(interestKey);
  if (!interest) {
    throw new Error(`Unknown interest: ${interestKey}`);
  }

  const pool = getPool(interestKey);

  if (pool.pendingIds.length === 0) {
    await refillPool(interest, pool);
  }

  if (pool.pendingIds.length === 0) {
    pool.servedIds.clear();
    await refillPool(interest, pool);
  }

  const poemId = pool.pendingIds.shift();
  if (!poemId) {
    throw new Error(`No poems available for interest: ${interestKey}`);
  }

  pool.servedIds.add(poemId);

  if (pool.pendingIds.length <= POOL_REFILL_THRESHOLD && !pool.inFlight) {
    refillPool(interest, pool).catch(() => undefined);
  }

  return ganjoorApi.getPoemById(poemId);
};

export const primeInterestPool = (interestKey: string) => {
  const interest = getInterestByKey(interestKey);
  if (!interest) {
    return;
  }

  const pool = getPool(interestKey);
  if (pool.pendingIds.length > 0 || pool.inFlight) {
    return;
  }

  refillPool(interest, pool).catch(() => undefined);
};
