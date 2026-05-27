'use client';

import React from 'react';
import { Lecture } from '../lib/types';
import { Play, User, Calendar } from 'lucide-react';
import { getYouTubeId } from '../lib/firebase/db';
import Link from 'next/link';

interface LectureCardProps {
  lecture: Lecture;
  categoryNames?: string[];
}

export default function LectureCard({ lecture, categoryNames }: LectureCardProps) {
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

  return (
    <Link 
      href={targetHref}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-zinc-200/60 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800/60 dark:bg-zinc-900 flex flex-col h-full"
    >
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

          <h4 className="text-sm font-bold leading-snug text-zinc-900 group-hover:text-emerald-700 dark:text-zinc-100 dark:group-hover:text-emerald-400 transition-colors duration-200 line-clamp-2">
            {lecture.title}
          </h4>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
            {lecture.description}
          </p>
        </div>

        {/* Categories labels on the card */}
        {categoryNames && categoryNames.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-4 pt-3 border-t border-zinc-150 dark:border-zinc-800/60">
            {categoryNames.map((name, idx) => (
              <span key={idx} className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                {name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
