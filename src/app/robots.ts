import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sushichain.ua'

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: '/admin/', disallow: '/api/' },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}