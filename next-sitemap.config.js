/** @type {import('next-sitemap').IConfig } */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://ganjoorak.com',
  generateRobotsTxt: true,
  generateIndexSitemap: true,
  exclude: ['/server-sitemap.xml'],
  robotsTxtOptions: {
    additionalSitemaps: [
      `${process.env.SITE_URL || 'https://ganjoorak.com'}/server-sitemap.xml`,
    ],
  },
  // Default transformation
  transform: async (config, path) => {
    return {
      loc: path,
      changefreq: 'weekly',
      priority: path === '/' ? 1.0 : 0.7,
      lastmod: new Date().toISOString(),
    }
  },
}
