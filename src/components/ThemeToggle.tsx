'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  // Load saved theme on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedTheme = localStorage.getItem('saed_theme') as 'light' | 'dark' | 'system' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Sync state with custom event from other theme togglers (like AccessibilityWidget)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleThemeChanged = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setTheme(customEvent.detail);
      }
    };

    window.addEventListener('saed_theme_changed', handleThemeChanged);
    return () => window.removeEventListener('saed_theme_changed', handleThemeChanged);
  }, []);

  const changeTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('saed_theme', newTheme);
    
    // Dispatch event to sync other widgets on the page
    window.dispatchEvent(new CustomEvent('saed_theme_changed', { detail: newTheme }));

    // Apply classes immediately
    const root = document.documentElement;
    const applyTheme = (t: 'light' | 'dark') => {
      if (t === 'dark') {
        root.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        root.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    };

    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
    } else {
      applyTheme(newTheme);
    }
  };

  return (
    <div 
      className="flex items-center gap-0.5 bg-zinc-100 p-0.5 rounded-xl border border-zinc-200/50 dark:bg-zinc-900 dark:border-zinc-800 shrink-0 select-none font-sans"
      title="مظهر الشاشة"
    >
      <button
        onClick={() => changeTheme('light')}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 ${
          theme === 'light'
            ? 'bg-white text-emerald-700 shadow-sm border border-zinc-200/30 dark:bg-zinc-800 dark:text-emerald-400 dark:border-zinc-700/50'
            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`}
        title="وضع نهاري (مضيء)"
        aria-label="Light mode"
      >
        <Sun className="w-3.5 h-3.5" />
        <span className="hidden sm:inline text-[10px]">فاتح</span>
      </button>

      <button
        onClick={() => changeTheme('dark')}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 ${
          theme === 'dark'
            ? 'bg-white text-emerald-700 shadow-sm border border-zinc-200/30 dark:bg-zinc-800 dark:text-emerald-400 dark:border-zinc-700/50'
            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`}
        title="وضع ليلي (داكن)"
        aria-label="Dark mode"
      >
        <Moon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline text-[10px]">داكن</span>
      </button>

      <button
        onClick={() => changeTheme('system')}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 ${
          theme === 'system'
            ? 'bg-white text-emerald-700 shadow-sm border border-zinc-200/30 dark:bg-zinc-800 dark:text-emerald-400 dark:border-zinc-700/50'
            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`}
        title="اتبع النظام"
        aria-label="Follow system theme"
      >
        <Laptop className="w-3.5 h-3.5" />
        <span className="text-[10px]">اتبع النظام</span>
      </button>
    </div>
  );
}
