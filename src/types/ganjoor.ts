import type { Poet } from "@/types/poet";

export interface GanjoorPoemSummary {
  id: number;
  title: string;
  urlSlug: string | null;
  fullUrl: string | null;
  excerpt: string | null;
  mainSections: unknown;
}

export interface GanjoorCategoryReference {
  id: number;
  title: string;
  urlSlug: string | null;
  fullUrl: string;
  tableOfContentsStyle: number | null;
  catType: number | null;
  description: string | null;
  descriptionHtml: string | null;
  published: boolean;
  bookName: string | null;
}

export interface GanjoorCategory extends GanjoorCategoryReference {
  children: GanjoorCategory[];
  poems: GanjoorPoemSummary[];
  ancestors: GanjoorCategoryReference[];
  next: GanjoorCategoryReference | null;
  previous: GanjoorCategoryReference | null;
  sumUpSubsGeoLocations?: boolean;
  mapName?: string | null;
  rImageId?: string | null;
}

export interface GanjoorPoetCatalog {
  poet: Poet;
  category: GanjoorCategory;
}

export interface GanjoorPoemSearchResult {
  id: number;
  title: string;
  fullTitle: string;
  fullUrl: string;
  plainText: string;
  poemSummary: string | null;
  poetName: string;
  poetSlug: string;
  bookTitle: string | null;
  bookUrl: string | null;
}

export interface GanjoorGeoLocation {
  id: number;
  name: string | null;
  latitude: number;
  longitude: number;
  machineGenerated?: boolean;
}

export interface GanjoorQuotedPoem {
  id: string;
  poemId: number;
  relatedPoemId: number | null;
  cachedRelatedPoemPoetName: string | null;
  cachedRelatedPoemFullTitle: string | null;
  cachedRelatedPoemFullUrl: string | null;
  coupletVerse1: string | null;
  coupletVerse2: string | null;
  poem?: {
    id: number;
    title?: string;
    fullTitle?: string;
    fullUrl?: string;
    plainText?: string;
  } | null;
}

export interface PoemGeoDateTag {
  id: number;
  poemId: number;
  coupletIndex: number;
  locationId: number | null;
  location: GanjoorGeoLocation | null;
}
