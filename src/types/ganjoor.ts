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
