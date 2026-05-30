import type { Metadata } from 'next'
import { getLectureBySlugOrId, getLectures, getCategories, getGeneralSettings, getPrayerSettings, getYouTubeThumbnail } from '../../../lib/firebase/db'
import LectureDetailClient from './client-page'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const decodedSlug = decodeURIComponent(slug)
  const lecture = await getLectureBySlugOrId(decodedSlug)

  if (!lecture) {
    return { title: 'محاضرة - مسجد سيد المرسلين' }
  }

  const thumbnail = lecture.thumbnailUrl || (lecture.youtubeUrl ? getYouTubeThumbnail(lecture.youtubeUrl) : '')

  return {
    title: `${lecture.title} - ${lecture.sheikh}`,
    description: lecture.description?.slice(0, 160) || `محاضرة للشيخ ${lecture.sheikh} من مسجد سيد المرسلين`,
    openGraph: {
      title: lecture.title,
      description: lecture.description?.slice(0, 200) || `محاضرة للشيخ ${lecture.sheikh}`,
      type: 'article',
      locale: 'ar_AR',
      siteName: 'مسجد سيد المرسلين',
      images: thumbnail ? [{ url: thumbnail, width: 1200, height: 630, alt: lecture.title }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: lecture.title,
      description: lecture.description?.slice(0, 200) || `محاضرة للشيخ ${lecture.sheikh}`,
      images: thumbnail ? [thumbnail] : [],
    },
  }
}

export default async function LecturePage({ params }: Props) {
  const { slug } = await params
  const decodedSlug = decodeURIComponent(slug)

  const [lecture, general, allLectures, cats, pray] = await Promise.all([
    getLectureBySlugOrId(decodedSlug),
    getGeneralSettings().catch(() => null),
    getLectures().catch(() => []),
    getCategories().catch(() => []),
    getPrayerSettings().catch(() => null),
  ])

  let structuredData = null
  if (lecture) {
    const isVideo = !!lecture.youtubeUrl
    const videoThumbnail = lecture.thumbnailUrl || (lecture.youtubeUrl ? getYouTubeThumbnail(lecture.youtubeUrl) : '')
    structuredData = {
      '@context': 'https://schema.org',
      '@type': isVideo ? 'VideoObject' : 'AudioObject',
      name: lecture.title,
      description: lecture.description || '',
      author: { '@type': 'Person', name: lecture.sheikh },
      dateCreated: new Date(lecture.createdAt).toISOString(),
      ...(isVideo ? { thumbnailUrl: videoThumbnail, contentUrl: lecture.youtubeUrl } : {}),
      ...(lecture.mp3Url ? { contentUrl: lecture.mp3Url } : {}),
    }
  }

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <LectureDetailClient
        initialLecture={lecture}
        initialGeneralSettings={general}
        initialCategories={cats}
        initialPrayerSettings={pray}
        initialAllLectures={allLectures}
        slug={decodedSlug}
      />
    </>
  )
}
