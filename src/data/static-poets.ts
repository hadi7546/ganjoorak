import poetSourceIndex from '@/data/poet-source-index.json';
import { createPoet, type Century, type Poet } from '@/types/poet';

type StaticPoetSource = 'ganjoor' | 'echolalia';

type StaticPoetEntry = {
  source: StaticPoetSource;
  id?: number | null;
  name?: string;
  sourceGroupName?: string;
  localImageUrl?: string;
  centuryId?: number | null;
  centuryName?: string;
  centuryHalfCenturyOrder?: number;
  centuryStartYear?: number;
  centuryEndYear?: number;
  centuryShowInTimeLine?: boolean;
  birthYearInLHijri?: number | null;
  validBirthDate?: boolean;
  deathYearInLHijri?: number | null;
  validDeathDate?: boolean;
  pinOrder?: number;
};

const sourcesBySlug = poetSourceIndex.sourcesBySlug as Record<
  string,
  StaticPoetEntry | undefined
>;
const hiddenEcholaliaSlugs = new Set(['forough-farrokhzad']);

const getGanjoorImageUrl = (slug: string) =>
  `/api/ganjoor/poet/image/${slug}.gif`;

const staticPoetToPoet = (slug: string, entry: StaticPoetEntry): Poet => {
  const source = entry.source;
  const name = entry.name || slug;

  return createPoet({
    id: entry.id ?? 0,
    name,
    nickname: null,
    fullUrl: slug,
    urlSlug: slug,
    published: true,
    imageUrl:
      entry.localImageUrl ||
      (source === 'echolalia' && entry.id
        ? `/api/echolalia/poet-image/${entry.id}`
        : source === 'ganjoor'
          ? getGanjoorImageUrl(slug)
          : '/images/default-poet.png'),
    localImageUrl: entry.localImageUrl,
    birthYearInLHijri: entry.birthYearInLHijri ?? null,
    validBirthDate: entry.validBirthDate ?? false,
    deathYearInLHijri: entry.deathYearInLHijri ?? null,
    validDeathDate: entry.validDeathDate ?? false,
    pinOrder: entry.pinOrder ?? 0,
    source,
    sourceGroupName:
      source === 'echolalia'
        ? entry.sourceGroupName || 'دیگر شاعران'
        : 'گنجور',
  });
};

export const getStaticPoetsBySource = (source: StaticPoetSource): Poet[] =>
  Object.entries(sourcesBySlug)
    .filter(
      ([slug, entry]) =>
        entry?.source === source &&
        !(source === 'echolalia' && hiddenEcholaliaSlugs.has(slug)),
    )
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
  const groups = new Map<
    number,
    {
      id: number;
      name: string;
      halfCenturyOrder: number;
      startYear: number;
      endYear: number;
      showInTimeLine: boolean;
      poets: Poet[];
    }
  >();

  Object.entries(sourcesBySlug)
    .filter(([, entry]) => entry?.source === 'ganjoor')
    .forEach(([slug, entry]) => {
      const ganjoorEntry = entry as StaticPoetEntry;
      const centuryId = ganjoorEntry.centuryId;

      if (!centuryId || !ganjoorEntry.centuryName) {
        return;
      }

      const group =
        groups.get(centuryId) ||
        {
          id: centuryId,
          name: ganjoorEntry.centuryName,
          halfCenturyOrder: ganjoorEntry.centuryHalfCenturyOrder ?? 0,
          startYear: ganjoorEntry.centuryStartYear ?? 0,
          endYear: ganjoorEntry.centuryEndYear ?? 0,
          showInTimeLine: ganjoorEntry.centuryShowInTimeLine ?? false,
          poets: [],
        };

      group.poets.push(staticPoetToPoet(slug, ganjoorEntry));
      groups.set(centuryId, group);
    });

  const centuries = Array.from(groups.values())
    .map((century) => ({
      ...century,
      poets: century.poets.sort((a, b) =>
        (a.nickname || a.name).localeCompare(b.nickname || b.name, 'fa'),
      ),
    }))
    .sort(
      (a, b) =>
        a.halfCenturyOrder - b.halfCenturyOrder ||
        a.startYear - b.startYear ||
        a.name.localeCompare(b.name, 'fa'),
    );

  if (centuries.length > 0) {
    return centuries;
  }

  const century = getStaticGanjoorCentury();
  return century.poets.length > 0 ? [century] : [];
};
