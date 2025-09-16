export interface Poet {
  id: number;
  name: string;
  description: string | null;
  fullUrl: string;
  urlSlug: string;
  rootCatId: number;
  nickname: string | null;
  published: boolean;
  imageUrl: string;
  birthYearInLHijri: number | null;
  validBirthDate: boolean;
  deathYearInLHijri: number | null;
  validDeathDate: boolean;
  pinOrder: number;
  birthPlace: string | null;
  birthPlaceLatitude: number | null;
  birthPlaceLongitude: number | null;
  deathPlace: string | null;
  deathPlaceLatitude: number | null;
  deathPlaceLongitude: number | null;
}

export interface Century {
  id: number;
  name: string;
  halfCenturyOrder: number;
  startYear: number;
  endYear: number;
  showInTimeLine: boolean;
  poets: Poet[];
}

export enum PoetSlug {
  RAHMANI = "rahmani",
  FARROKHZAD = "farrokhzad",
}

export const poetNames: Record<PoetSlug, string> = {
  [PoetSlug.RAHMANI]: "نصرت رحمانی",
  [PoetSlug.FARROKHZAD]: "فروغ فرخزاد",
};

export const poetSlugs: Record<string, PoetSlug> = {
  rahmani: PoetSlug.RAHMANI,
  farrokhzad: PoetSlug.FARROKHZAD,
};

export function isValidPoetSlug(slug: string): slug is PoetSlug {
  return Object.values(PoetSlug).includes(slug as PoetSlug);
}

export function createPoet(data: Partial<Poet>): Poet {
  return {
    id: data.id ?? 0,
    name: data.name ?? "",
    description: data.description ?? null,
    fullUrl: data.fullUrl ?? "",
    urlSlug: data.urlSlug ?? "",
    rootCatId: data.rootCatId ?? 0,
    nickname: data.nickname ?? null,
    published: data.published ?? false,
    imageUrl: data.imageUrl ?? "",
    birthYearInLHijri: data.birthYearInLHijri ?? null,
    validBirthDate: data.validBirthDate ?? false,
    deathYearInLHijri: data.deathYearInLHijri ?? null,
    validDeathDate: data.validDeathDate ?? false,
    pinOrder: data.pinOrder ?? 0,
    birthPlace: data.birthPlace ?? null,
    birthPlaceLatitude: data.birthPlaceLatitude ?? null,
    birthPlaceLongitude: data.birthPlaceLongitude ?? null,
    deathPlace: data.deathPlace ?? null,
    deathPlaceLatitude: data.deathPlaceLatitude ?? null,
    deathPlaceLongitude: data.deathPlaceLongitude ?? null,
  };
}
