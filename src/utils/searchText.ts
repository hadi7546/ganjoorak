const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Persian / Arabic-Indic digits → ASCII for matching and API fallbacks. */
export const normalizeDigits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));

const ORDINAL_WORDS: Record<string, number> = {
  یک: 1,
  اول: 1,
  دو: 2,
  دوم: 2,
  سه: 3,
  سوم: 3,
  چهار: 4,
  چهارم: 4,
  پنج: 5,
  پنجم: 5,
  شش: 6,
  ششم: 6,
  هفت: 7,
  هفتم: 7,
  هشت: 8,
  هشتم: 8,
  نه: 9,
  نهم: 9,
  ده: 10,
  دهم: 10,
};

export const normalizeSearchText = (value: string) =>
  normalizeDigits(value)
    .trim()
    .replace(/\u200c/g, "")
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/[ةۀ]/g, "ه")
    .replace(/هٔ/g, "ه")
    .replace(/أ|إ|آ/g, "ا")
    .replace(/\s+/g, " ")
    .toLowerCase();

export interface ParsedPoemNumberQuery {
  kind: string;
  number: number;
}

/**
 * Detects queries such as «غزل شماره ۵» that refer to a numbered poem in a divan.
 */
export const parsePoemNumberQuery = (
  query: string,
): ParsedPoemNumberQuery | null => {
  const normalized = normalizeSearchText(query);
  const match = normalized.match(
    /^(?:(غزل|غزلیه|قصیده|رباعی|مثنوی|قطعه|گیتی)\s+)?(?:شماره\s+)?(\d+|یک|اول|دو|دوم|سه|سوم|چهار|چهارم|پنج|پنجم|شش|ششم|هفت|هفتم|هشت|هشتم|نه|نهم|ده|دهم)$/,
  );

  if (!match) {
    return null;
  }

  if (!match[1] && !normalized.includes("شماره")) {
    return null;
  }

  const kind = match[1] || "غزل";
  const rawNumber = match[2];
  const number =
    /^\d+$/.test(rawNumber) ? Number(rawNumber) : ORDINAL_WORDS[rawNumber];

  if (!number || number < 1 || number > 9999) {
    return null;
  }

  return { kind, number };
};

export const buildPoemNumberTitleCandidates = ({
  kind,
  number,
}: ParsedPoemNumberQuery): string[] => {
  const persianNumber = number.toLocaleString("fa-IR");
  const baseKind = kind === "غزلیه" ? "غزل" : kind;

  return [
    `${baseKind} شماره ${number}`,
    `${baseKind} شماره ${persianNumber}`,
    `${baseKind} شمارهٔ ${number}`,
    `${baseKind} شمارهٔ ${persianNumber}`,
    `${baseKind} ${number}`,
    `${baseKind} ${persianNumber}`,
    `شماره ${number}`,
    `شماره ${persianNumber}`,
    `شمارهٔ ${number}`,
    `شمارهٔ ${persianNumber}`,
  ];
};

export const getSearchTermVariants = (term: string): string[] => {
  const trimmed = term.trim();
  if (!trimmed) {
    return [];
  }

  const variants = new Set<string>([trimmed]);
  const asciiDigits = normalizeDigits(trimmed);
  if (asciiDigits !== trimmed) {
    variants.add(asciiDigits);
  }

  const parsed = parsePoemNumberQuery(trimmed);
  if (parsed) {
    buildPoemNumberTitleCandidates(parsed).forEach((candidate) => {
      variants.add(candidate);
    });
  }

  return Array.from(variants);
};
