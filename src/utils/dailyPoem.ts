const TEHRAN_OFFSET_MS = 3.5 * 60 * 60 * 1000;

export const getDailyPoemDateKey = (date = new Date()) => {
  const tehranTime = new Date(date.getTime() + TEHRAN_OFFSET_MS);
  const year = tehranTime.getUTCFullYear();
  const month = String(tehranTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(tehranTime.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** Human-readable Persian (Jalali) date for today's poem, e.g. «۱۴ شهریور». */
export const formatDailyPoemDateLabel = (date = new Date()) => {
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      timeZone: "Asia/Tehran",
      day: "numeric",
      month: "long",
    }).format(date);
  } catch {
    return getDailyPoemDateKey(date);
  }
};

export const hashString = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

export const pickDeterministicIndex = (seed: string, length: number) => {
  if (length <= 0) {
    return 0;
  }

  return hashString(seed) % length;
};
