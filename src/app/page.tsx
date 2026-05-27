'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { 
  getGeneralSettings, 
  getPrayerSettings, 
  getAnnouncements, 
  getLectures,
  getCategories
} from '../lib/firebase/db';
import { GeneralSettings, PrayerSettings, Announcement, Lecture, Category } from '../lib/types';
import PrayerTimesCard from '../components/PrayerTimesCard';
import AnnouncementCard from '../components/AnnouncementCard';
import LectureCard from '../components/LectureCard';
import AccessibilityWidget from '../components/AccessibilityWidget';
import ThemeToggle from '../components/ThemeToggle';
import { 
  Phone, 
  Radio, 
  ExternalLink, 
  Compass, 
  ShieldCheck,
  Search,
  SlidersHorizontal,
  FolderOpen,
  X,
  Inbox,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

// Custom inline SVG icons
const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    className={props.className}
    style={props.style}
  >
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.516 0-9.387.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.507 9.387.507 9.387.507s7.517 0 9.387-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    className={props.className}
    style={props.style}
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const TiktokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    className={props.className}
    style={props.style}
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.94.13 1.89.11 2.83.1v3.96c-1.25-.02-2.5-.33-3.62-1.02-.03 1.83-.01 3.67-.02 5.51 0 .61-.03 1.22-.09 1.83-.4 3.08-2.68 5.76-5.83 6.3-3.61.73-7.39-1.39-8.49-4.88-1.21-3.66.45-8.03 4.02-9.45.89-.37 1.84-.54 2.8-.52-.01 1.34 0 2.68-.01 4.02-.7-.11-1.42-.03-2.07.28-1.42.66-2.22 2.3-1.89 3.84.34 1.7 1.94 2.92 3.67 2.65 1.56-.2 2.82-1.5 2.88-3.07.03-3.95.01-7.9.02-11.85-.01-.73.49-1.4 1.13-1.63.3-.11.62-.13.94-.13z"/>
  </svg>
);

// Normalize Arabic text to support extremely flexible search
const normalizeArabic = (text: string): string => {
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/[\u064B-\u0652]/g, ''); // remove tashkeel/diacritics
};

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // --- States ---
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [prayerSettings, setPrayerSettings] = useState<PrayerSettings | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Search, Filter & Sort States (Synced with URL) ---
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortOption, setSortOption] = useState('newest');
  const [visibleCount, setVisibleCount] = useState(8);

  // Load static data once
  const loadData = async () => {
    try {
      const gen = await getGeneralSettings();
      const pray = await getPrayerSettings();
      const anns = await getAnnouncements(true); // only active
      const lecs = await getLectures();
      const cats = await getCategories();

      setGeneralSettings(gen);
      setPrayerSettings(pray);
      setAnnouncements(anns);
      setLectures(lecs);
      setCategories(cats);
    } catch (e) {
      console.error("Error loading home page data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync states from URL query params on load or URL change
  useEffect(() => {
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || 'all';
    const sort = searchParams.get('sort') || 'newest';

    setSearchInput(search);
    setSearchQuery(search);
    setSelectedCategory(category);
    setSortOption(sort);
  }, [searchParams]);

  // Debounce search input to improve performance
  useEffect(() => {
    const handler = setTimeout(() => {
      // Smoothly update URL params
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput) params.set('search', searchInput);
      else params.delete('search');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      setSearchQuery(searchInput);
    }, 350);

    return () => clearTimeout(handler);
  }, [searchInput]);

  // Update Category & Sort URL params
  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    setVisibleCount(8); // Reset pagination on filter change
    
    const params = new URLSearchParams(searchParams.toString());
    if (catId !== 'all') params.set('category', catId);
    else params.delete('category');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleSortChange = (sort: string) => {
    setSortOption(sort);
    
    const params = new URLSearchParams(searchParams.toString());
    if (sort !== 'newest') params.set('sort', sort);
    else params.delete('sort');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    
    const params = new URLSearchParams(searchParams.toString());
    params.delete('search');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.png" alt="شعار مسجد سيد المرسلين" className="h-20 w-20 object-contain rounded-2xl shadow-lg animate-pulse" />
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
          <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">جاري تحميل موقع مسجد سيد المرسلين...</span>
        </div>
      </div>
    );
  }

  const gen = generalSettings!;
  const pray = prayerSettings!;

  // --- Filtration & Sorting Logic ---
  const normalizedQuery = normalizeArabic(searchQuery);

  const filteredLectures = lectures
    .filter((lec) => {
      // 1. Category Filter
      if (selectedCategory !== 'all') {
        if (!lec.categoryIds || !lec.categoryIds.includes(selectedCategory)) {
          return false;
        }
      }

      // 2. Search Text Filter (Title, Sheikh Name, Category Name)
      if (normalizedQuery) {
        const normTitle = normalizeArabic(lec.title);
        const normSheikh = normalizeArabic(lec.sheikh);
        const normDesc = normalizeArabic(lec.description || '');
        
        // Find if matches category name associated
        const hasMatchingCategoryName = lec.categoryIds
          ? lec.categoryIds.some(cId => {
              const cat = categories.find(c => c.id === cId);
              return cat ? normalizeArabic(cat.name).includes(normalizedQuery) : false;
            })
          : false;

        return (
          normTitle.includes(normalizedQuery) ||
          normSheikh.includes(normalizedQuery) ||
          normDesc.includes(normalizedQuery) ||
          hasMatchingCategoryName
        );
      }

      return true;
    })
    .sort((a, b) => {
      // 3. Sorting Options
      switch (sortOption) {
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'alphabetical':
          return a.title.localeCompare(b.title, 'ar');
        case 'most_viewed':
          return (b.views || 0) - (a.views || 0);
        case 'most_downloaded':
          return (b.downloads || 0) - (a.downloads || 0);
        case 'newest':
        default:
          return b.createdAt - a.createdAt;
      }
    });

  // Paginated lectures
  const paginatedLectures = filteredLectures.slice(0, visibleCount);

  // Helper to count lectures per category for badge counts
  const getLectureCountForCategory = (catId: string) => {
    if (catId === 'all') return lectures.length;
    return lectures.filter(l => l.categoryIds?.includes(catId)).length;
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950 font-sans antialiased text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      
      {/* 1. Header & Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/50 bg-white/80 dark:border-zinc-900/50 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          {/* Logo & Name */}
          <div className="flex items-center gap-3">
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
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">الموقع الرسمي</p>
            </div>
          </div>

          {/* Action Links */}
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
              href="/admin"
              className="flex items-center gap-1.5 border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>لوحة التحكم</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/60 via-white to-zinc-50 py-12 md:py-20 dark:from-emerald-950/10 dark:via-zinc-950 dark:to-zinc-950">
        <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.02] flex items-center justify-center select-none pointer-events-none">
          <svg width="600" height="600" viewBox="0 0 100 100" fill="currentColor">
            <path d="M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z" />
          </svg>
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <div className="mb-6 inline-block">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-2xl scale-150 animate-pulse-slow"></div>
              <img 
                src={gen.logoUrl || '/logo.png'} 
                alt="شعار مسجد سيد المرسلين" 
                className="relative h-20 w-20 md:h-24 md:w-24 object-contain rounded-3xl shadow-2xl border-2 border-white/60 dark:border-zinc-700/60 bg-white dark:bg-zinc-900 p-2"
              />
            </div>
          </div>

          <span className="inline-flex items-center gap-1 bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold px-3 py-1 rounded-full mb-3">
            بيت من بيوت الله يرحب بكم
          </span>
          
          <h2 className="text-2xl md:text-4xl font-black text-zinc-900 dark:text-white leading-tight tracking-tight">
            مرحباً بكم في <span className="text-emerald-700 dark:text-emerald-400">{gen.mosqueName}</span>
          </h2>
          
          <p className="mx-auto mt-3 max-w-2xl text-sm md:text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            {gen.description}
          </p>

          {/* Social Quick Buttons */}
          <div className="mt-6 flex flex-wrap justify-center items-center gap-3">
            {gen.youtubeChannel && (
              <a 
                href={gen.youtubeChannel} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-md transition-colors"
              >
                <YoutubeIcon className="w-4 h-4 fill-current" />
                <span>قناة اليوتيوب</span>
              </a>
            )}

            {gen.facebookLink && (
              <a 
                href={gen.facebookLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-md transition-colors"
              >
                <FacebookIcon className="w-4 h-4 fill-current" />
                <span>الفيسبوك</span>
              </a>
            )}

            {gen.whatsappLink && (
              <a 
                href={gen.whatsappLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-md transition-colors"
              >
                <Phone className="w-4 h-4 fill-current" />
                <span>مجموعة الواتساب</span>
              </a>
            )}

            {gen.tiktokLink && (
              <a 
                href={gen.tiktokLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-md transition-colors dark:bg-zinc-800 dark:hover:bg-zinc-700"
              >
                <TiktokIcon className="w-4 h-4 fill-current" />
                <span>تيك توك</span>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* 3. Main Body Container */}
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 flex-1 flex flex-col gap-10">
        
        {/* Dynamic Prayer Widget */}
        <section className="w-full">
          <PrayerTimesCard settings={pray} />
        </section>

        {/* Announcements section */}
        {announcements.length > 0 && (
          <section className="w-full animate-fade-in">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-5">
              <h3 className="text-lg font-extrabold text-zinc-950 dark:text-white flex items-center gap-2">
                <span className="w-2 h-5 bg-emerald-600 dark:bg-emerald-500 rounded-full"></span>
                الإعلانات والتعميمات
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {announcements.map((ann) => (
                <AnnouncementCard key={ann.id} announcement={ann} />
              ))}
            </div>
          </section>
        )}

        {/* Sermons and Recitations section */}
        <section className="w-full flex flex-col gap-6">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4 gap-4">
            <h3 className="text-lg font-extrabold text-zinc-950 dark:text-white flex items-center gap-2">
              <span className="w-2 h-5 bg-emerald-600 dark:bg-emerald-500 rounded-full"></span>
              الخطب والدروس والتلاوات
            </h3>
            
            {/* Search Input Field */}
            <div className="relative max-w-xs w-full">
              <input 
                type="text" 
                placeholder="ابحث بالعنوان، الشيخ، أو التصنيف..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 pl-10 pr-4 py-2 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
              />
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
              {searchInput && (
                <button 
                  onClick={clearSearch}
                  className="absolute left-10 top-2.5 p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Filtering and Sorting Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm">
            
            {/* Category Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto py-1 scrollbar-none">
              <button
                onClick={() => handleCategoryChange('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                    : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
              >
                الكل ({getLectureCountForCategory('all')})
              </button>
              
              {categories.map((cat) => {
                const count = getLectureCountForCategory(cat.id);
                if (count === 0 && selectedCategory !== cat.id) return null; // hide empty categories unless active
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                        : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>

            {/* Sorting Select */}
            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              <select
                value={sortOption}
                onChange={e => handleSortChange(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 cursor-pointer"
              >
                <option value="newest">الأحدث نشرًا</option>
                <option value="oldest">الأقدم نشرًا</option>
                <option value="alphabetical">الترتيب الأبجدي</option>
                <option value="most_viewed">الأكثر مشاهدة</option>
                <option value="most_downloaded">الأكثر تحميلًا للصوت</option>
              </select>
            </div>

          </div>

          {/* Lectures Grid or Empty State */}
          {paginatedLectures.length > 0 ? (
            <div className="flex flex-col gap-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {paginatedLectures.map((lec) => {
                  // Get category names associated
                  const lecCats = lec.categoryIds
                    ? (lec.categoryIds
                        .map(cId => categories.find(c => c.id === cId)?.name)
                        .filter(Boolean) as string[])
                    : [];
                  return (
                    <LectureCard 
                      key={lec.id} 
                      lecture={lec} 
                      categoryNames={lecCats}
                    />
                  );
                })}
              </div>

              {/* Pagination Show More Button */}
              {filteredLectures.length > paginatedLectures.length && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 8)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-md transition-all active:scale-98 cursor-pointer"
                  >
                    <span>عرض المزيد من المحاضرات</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Beautiful Empty State */
            <div className="w-full text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col items-center justify-center p-6 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-500 flex items-center justify-center rounded-2xl mb-4">
                <Inbox className="w-8 h-8" />
              </div>
              <h4 className="font-extrabold text-base text-zinc-900 dark:text-white">لم يتم العثور على أي نتائج</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm leading-relaxed">
                لا توجد محاضرات تطابق خيارات التصفية أو البحث الحالية. جرب تعديل نص البحث أو تصفح تصنيفاً آخر.
              </p>
              {(searchQuery || selectedCategory !== 'all') && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    setSearchQuery('');
                    handleCategoryChange('all');
                  }}
                  className="mt-4 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  إعادة تعيين فلاتر البحث
                </button>
              )}
            </div>
          )}

        </section>

      </main>

      {/* 4. Footer Section */}
      <footer className="mt-16 bg-white dark:bg-zinc-950 border-t border-zinc-200/50 dark:border-zinc-900/50">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 text-center text-[10px] text-zinc-400 dark:text-zinc-500">
          <p>جميع الحقوق محفوظة لمسجد سيد المرسلين © {new Date().getFullYear()}</p>
        </div>
      </footer>

      {/* Floating Accessibility Controls for Eldely */}
      <AccessibilityWidget />
    </div>
  );
}

function HomeFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent />
    </Suspense>
  );
}
