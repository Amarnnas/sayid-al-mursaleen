'use client';

import React, { useState, useEffect } from 'react';
import { 
  getGeneralSettings, 
  getPrayerSettings, 
  getAnnouncements, 
  getLectures 
} from '../lib/firebase/db';
import { GeneralSettings, PrayerSettings, Announcement, Lecture } from '../lib/types';
import PrayerTimesCard from '../components/PrayerTimesCard';
import AnnouncementCard from '../components/AnnouncementCard';
import LectureCard from '../components/LectureCard';
import AccessibilityWidget from '../components/AccessibilityWidget';
import { 
  Phone, 
  Radio, 
  ArrowLeft, 
  ExternalLink, 
  Compass, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import Link from 'next/link';

// Custom inline SVG icons to avoid Lucide React version compatibility issues
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

export default function Home() {
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [prayerSettings, setPrayerSettings] = useState<PrayerSettings | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const gen = await getGeneralSettings();
      const pray = await getPrayerSettings();
      const anns = await getAnnouncements(true); // only active announcements
      const lecs = await getLectures();

      setGeneralSettings(gen);
      setPrayerSettings(pray);
      setAnnouncements(anns);
      setLectures(lecs);
    } catch (e) {
      console.error("Error loading home page data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
                <Compass className="w-5 h-5 animate-pulse-slow" />
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
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/60 via-white to-zinc-50 py-16 md:py-24 dark:from-emerald-950/10 dark:via-zinc-950 dark:to-zinc-950">
        {/* Subtle Islamic Geometrics Vector Overlay */}
        <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.02] flex items-center justify-center select-none pointer-events-none">
          <svg width="600" height="600" viewBox="0 0 100 100" fill="currentColor">
            <path d="M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z" />
          </svg>
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          {/* Mosque Logo */}
          <div className="mb-6 inline-block">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-2xl scale-150 animate-pulse-slow"></div>
              <img 
                src={gen.logoUrl || '/logo.png'} 
                alt="شعار مسجد سيد المرسلين" 
                className="relative h-24 w-24 md:h-28 md:w-28 object-contain rounded-3xl shadow-2xl shadow-emerald-600/10 border-2 border-white/60 dark:border-zinc-700/60 bg-white dark:bg-zinc-900 p-2"
              />
            </div>
          </div>

          <span className="inline-flex items-center gap-1 bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold px-3 py-1 rounded-full mb-4">
            أهلاً بكم في بيت من بيوت الله
          </span>
          
          <h2 className="text-3xl md:text-5xl font-black text-zinc-900 dark:text-white leading-tight tracking-tight">
            مرحباً بكم في <span className="text-emerald-700 dark:text-emerald-400">{gen.mosqueName}</span>
          </h2>
          
          <p className="mx-auto mt-4 max-w-2xl text-base md:text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            {gen.description}
          </p>

          {/* Social Quick Buttons */}
          <div className="mt-8 flex flex-wrap justify-center items-center gap-3">
            {gen.youtubeChannel && (
              <a 
                href={gen.youtubeChannel} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-5 py-2.5 rounded-2xl shadow-lg shadow-red-600/10 hover:shadow-red-600/25 transition-all duration-200"
              >
                <YoutubeIcon className="w-4 h-4 fill-current animate-pulse-slow" />
                <span>قناة اليوتيوب الرسمية</span>
              </a>
            )}

            {gen.facebookLink && (
              <a 
                href={gen.facebookLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-2xl shadow-lg shadow-blue-600/10 hover:shadow-blue-600/25 transition-all duration-200"
              >
                <FacebookIcon className="w-4 h-4 fill-current" />
                <span>صفحة الفيسبوك</span>
              </a>
            )}

            {gen.whatsappLink && (
              <a 
                href={gen.whatsappLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2.5 rounded-2xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/25 transition-all duration-200"
              >
                {/* Whatsapp is green, we map phone/whatsapp */}
                <Phone className="w-4 h-4 fill-current" />
                <span>مجموعة الواتساب</span>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* 3. Main Body Container (Prayer Times, Announcements, Sermons) */}
      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 flex-1 flex flex-col gap-12">
        
        {/* Dynamic Prayer Widget */}
        <section className="w-full">
          <PrayerTimesCard settings={pray} />
        </section>

        {/* Announcements section */}
        {announcements.length > 0 && (
          <section className="w-full animate-fade-in">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-6">
              <h3 className="text-xl font-extrabold text-zinc-950 dark:text-white flex items-center gap-2">
                <span className="w-2.5 h-6 bg-emerald-600 dark:bg-emerald-500 rounded-full"></span>
                أحدث الإعلانات والتنبيهات
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
        <section className="w-full">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-6">
            <h3 className="text-xl font-extrabold text-zinc-950 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-6 bg-emerald-600 dark:bg-emerald-500 rounded-full"></span>
              الخطب والتلاوات والدروس
            </h3>
            
            {gen.youtubeChannel && (
              <a 
                href={gen.youtubeChannel} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <span>شاهد المزيد على يوتيوب</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {lectures.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {lectures.map((lec) => (
                <LectureCard key={lec.id} lecture={lec} />
              ))}
            </div>
          ) : (
            <div className="w-full text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50">
              <p className="text-zinc-500">لا توجد محاضرات أو خطب مسجلة حالياً.</p>
            </div>
          )}
        </section>

      </main>

      {/* 4. Footer Section */}
      <footer className="mt-12 bg-white dark:bg-zinc-950 border-t border-zinc-200/50 dark:border-zinc-900/50">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Mosque details */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <img 
                  src={gen.logoUrl || '/logo.png'} 
                  alt="شعار المسجد" 
                  className="h-10 w-10 object-contain rounded-xl bg-white dark:bg-zinc-800 p-1 border border-zinc-200/50 dark:border-zinc-700/50 shadow-sm"
                />
                <h4 className="font-extrabold text-zinc-900 dark:text-white">{gen.mosqueName}</h4>
              </div>
              <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 max-w-sm">
                موقع متكامل يهدف لنشر قيم الإسلام السمحة وتقديم كافة الخدمات والفعاليات والدروس لمجتمع المصلين ومحبي العلم الشرعي.
              </p>
            </div>

            {/* Quick coordinates and contact */}
            <div className="flex flex-col gap-3">
              <h5 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">معلومات الاتصال</h5>
              <ul className="flex flex-col gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                  <span>{gen.contactPhone}</span>
                </li>
                <li>
                  <span>الموقع: إحداثيات خط العرض ({pray.latitude.toFixed(4)}) - خط الطول ({pray.longitude.toFixed(4)})</span>
                </li>
              </ul>
            </div>

            {/* Social channels and links */}
            <div className="flex flex-col gap-3">
              <h5 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">تابعونا على</h5>
              <div className="flex items-center gap-3">
                {gen.youtubeChannel && (
                  <a 
                    href={gen.youtubeChannel} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 transition-colors"
                  >
                    <YoutubeIcon className="w-5 h-5 fill-current" />
                  </a>
                )}
                {gen.facebookLink && (
                  <a 
                    href={gen.facebookLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/20 dark:text-blue-400 transition-colors"
                  >
                    <FacebookIcon className="w-5 h-5 fill-current" />
                  </a>
                )}
                <Link
                  href="/admin"
                  className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 transition-colors"
                  title="لوحة تحكم المشرف"
                >
                  <ShieldCheck className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-900/60 text-center text-[10px] text-zinc-400 dark:text-zinc-500">
            <p>جميع الحقوق محفوظة لمسجد سيد المرسلين © {new Date().getFullYear()}</p>
          </div>
        </div>
      </footer>

      {/* Floating Accessibility Controls for Eldely */}
      <AccessibilityWidget />
    </div>
  );
}
