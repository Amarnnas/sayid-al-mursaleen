'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  getLectures,
  getLectureBySlugOrId,
  getCategories,
  incrementLectureViews,
  incrementLectureDownloads,
  getYouTubeId,
  getGeneralSettings,
  getPrayerSettings
} from '../../../lib/firebase/db'
import { Lecture, Category, GeneralSettings, PrayerSettings } from '../../../lib/types'
import {
  ArrowRight,
  User,
  Calendar,
  Eye,
  Music,
  Radio,
  Compass,
  Loader2,
  AlertCircle,
  Share2
} from 'lucide-react'
import Link from 'next/link'
import AccessibilityWidget from '../../../components/AccessibilityWidget'
import ThemeToggle from '../../../components/ThemeToggle'
import Toast from '../../../components/Toast'

type Props = {
  initialLecture: Lecture | null
  initialGeneralSettings: GeneralSettings | null
  initialCategories: Category[]
  initialPrayerSettings: PrayerSettings | null
  initialAllLectures: Lecture[]
  slug: string
}

export default function LectureDetailClient({
  initialLecture,
  initialGeneralSettings,
  initialCategories,
  initialPrayerSettings,
  initialAllLectures,
  slug
}: Props) {
  const router = useRouter()
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(initialGeneralSettings)
  const [prayerSettings, setPrayerSettings] = useState<PrayerSettings | null>(initialPrayerSettings)
  const [lecture, setLecture] = useState<Lecture | null>(initialLecture)
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [suggestedLectures, setSuggestedLectures] = useState<Lecture[]>([])
  const [loading, setLoading] = useState(!initialLecture)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const initialLoadDone = useRef(false)

  useEffect(() => {
    if (initialLecture && !initialLoadDone.current) {
      initialLoadDone.current = true
      const currentCategoryIds = initialLecture.categoryIds || []
      const related = initialAllLectures.filter((l) => {
        if (l.id === initialLecture.id) return false
        if (currentCategoryIds.length > 0 && l.categoryIds) {
          return l.categoryIds.some((catId) => currentCategoryIds.includes(catId))
        }
        return false
      })
      setSuggestedLectures(
        related.length > 0
          ? related.slice(0, 4)
          : initialAllLectures.filter((l) => l.id !== initialLecture.id).slice(0, 4)
      )
      return
    }

    const loadPageData = async () => {
      try {
        const currentLecture = await getLectureBySlugOrId(slug)

        if (!currentLecture) {
          setError('المحاضرة المطلوبة غير موجودة.')
          try {
            const gen = await getGeneralSettings()
            const pray = await getPrayerSettings()
            const cats = await getCategories()
            setGeneralSettings(gen)
            setPrayerSettings(pray)
            setCategories(cats)
          } catch (layoutErr) {
            console.error("Error loading layout settings on error state:", layoutErr)
          }
          setLoading(false)
          return
        }

        setLecture(currentLecture)

        const [gen, pray, cats, allLectures] = await Promise.all([
          getGeneralSettings().catch(() => null),
          getPrayerSettings().catch(() => null),
          getCategories().catch(() => []),
          getLectures().catch(() => [])
        ])

        if (gen) setGeneralSettings(gen)
        if (pray) setPrayerSettings(pray)
        setCategories(cats)

        const viewedStorageKey = `saed_viewed_${currentLecture.id}`
        const lastViewed = localStorage.getItem(viewedStorageKey)
        const now = Date.now()
        const oneDayMs = 24 * 60 * 60 * 1000

        if (!lastViewed || now - parseInt(lastViewed) > oneDayMs) {
          await incrementLectureViews(currentLecture.id)
          localStorage.setItem(viewedStorageKey, now.toString())
          currentLecture.views = (currentLecture.views || 0) + 1
        }

        const currentCategoryIds = currentLecture.categoryIds || []
        const related = allLectures.filter((l) => {
          if (l.id === currentLecture.id) return false
          if (currentCategoryIds.length > 0 && l.categoryIds) {
            return l.categoryIds.some((catId) => currentCategoryIds.includes(catId))
          }
          return false
        })

        if (related.length === 0) {
          setSuggestedLectures(allLectures.filter((l) => l.id !== currentLecture.id).slice(0, 4))
        } else {
          setSuggestedLectures(related.slice(0, 4))
        }
      } catch (e) {
        console.error('Error loading watch page details:', e)
        setError('حدث خطأ أثناء تحميل تفاصيل المحاضرة.')
      } finally {
        setLoading(false)
      }
    }

    loadPageData()
  }, [slug, initialLecture, initialAllLectures])

  const handleDownloadMp3 = async () => {
    if (!lecture || !lecture.mp3Url) return
    setDownloading(true)
    setToast(null)
    try {
      await incrementLectureDownloads(lecture.id)
      setLecture(prev => prev ? { ...prev, downloads: (prev.downloads || 0) + 1 } : null)

      const safeFilename = `${lecture.title.replace(/[\\/:*?"<>|]/g, '')}.mp3`
      const downloadUrl = `/api/download?url=${encodeURIComponent(lecture.mp3Url)}&filename=${encodeURIComponent(safeFilename)}`

      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', safeFilename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error(e)
      setToast({ message: 'تعذر تحميل الملف', type: 'error' })
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = async () => {
    if (!lecture) return
    setSharing(true)
    try {
      const shortId = lecture.shortSlug || lecture.slug || lecture.id
      const shareUrl = `${window.location.origin}/l/${shortId}`
      const shareText = `🎙 ${lecture.title}\n👤 ${lecture.sheikh}\n📖 منصة مسجد سيد المرسلين\n🔗 ${shareUrl}`

      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await navigator.share({
          title: lecture.title,
          text: shareText,
          url: shareUrl,
        })
        return
      }
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
      window.open(whatsappUrl, '_blank', 'noopener')
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      if (!lecture) return
      const shortId = lecture.shortSlug || lecture.slug || lecture.id
      const shareUrl = `${window.location.origin}/l/${shortId}`
      const shareText = `🎙 ${lecture.title}\n👤 ${lecture.sheikh}\n📖 منصة مسجد سيد المرسلين\n🔗 ${shareUrl}`
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
      window.open(whatsappUrl, '_blank', 'noopener')
    } finally {
      setSharing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
          <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">جاري تحميل المحاضرة...</span>
        </div>
      </div>
    )
  }

  const videoId = lecture ? getYouTubeId(lecture.youtubeUrl) : ''
  const gen = generalSettings || {
    mosqueName: "مسجد سيد المرسلين",
    logoUrl: "/logo.png",
    description: "",
    contactPhone: "",
    whatsappLink: "",
    facebookLink: "",
    youtubeChannel: "",
    liveStreamUrl: "",
    tiktokLink: ""
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950 font-sans antialiased text-zinc-900 dark:text-zinc-100 transition-colors duration-300">

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/50 bg-white/80 dark:border-zinc-900/50 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            {gen.logoUrl ? (
              <img
                src={gen.logoUrl}
                alt="Logo"
                className="h-10 w-10 object-contain rounded-xl bg-white p-1 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white dark:bg-emerald-500 shadow-md">
                <Compass className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">
                {gen.mosqueName}
              </h1>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">البوابة الإلكترونية</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {gen.liveStreamUrl && (
              <a
                href={gen.liveStreamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md animate-pulse"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>البث المباشر</span>
              </a>
            )}

            <ThemeToggle />

            <Link
              href="/"
              className="flex items-center gap-1.5 border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
            >
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>رجوع</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:py-10 md:px-6 flex-1 flex flex-col lg:flex-row gap-8">

        {error || !lecture ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
            <div className="flex flex-col items-center gap-4 text-center w-full max-w-md bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg animate-fade-in">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">عذراً، حدث خطأ</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{error || 'لم نتمكن من العثور على المحاضرة المطلوبة.'}</p>
              <button
                onClick={() => router.push('/')}
                className="mt-4 flex items-center gap-2 bg-emerald-600 text-white font-bold text-sm px-6 py-2.5 rounded-2xl hover:bg-emerald-700 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة للرئيسية</span>
              </button>
            </div>
          </div>
        ) : (
          /* Left Side: Video Player & Details */
          <div className="flex-1 flex flex-col gap-6">

            {/* Cinema Player Container */}
            <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-black shadow-xl border border-zinc-200/20 dark:border-zinc-800/40">
              {videoId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                  title={lecture.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                ></iframe>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-500">
                  <AlertCircle className="w-12 h-12 mb-2" />
                  <span>رابط الفيديو غير صالح.</span>
                </div>
              )}
            </div>

            {/* Lecture Meta Details Card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm flex flex-col gap-4">

              {/* Title & Sheikh */}
              <div>
                <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white leading-snug">
                  {lecture.title}
                </h2>

                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{lecture.sheikh}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                    <span>{formatDate(lecture.createdAt)}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                    <span>{lecture.views || 0} مشاهدة</span>
                  </span>
                </div>
              </div>

              {/* Categories */}
              {lecture.categoryIds && lecture.categoryIds.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                  {lecture.categoryIds.map(cId => {
                    const cat = categories.find(c => c.id === cId)
                    return cat ? (
                      <span key={cId} className="text-xs bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 px-3 py-1 rounded-full font-bold">
                        {cat.name}
                      </span>
                    ) : null
                  })}
                </div>
              )}

              {/* Description */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
                <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 mb-2">الوصف والملخص:</h4>
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
                  {lecture.description || 'لا يوجد وصف متاح لهذه المحاضرة.'}
                </p>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/60 mt-2 flex flex-col sm:flex-row gap-3">
                {lecture.mp3Url && (
                  <button
                    onClick={handleDownloadMp3}
                    disabled={downloading}
                    className="flex-1 flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg hover:shadow-emerald-600/20 active:scale-99 transition-all cursor-pointer text-base md:text-lg"
                  >
                    {downloading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Music className="w-5.5 h-5.5" />
                    )}
                    <span>تحميل الصوت MP3</span>
                    <span className="text-xs font-normal opacity-85">({lecture.downloads || 0} تحميل)</span>
                  </button>
                )}

                <button
                  onClick={handleShare}
                  disabled={sharing}
                  className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-emerald-600/20 active:scale-99 transition-all cursor-pointer text-base md:text-lg"
                >
                  {sharing ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Share2 className="w-5.5 h-5.5" />
                  )}
                  <span>🔗 مشاركة المحاضرة</span>
                </button>
              </div>

            </div>

          </div>
        )}

        {/* Right Side: Suggested Lectures */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-5">
          <h3 className="text-base font-extrabold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
            <span className="w-2 h-5 bg-emerald-600 dark:bg-emerald-500 rounded-full"></span>
            محاضرات مقترحة
          </h3>

          {suggestedLectures.length > 0 ? (
            <div className="flex flex-col gap-4">
              {suggestedLectures.map((lec) => {
                const suggVideoId = getYouTubeId(lec.youtubeUrl)
                return (
                  <Link
                    href={`/l/${lec.shortSlug || lec.slug || lec.id}`}
                    key={lec.id}
                    className="group flex gap-3 overflow-hidden rounded-2xl border border-zinc-200/50 bg-white p-2.5 shadow-sm hover:shadow-md transition-all dark:border-zinc-800/50 dark:bg-zinc-900 hover:-translate-y-0.5"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
                      <img
                        src={lec.thumbnailUrl || `https://img.youtube.com/vi/${suggVideoId}/hqdefault.jpg`}
                        alt={lec.title}
                        className="h-full w-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    {/* Details */}
                    <div className="flex flex-col justify-between py-0.5">
                      <h4 className="text-xs font-bold leading-snug text-zinc-900 group-hover:text-emerald-700 dark:text-zinc-100 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                        {lec.title}
                      </h4>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                        <span className="block font-medium">{lec.sheikh}</span>
                        <span className="block mt-0.5">{lec.views || 0} مشاهدة</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 text-center py-6">لا توجد محاضرات مقترحة حالياً.</p>
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-zinc-950 border-t border-zinc-200/50 dark:border-zinc-900/50 mt-12">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center text-[10px] text-zinc-400 dark:text-zinc-500">
          <p>جميع الحقوق محفوظة لمسجد سيد المرسلين © {new Date().getFullYear()}</p>
        </div>
      </footer>

      {/* Floating Accessibility Controls for Elderly */}
      <AccessibilityWidget />

      {/* Toast Overlay */}
      {toast && (
        <div className="fixed bottom-5 left-5 z-50 max-w-sm w-full px-4 md:px-0">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  )
}
