'use client';

import React, { useState } from 'react';
import { Lecture } from '../lib/types';
import { Play, User, Calendar, Download, Loader2 } from 'lucide-react';
import { getYouTubeId, incrementLectureDownloads } from '../lib/firebase/db';
import Link from 'next/link';
import Toast from './Toast';

interface LectureCardProps {
  lecture: Lecture;
  categoryNames?: string[];
}

export default function LectureCard({ lecture, categoryNames }: LectureCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const videoId = getYouTubeId(lecture.youtubeUrl);
  const targetHref = `/lectures/${lecture.slug || lecture.id}`;

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!lecture.mp3Url) return;

    setDownloading(true);
    setToast(null);

    try {
      // 1. Increment downloads in DB
      await incrementLectureDownloads(lecture.id);

      // 2. Format proxy download URL
      const safeFilename = `${lecture.title.replace(/[\\/:*?"<>|]/g, '')}.mp3`;
      const downloadUrl = `/api/download?url=${encodeURIComponent(lecture.mp3Url)}&filename=${encodeURIComponent(safeFilename)}`;

      // 3. Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', safeFilename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed:', err);
      setToast({ message: 'تعذر تحميل الملف', type: 'error' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div 
      className="group overflow-hidden rounded-2xl border border-zinc-200/60 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800/60 dark:bg-zinc-900 flex flex-col h-full relative"
    >
      {/* Toast Portal/Overlay */}
      {toast && (
        <div className="fixed bottom-5 left-5 z-50 max-w-sm w-full px-4 md:px-0">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Main Link for lecture page navigation (excluding bottom action) */}
      <Link href={targetHref} className="flex-1 flex flex-col">
        {/* YouTube Thumbnail Wrapper */}
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          <img 
            src={lecture.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} 
            alt={lecture.title} 
            className="h-full w-full object-cover transform group-hover:scale-103 transition-transform duration-300"
            loading="lazy"
          />
          
          {/* Overlay Darkener */}
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/35 transition-colors duration-300"></div>
          
          {/* Custom Play Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-emerald-800 shadow-lg transform group-hover:scale-108 transition-all duration-300 backdrop-blur-sm dark:bg-zinc-950/90 dark:text-emerald-400">
              <Play className="w-6 h-6 fill-current translate-x-[-1px]" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-5 flex flex-col justify-between flex-1">
          <div>
            <div className="flex items-center gap-3 text-[10px] text-zinc-400 dark:text-zinc-500 mb-2">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
                {lecture.sheikh}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
                {formatDate(lecture.createdAt)}
              </span>
            </div>

            <h4 className="text-sm font-extrabold leading-snug text-zinc-900 group-hover:text-emerald-700 dark:text-zinc-100 dark:group-hover:text-emerald-400 transition-colors duration-200 line-clamp-2">
              {lecture.title}
            </h4>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed font-medium">
              {lecture.description}
            </p>
          </div>

          {/* Categories labels on the card */}
          {categoryNames && categoryNames.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-4 pt-3 border-t border-zinc-150 dark:border-zinc-800/60">
              {categoryNames.map((name, idx) => (
                <span key={idx} className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>

      {/* Direct MP3 Download Button */}
      {lecture.mp3Url && (
        <div className="px-5 pb-5 pt-1 border-t border-zinc-50 dark:border-zinc-800/20 shrink-0">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-650 active:scale-97 text-white font-extrabold text-xs py-3.5 rounded-xl transition-all duration-200 shadow-sm hover:shadow-emerald-600/10 cursor-pointer disabled:cursor-not-allowed"
            title="تحميل الصوت MP3 مباشرة على جهازك"
            aria-label={`تحميل الصوت MP3 للمحاضرة: ${lecture.title}`}
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري التجهيز...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>تحميل الصوت MP3</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
