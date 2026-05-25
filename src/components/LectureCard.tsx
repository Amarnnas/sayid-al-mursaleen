'use client';

import React, { useState } from 'react';
import { Lecture } from '../lib/types';
import { Play, User, Calendar, X } from 'lucide-react';
import { getYouTubeId } from '../lib/firebase/db';

interface LectureCardProps {
  lecture: Lecture;
}

export default function LectureCard({ lecture }: LectureCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const videoId = getYouTubeId(lecture.youtubeUrl);

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        className="group cursor-pointer overflow-hidden rounded-2xl border border-zinc-200/60 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800/60 dark:bg-zinc-900"
      >
        {/* YouTube Thumbnail Wrapper */}
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          <img 
            src={lecture.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} 
            alt={lecture.title} 
            className="h-full w-full object-cover transform group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          
          {/* Overlay Darkener */}
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300"></div>
          
          {/* Custom Play Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-emerald-800 shadow-lg transform group-hover:scale-110 transition-all duration-300 backdrop-blur-sm dark:bg-zinc-950/90 dark:text-emerald-400">
              <Play className="w-6 h-6 fill-current translate-x-[-1px]" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-5">
          <div className="flex items-center gap-4 text-xs text-zinc-400 dark:text-zinc-500 mb-2">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
              {lecture.sheikh}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
              {formatDate(lecture.createdAt)}
            </span>
          </div>

          <h4 className="text-base font-bold leading-snug text-zinc-900 group-hover:text-emerald-700 dark:text-zinc-100 dark:group-hover:text-emerald-400 transition-colors duration-200 line-clamp-2">
            {lecture.title}
          </h4>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
            {lecture.description}
          </p>
        </div>
      </div>

      {/* Video Modal Box */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl border border-zinc-800">
            {/* Close Button */}
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 left-4 z-10 p-2 text-white bg-black/40 hover:bg-black/60 rounded-full transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title Display */}
            <div className="p-4 bg-zinc-950 text-white border-b border-zinc-800 pr-12">
              <h3 className="font-bold text-lg truncate text-right">{lecture.title}</h3>
            </div>

            {/* Video Iframe Container */}
            <div className="relative aspect-video w-full">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                title={lecture.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
