import poetSourceIndex from '@/data/poet-source-index.json';
import { createPoet, type Century, type Poet } from '@/types/poet';

type StaticPoetSource = 'ganjoor' | 'echolalia';

type StaticPoetEntry = {
  source: StaticPoetSource;
  id?: number | null;
  name?: string;
  sourceGroupName?: string;
};

const sourcesBySlug = poetSourceIndex.sourcesBySlug as Record<
  string,
  StaticPoetEntry | undefined
>;

const getGanjoorImageUrl = (slug: string) =>
  `/api/ganjoor/poet/image/${slug}.gif`;

const staticPoetToPoet = (slug: string, entry: StaticPoetEntry): Poet => {
  const source = entry.source;
  const name = entry.name || slug;

  return createPoet({
    id: entry.id ?? 0,
    name,
    nickname: null,
    fullUrl: source === 'echolalia' ? `echolalia/${slug}` : slug,
    urlSlug: slug,
    published: true,
    imageUrl: source === 'echolalia' ? '' : getGanjoorImageUrl(slug),
    source,
    sourceGroupName:
      source === 'echolalia'
        ? entry.sourceGroupName || 'دیگر شاعران'
        : 'گنجور',
  });
};

export const getStaticPoetsBySource = (source: StaticPoetSource): Poet[] =>
  Object.entries(sourcesBySlug)
    .filter(([, entry]) => entry?.source === source)
    .map(([slug, entry]) => staticPoetToPoet(slug, entry as StaticPoetEntry))
    .sort((a, b) => (a.nickname || a.name).localeCompare(b.nickname || b.name, 'fa'));

export const getStaticGanjoorCentury = (): Century => ({
  id: 1,
  name: 'شاعران گنجور',
  halfCenturyOrder: 0,
  startYear: 0,
  endYear: 0,
  showInTimeLine: false,
  poets: getStaticPoetsBySource('ganjoor'),
});

export const getStaticGanjoorCenturies = (): Century[] => {
  const century = getStaticGanjoorCentury();
  return century.poets.length > 0 ? [century] : [];
};
