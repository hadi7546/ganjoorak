import { MetadataRoute } from 'next'
import { poets } from '@/data/poets';

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

  const poetSitemaps = poets.map((poet) => ({
    url: `${siteUrl}/sitemap/${poet.urlSlug}`,
    lastModified: new Date(),
  }));

  return [
    ...staticPages,
    ...poetPages,
    ...poetSitemaps,
  ];
}