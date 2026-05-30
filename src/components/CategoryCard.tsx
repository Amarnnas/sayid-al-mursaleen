'use client';

import React from 'react';
import { Category } from '../lib/types';
import { FolderOpen } from 'lucide-react';
import Link from 'next/link';

interface CategoryCardProps {
  category: Category;
  lectureCount: number;
}

export default function CategoryCard({ category, lectureCount }: CategoryCardProps) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group flex flex-col items-center justify-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition-colors duration-300">
        <FolderOpen className="w-7 h-7" />
      </div>
      <h4 className="text-sm font-extrabold text-zinc-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
        {category.name}
      </h4>
      <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
        {lectureCount} {lectureCount === 1 ? 'مادة' : 'مواد'}
      </span>
    </Link>
  );
}