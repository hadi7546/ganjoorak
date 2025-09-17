import { MetadataRoute } from 'next'
import { poets } from '@/data/poets';

interface Poem {
  id: number;
  // Add other poem properties if needed
}

interface CategoryPoems {
  cat?: {
    poems?: Poem[];
  };
}

async function fetchPoemIds(): Promise<number[]> {
  const categoryIds = [
    102,
    31,
    24,
    25,
    26,
    144,
    122,
    141
  ];
  let poemIds: Set<number> = new Set();

  for (const catId of categoryIds) {
    try {
      const response = await fetch(`https://api.ganjoor.net/api/ganjoor/cat/${catId}?poems=true&mainSections=false`);
      if (response.ok) {
        const data: CategoryPoems = await response.json();
        if (data.cat && data.cat.poems) {
          data.cat.poems.forEach(poem => poemIds.add(poem.id));
        }
      }
    } catch (error) {
      console.error(`Error fetching poems for category ${catId}:`, error);
    }
  }

  return Array.from(poemIds);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = 'https://ganjoorak.com';

  const staticPages = [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/poets`,
      lastModified: new Date(),
    },
    {
        url: `${siteUrl}/updates`,
        lastModified: new Date(),
    },
    {
        url: `${siteUrl}/faq`,
        lastModified: new Date(),
    },
  ];

  const poetPages = poets.map((poet) => ({
    url: `${siteUrl}/${poet.urlSlug}`,
    lastModified: new Date(),
  }));

  const poemIds = await fetchPoemIds();
  const poemPages = poemIds.map((id) => ({
    url: `${siteUrl}/poem/${id}`,
    lastModified: new Date(),
  }));

  return [
    ...staticPages,
    ...poetPages,
    ...poemPages,
  ];
}