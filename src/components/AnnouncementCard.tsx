import React from 'react';
import { Announcement } from '../lib/types';
import { Megaphone, Calendar } from 'lucide-react';

interface AnnouncementCardProps {
  announcement: Announcement;
}

export default function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  // Format date elegantly in Arabic
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800/60 dark:bg-zinc-900">
      <div className="absolute top-0 right-0 h-1.5 w-full bg-emerald-600 dark:bg-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-right"></div>
      
      <div className="flex flex-col gap-3">
        {/* Header Metadata */}
        <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
            <span>{formatDate(announcement.createdAt)}</span>
          </div>
          <span className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">
            <Megaphone className="w-3 h-3" />
            إعلان هام
          </span>
        </div>

        {/* Title */}
        <h4 className="text-lg font-bold text-zinc-900 group-hover:text-emerald-700 dark:text-zinc-100 dark:group-hover:text-emerald-400 transition-colors duration-200">
          {announcement.title}
        </h4>

        {/* Content */}
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 whitespace-pre-line">
          {announcement.content}
        </p>

        {announcement.imageUrl && (
          <div className="mt-3 overflow-hidden rounded-xl">
            <img 
              src={announcement.imageUrl} 
              alt={announcement.title} 
              className="w-full object-cover max-h-48 transform group-hover:scale-102 transition-transform duration-300"
            />
          </div>
        )}
      </div>
    </div>
  );
}
