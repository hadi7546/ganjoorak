import type { Poet } from "@/types/poet";

export const MIN_SEARCH_QUERY_LENGTH = 2;

const DIACRITICS_PATTERN = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const INVISIBLE_PATTERN =
  /[\u200c\u200d\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;
const TATWEEL_AND_HAMZA_PATTERN = /[ـء]/g;
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

const TOPIC_PREFIXES = [
  "در مورد",
  "درمورد",
  "راجع به",
  "با موضوع",
  "درباره",
];

const LEADING_POEM_WORDS = ["شعری", "غزلی", "بیتی", "شعر"];

export type SearchPoetRef = Pick<
  Poet,
  "id" | "name" | "nickname" | "urlSlug" | "source" | "published"
>;

export type SearchIntent = {
  rawQuery: string;
  term: string;
  poetId: number | null;
  poet: SearchPoetRef | null;
};

export type VerseSnippet = {
  matchLine: string;
  contextLine: string | null;
  contextPosition: "before" | "after" | null;
  highlight: { start: number; end: number } | null;
};

const replaceDigits = (value: string, digits: string) =>
  value.replace(new RegExp(`[${digits}]`, "g"), (digit) =>
    String(digits.indexOf(digit)),
  );

export const normalizeSearchText = (value: string) => {
  let text = value.normalize("NFC").trim().toLowerCase();
  text = text.replace(INVISIBLE_PATTERN, "");
  text = text.replace(DIACRITICS_PATTERN, "");
  text = text.replace(TATWEEL_AND_HAMZA_PATTERN, "");
  text = text.replace(/ي/g, "ی").replace(/ى/g, "ی");
  text = text.replace(/ك/g, "ک");
  text = text.replace(/ة/g, "ه").replace(/ۀ/g, "ه");
  text = text.replace(/ؤ/g, "و").replace(/ۆ/g, "و");
  text = text.replace(/[أإآٱ]/g, "ا");
  text = replaceDigits(text, PERSIAN_DIGITS);
  text = replaceDigits(text, ARABIC_DIGITS);
  return text.replace(/\s+/g, " ").trim();
};

const buildNormalizedMapping = (original: string) => {
  const normalizedChars: string[] = [];
  const indexMap: number[] = [];

  for (let index = 0; index < original.length; index += 1) {
    const mapped = normalizeSearchText(original[index]);
    if (!mapped) {
      continue;
    }
    for (const char of mapped) {
      normalizedChars.push(char);
      indexMap.push(index);
    }
  }

  return {
    normalized: normalizedChars.join(""),
    indexMap,
  };
};

export const findNormalizedMatchRange = (
  haystack: string,
  needle: string,
): { start: number; end: number } | null => {
  const normalizedNeedle = normalizeSearchText(needle);
  if (!normalizedNeedle) {
    return null;
  }

  const { normalized, indexMap } = buildNormalizedMapping(haystack);
  const at = normalized.indexOf(normalizedNeedle);
  if (at < 0) {
    return null;
  }

  const start = indexMap[at];
  const last = indexMap[at + normalizedNeedle.length - 1];
  if (start == null || last == null) {
    return null;
  }

  return { start, end: last + 1 };
};

const containsAsPhrase = (haystack: string, needle: string) => {
  if (!needle) {
    return false;
  }

  let from = 0;
  while (from <= haystack.length) {
    const index = haystack.indexOf(needle, from);
    if (index < 0) {
      return false;
    }
    const beforeOk = index === 0 || haystack[index - 1] === " ";
    const afterIndex = index + needle.length;
    const afterOk =
      afterIndex === haystack.length || haystack[afterIndex] === " ";
    if (beforeOk && afterOk) {
      return true;
    }
    from = index + 1;
  }

  return false;
};

const removePhrase = (haystack: string, needle: string) => {
  if (!needle) {
    return haystack;
  }

  const parts = haystack.split(" ").filter(Boolean);
  const needleParts = needle.split(" ").filter(Boolean);
  if (needleParts.length === 0) {
    return haystack;
  }

  for (let index = 0; index <= parts.length - needleParts.length; index += 1) {
    const slice = parts.slice(index, index + needleParts.length).join(" ");
    if (slice === needle) {
      return [...parts.slice(0, index), ...parts.slice(index + needleParts.length)]
        .join(" ")
        .trim();
    }
  }

  return haystack;
};

const stripLeadingTokens = (text: string, tokens: string[]) => {
  let remaining = text;
  let changed = true;
  let stripped = false;

  while (changed && remaining) {
    changed = false;
    for (const token of tokens) {
      const normalizedToken = normalizeSearchText(token);
      if (!normalizedToken) {
        continue;
      }
      if (
        remaining === normalizedToken ||
        remaining.startsWith(`${normalizedToken} `)
      ) {
        remaining = remaining.slice(normalizedToken.length).trim();
        changed = true;
        stripped = true;
        break;
      }
    }
  }

  return { text: remaining, stripped };
};

const poetAliases = (poet: SearchPoetRef) => {
  const aliases = new Set<string>();
  const names = [poet.nickname, poet.name].filter(Boolean) as string[];

  names.forEach((name) => {
    const normalized = normalizeSearchText(name);
    if (normalized.length >= MIN_SEARCH_QUERY_LENGTH) {
      aliases.add(normalized);
    }

    const firstWord = normalized.split(" ")[0];
    if (firstWord && firstWord.length >= 3) {
      aliases.add(firstWord);
    }
  });

  return Array.from(aliases);
};

export const parseSearchIntent = (
  query: string,
  poets: SearchPoetRef[] = [],
): SearchIntent => {
  const strippedPoemWords = stripLeadingTokens(
    normalizeSearchText(query),
    LEADING_POEM_WORDS,
  );
  let text = stripLeadingTokens(strippedPoemWords.text, ["از"]).text;

  const aliasEntries = poets
    .filter((poet) => poet.published !== false)
    .flatMap((poet) =>
      poetAliases(poet).map((alias) => ({ poet, alias })),
    )
    .sort((left, right) => right.alias.length - left.alias.length);

  let poet: SearchPoetRef | null = null;
  for (const entry of aliasEntries) {
    if (containsAsPhrase(text, entry.alias)) {
      poet = entry.poet;
      text = removePhrase(text, entry.alias);
      break;
    }
  }

  text = stripLeadingTokens(text, TOPIC_PREFIXES).text;

  let term = text;
  if (term.length < MIN_SEARCH_QUERY_LENGTH) {
    term = poet
      ? poetAliases(poet)[0] || normalizeSearchText(query)
      : normalizeSearchText(query);
  }

  return {
    rawQuery: query,
    term,
    poetId: poet?.id && poet.id > 0 ? poet.id : null,
    poet,
  };
};

export const splitPoemLines = (plainText: string) =>
  plainText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

export const getVerseSnippet = (
  plainText: string,
  query: string,
): VerseSnippet => {
  const lines = splitPoemLines(plainText);
  const needle = normalizeSearchText(query);

  if (lines.length === 0) {
    return {
      matchLine: "",
      contextLine: null,
      contextPosition: null,
      highlight: null,
    };
  }

  const matchIndex =
    needle.length >= MIN_SEARCH_QUERY_LENGTH
      ? lines.findIndex((line) => normalizeSearchText(line).includes(needle))
      : -1;
  const index = matchIndex >= 0 ? matchIndex : 0;
  const matchLine = lines[index];
  const nextLine = lines[index + 1] ?? null;
  const previousLine = index > 0 ? lines[index - 1] : null;

  return {
    matchLine,
    contextLine: nextLine ?? previousLine,
    contextPosition: nextLine ? "after" : previousLine ? "before" : null,
    highlight: needle
      ? findNormalizedMatchRange(matchLine, needle)
      : null,
  };
};

export const isSearchQueryLongEnough = (value: string) =>
  normalizeSearchText(value).length >= MIN_SEARCH_QUERY_LENGTH;
