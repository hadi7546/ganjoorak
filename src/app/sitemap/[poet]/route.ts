import { MetadataRoute } from 'next'
import { poets } from '@/data/poets';

interface Poem {
  id: number;
}

interface CategoryPoems {
  cat?: {
    poems?: Poem[];
  };
}

async function fetchPoemIds(poetId: number): Promise<number[]> {
  let poemIds: Set<number> = new Set();

  try {
    const response = await fetch(`https://api.ganjoor.net/api/ganjoor/poet/${poetId}?poems=true&mainSections=false`);
    if (response.ok) {
      const data: CategoryPoems = await response.json();
      if (data.cat && data.cat.poems) {
        data.cat.poems.forEach(poem => poemIds.add(poem.id));
      }
    }
  } catch (error) {
    console.error(`Error fetching poems for poet ${poetId}:`, error);
  }

  return Array.from(poemIds);
}

import { MetadataRoute } from 'next'
import { poets } from '@/data/poets';

interface Poem {
  id: number;
}

interface CategoryPoems {
  cat?: {
    poems?: Poem[];
  };
}

async function fetchPoemIds(poetId: number): Promise<number[]> {
  let poemIds: Set<number> = new Set();

  try {
    const response = await fetch(`https://api.ganjoor.net/api/ganjoor/poet/${poetId}?poems=true&mainSections=false`);
    if (response.ok) {
      const data: CategoryPoems = await response.json();
      if (data.cat && data.cat.poems) {
        data.cat.poems.forEach(poem => poemIds.add(poem.id));
      }
    }
  } catch (error) {
    console.error(`Error fetching poems for poet ${poetId}:`, error);
  }

  return Array.from(poemIds);
}

export async function GET(
  request: Request,
  { params }: { params: { poet: string } }
): Promise<Response> {
  const poet = poets.find(p => p.urlSlug === params.poet);

  if (!poet) {
    return new Response("Not found", { status: 404 });
  }

  const siteUrl = 'https://ganjoorak.com';

  const poemIds = await fetchPoemIds(poet.id);
  const poemPages = poemIds.map((id) => ({
    url: `${siteUrl}/poem/${id}`,
    lastModified: new Date(),
  }));

  const sitemap: MetadataRoute.Sitemap = [
    ...poemPages,
  ];

  // @ts-ignore
  return new Response(sitemap);
}

