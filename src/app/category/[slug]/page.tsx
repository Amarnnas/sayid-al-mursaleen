'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { getCategories, getLectures, getGeneralSettings } from '../../../lib/firebase/db';
import { Category, Lecture, GeneralSettings } from '../../../lib/types';
import { 
  ArrowRight, 
  Search, 
  SlidersHorizontal, 
  FolderOpen, 
  Inbox,
  X
} from 'lucide-react';
import Link from 'next/link';
import LectureCard from '../../../components/LectureCard';
import AccessibilityWidget from '../../../components/AccessibilityWidget';
import ThemeToggle from '../../../components/ThemeToggle';

const normalizeArabic = (text: string): string => {
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/[\u064B-\u0652]/g, '');
};

export default function CategoryPage() {
  const { slug } = useParams() as { slug: string };

  const [category, setCategory] = useState<Category | null>(null);
  const [allLectures, setAllLectures] = useState<Lecture[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOption, setSortOption] = useState('newest');
  const [visibleCount, setVisibleCount] = useState(8);

  useEffect(() => {
    const loadPageData = async () => {
      try {
        const slugStr = Array.isArray(slug) ? slug[0] : slug;
        const decodedSlug = decodeURIComponent(slugStr || '');

        const [cats, lecs, gen] = await Promise.all([
          getCategories(),
          getLectures(),
          getGeneralSettings().catch(() => null)
        ]);

        setCategories(cats);
        setAllLectures(lecs);
        if (gen) setGeneralSettings(gen);

        const foundCat = cats.find(
          c => c.slug === decodedSlug || c.id === decodedSlug
        );
        if (foundCat) {
          setCategory(foundCat);
          setSelectedCategory(foundCat.id);
        }
      } catch (e) {
        console.error("Error loading category page:", e);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      loadPageData();
    }
  }, [slug]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const gen = generalSettings || {
    mosqueName: "مسجد سيد المرسلين",
    logoUrl: "/logo.png",
    description: "",
    contactPhone: "",
    contactEmail: "",
    whatsappLink: "",
    facebookLink: "",
    youtubeChannel: "",
    liveStreamUrl: "",
    tiktokLink: ""
  };

  const normalizedQuery = normalizeArabic(searchQuery);

  const filteredLectures = useMemo(() => {
    return allLectures
      .filter((lec) => {
        if (selectedCategory !== 'all') {
          if (!lec.categoryIds || !lec.categoryIds.includes(selectedCategory)) {
            return false;
          }
        }

        if (normalizedQuery) {
          const normTitle = normalizeArabic(lec.title);
          const normSheikh = normalizeArabic(lec.sheikh);
          const normDesc = normalizeArabic(lec.description || '');

          return (
            normTitle.includes(normalizedQuery) ||
            normSheikh.includes(normalizedQuery) ||
            normDesc.includes(normalizedQuery)
          );
        }

        return true;
      })
      .sort((a, b) => {
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
  }, [allLectures, selectedCategory, normalizedQuery, sortOption]);

  const paginatedLectures = filteredLectures.slice(0, visibleCount);

  const getLectureCountForCategory = (catId: string) => {
    if (catId === 'all') return allLectures.length;
    return allLectures.filter(l => l.categoryIds?.includes(catId)).length;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
          <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">جاري تحميل التصنيف...</span>
        </div>
      </div>
    );
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
                <FolderOpen className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="text-sm sm:text-lg font-bold text-zinc-900 dark:text-white leading-tight">
                {category?.name || 'تصنيف'}
              </h1>
              <p className="hidden sm:block text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                {category ? `${getLectureCountForCategory(category.id)} مواد` : ''}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link 
              href="/"
              className="flex items-center gap-1.5 border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 text-xs font-semibold px-2 sm:px-3 py-1.5 rounded-xl transition-all"
            >
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">الرئيسية</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 flex-1 flex flex-col gap-8">

        {/* Category Header */}
        {category && (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 mb-4">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white">
              {category.name}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              {getLectureCountForCategory(category.id)} {getLectureCountForCategory(category.id) === 1 ? 'مادة منشورة' : 'مواد منشورة'} في هذا التصنيف
            </p>
          </div>
        )}

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 transition-all"
          >
            جميع التصنيفات
          </Link>
          {categories.map((cat) => {
            const count = getLectureCountForCategory(cat.id);
            if (count === 0 && selectedCategory !== cat.id) return null;
            return (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                }`}
              >
                {cat.name} ({count})
              </Link>
            );
          })}
        </div>

        {/* Search & Sort Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm">
          <div className="relative max-w-xs w-full">
            <input 
              type="text" 
              placeholder="ابحث بالعنوان، الشيخ، أو الوصف..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 pl-10 pr-4 py-2 text-xs focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
            />
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
            {searchInput && (
              <button 
                onClick={() => { setSearchInput(''); setSearchQuery(''); }}
                className="absolute left-10 top-2.5 p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value)}
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

            {filteredLectures.length > paginatedLectures.length && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setVisibleCount(prev => prev + 8)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <span>عرض المزيد</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col items-center justify-center p-6 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-500 flex items-center justify-center rounded-2xl mb-4">
              <Inbox className="w-8 h-8" />
            </div>
            <h4 className="font-extrabold text-base text-zinc-900 dark:text-white">لا توجد مواد منشورة في هذا التصنيف حالياً</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm leading-relaxed">
              لم يتم العثور على محاضرات تطابق معايير البحث الحالية.
            </p>
            {(searchQuery || selectedCategory !== 'all') && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                }}
                className="mt-4 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400"
              >
                إعادة تعيين البحث
              </button>
            )}
          </div>
        )}

        {/* Internal Link to Home */}
        <div className="text-center pt-4">
          <Link 
            href="/"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400 inline-flex items-center gap-1"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة إلى الصفحة الرئيسية</span>
          </Link>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-zinc-950 border-t border-zinc-200/50 dark:border-zinc-900/50">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center text-[10px] text-zinc-400 dark:text-zinc-500">
          <p>جميع الحقوق محفوظة لمسجد سيد المرسلين © {new Date().getFullYear()}</p>
        </div>
      </footer>

      <AccessibilityWidget />
    </div>
  );
}