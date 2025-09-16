import { getServerSideSitemap } from 'next-sitemap'
import { GetServerSidePropsContext } from 'next'
import customApi from '@/api/CustomApi'
import ganjoorApi from '@/api/GanjoorApi'
import { PoetSlug, poetNames } from '@/types/poet'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  try {
    // Get all poet slugs
    const customPoets = Object.keys(poetNames) as PoetSlug[]

    // Generate static pages
    const staticPages = [
      '',
      '/poets',
      '/faq',
      '/updates'
    ]

    // Generate poet pages
    const poetPages = customPoets.map(poet => `/${poet}`)

    // For custom poets, we'll generate some sample poem URLs
    // In a real implementation, you'd fetch all available poem IDs
    const customPoemPages: string[] = []

    for (const poet of customPoets.slice(0, 3)) { // Limit to first 3 poets for demo
      try {
        // Get a few sample poems for each poet
        const samplePoems = []
        for (let i = 1; i <= 5; i++) { // Generate sample IDs 1-5
          samplePoems.push(`/${poet}/${i}`)
        }
        customPoemPages.push(...samplePoems)
      } catch (error) {
        console.error(`Error generating poems for ${poet}:`, error)
      }
    }

    // Generate Ganjoor poem pages (sample implementation)
    const ganjoorPoemPages: string[] = []
    const commonGanjoorPoets = ['hafez', 'saadi', 'ferdowsi', 'rumi', 'attar']

    for (const poet of commonGanjoorPoets) {
      try {
        // Try to get a sample poem to verify the poet exists
        const samplePoem = await ganjoorApi.getRandomPoemByPoet(poet)
        if (samplePoem) {
          // Generate sample poem URLs for this poet
          for (let i = 1; i <= 3; i++) {
            ganjoorPoemPages.push(`/poem/${samplePoem.id + i - 1}`)
          }
        }
      } catch (error) {
        console.log(`Poet ${poet} not available in Ganjoor`)
      }
    }

    // Combine all URLs
    const allUrls = [
      ...staticPages,
      ...poetPages,
      ...customPoemPages,
      ...ganjoorPoemPages
    ]

    // Generate sitemap
    return getServerSideSitemap(
      allUrls.map(url => ({
        loc: `${process.env.SITE_URL || 'https://ganjoorak.com'}${url}`,
        lastmod: new Date().toISOString(),
        changefreq: url.includes('/poem/') || url.includes('/hafez/') || url.includes('/saadi/') ? 'monthly' : 'weekly',
        priority: url === '' ? 1.0 : (url.includes('/poem/') || url.includes('/hafez/') || url.includes('/saadi/')) ? 0.9 : 0.7
      }))
    )
  } catch (error) {
    console.error('Error generating sitemap:', error)
    // Return empty sitemap on error
    return getServerSideSitemap([])
  }
}
