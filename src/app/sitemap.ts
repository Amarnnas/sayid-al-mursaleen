import { MetadataRoute } from 'next';
import { getLectures } from '../lib/firebase/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://saed-al-mursaleen.web.app';

  // Fetch lectures dynamically from database
  const lectures = await getLectures().catch(() => []);

  const lectureUrls = lectures.map((lec) => ({
    url: `${baseUrl}/lectures/${lec.slug || lec.id}`,
    lastModified: new Date(lec.createdAt || Date.now()),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    ...lectureUrls,
  ];
}
