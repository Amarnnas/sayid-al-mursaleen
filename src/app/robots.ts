import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://sayid-al-mursaleen.vercel.app/sitemap.xml',
    host: 'https://sayid-al-mursaleen.vercel.app',
  };
}
