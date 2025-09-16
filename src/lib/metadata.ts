import type { Metadata } from "next";

export function createPoemMetadata(poem: {
  id: number;
  title: string;
  poet: string;
  verses: string[];
}): Metadata {
  const excerpt = poem.verses.slice(0, 2).join(" - ");

  return {
    title: `${poem.title} - ${poem.poet}`,
    description: `مشاهده و گوش دادن به شعر ${poem.title} از ${poem.poet}. ${excerpt}`,
    keywords: [poem.poet, poem.title, "شعر", "فارسی", poem.poet.toLowerCase()],
    openGraph: {
      title: `${poem.title} - ${poem.poet} | گنجورک`,
      description: `شعر ${poem.title} از ${poem.poet}. ${excerpt}`,
      type: "article",
      publishedTime: new Date().toISOString(),
      authors: [poem.poet],
      tags: [poem.poet, "شعر", "فارسی", poem.title.toLowerCase()],
    },
    twitter: {
      card: "summary_large_image",
      title: `${poem.title} - ${poem.poet} | گنجورک`,
      description: `شعر ${poem.title} از ${poem.poet}. ${excerpt}`,
    },
    alternates: {
      canonical: `https://ganjoorak.com/poem/${poem.id}`,
    },
  };
}

export function createPoetMetadata(
  poet: string,
  description?: string,
): Metadata {
  return {
    title: `اشعار ${poet} | گنجورک`,
    description:
      description ||
      `مجموعه کامل اشعار ${poet} در گنجورک. مشاهده و گوش دادن به بهترین اشعار ${poet}.`,
    keywords: [poet, "شعر", "فارسی", "اشعار", poet.toLowerCase()],
    openGraph: {
      title: `اشعار ${poet} | گنجورک`,
      description: description || `مجموعه کامل اشعار ${poet} در گنجورک`,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `اشعار ${poet} | گنجورک`,
      description: description || `مجموعه کامل اشعار ${poet} در گنجورک`,
    },
    alternates: {
      canonical: `https://ganjoorak.com/${poet.toLowerCase()}`,
    },
  };
}
