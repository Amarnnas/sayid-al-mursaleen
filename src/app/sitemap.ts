import { MetadataRoute } from 'next';
import { getCategories, getLectures } from '../lib/firebase/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://saed-al-mursaleen.web.app';

  const [lectures, categories] = await Promise.all([
    getLectures().catch(() => []),
    getCategories().catch(() => []),
  ]);

  const lectureUrls = lectures.map((lec) => ({
    url: `${baseUrl}/l/${lec.shortSlug || lec.slug || lec.id}`,
    lastModified: new Date(lec.createdAt || Date.now()),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const categoryUrls = categories.map((cat) => ({
    url: `${baseUrl}/category/${cat.slug || cat.id}`,
    lastModified: new Date(cat.createdAt || Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    ...categoryUrls,
    ...lectureUrls,
  ];
}
