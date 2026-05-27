'use client';

import React, { useState, useEffect } from 'react';
import { Type, Eye, Check, Sun, Moon } from 'lucide-react';

export default function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'larger'>('normal');
  const [highContrast, setHighContrast] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  // Load saved configurations on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Load font size
    const savedFontSize = localStorage.getItem('saed_font_size') as 'normal' | 'large' | 'larger' | null;
    if (savedFontSize) {
      setFontSize(savedFontSize);
    }
    
    // Load high contrast
    const savedContrast = localStorage.getItem('saed_high_contrast') === 'true';
    setHighContrast(savedContrast);

    // Load theme (defaults to system if not set)
    const savedTheme = localStorage.getItem('saed_theme') as 'light' | 'dark' | 'system' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme('system');
    }
  }, []);

  // Handle Font Size
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    if (fontSize === 'large') {
      root.style.fontSize = '112.5%'; // 1.125x scale (18px default instead of 16px)
    } else if (fontSize === 'larger') {
      root.style.fontSize = '125%'; // 1.25x scale (20px default instead of 16px)
    } else {
      root.style.fontSize = ''; // Default
    }
    localStorage.setItem('saed_font_size', fontSize);
  }, [fontSize]);

  // Handle High Contrast
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const body = document.body;
    if (highContrast) {
      body.classList.add('high-contrast');
    } else {
      body.classList.remove('high-contrast');
    }
    localStorage.setItem('saed_high_contrast', highContrast ? 'true' : 'false');
  }, [highContrast]);

  // Handle Light/Dark/System Mode DOM updates
  useEffect(() => {
    if (typeof window === 'undefined') return;
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

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
      
      // Dynamic listener for system preference change
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      applyTheme(theme);
    }
    localStorage.setItem('saed_theme', theme);
  }, [theme]);

  // Sync state with custom event from other theme togglers (like Header ThemeToggle)
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

  const handleSetTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('saed_theme', newTheme);
    window.dispatchEvent(new CustomEvent('saed_theme_changed', { detail: newTheme }));
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 font-sans select-none">
      {/* Floating Action Button - Large & highly visible for the elderly */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xl border-2 border-white/20 transition-all duration-300 hover:scale-105 active:scale-95"
        title="إعدادات سهولة القراءة والمظهر لكبار السن"
        aria-label="Accessibility settings"
      >
        <Type className="w-6 h-6" />
      </button>

      {/* Settings Menu Popup */}
      {isOpen && (
        <div className="absolute bottom-18 right-0 w-72 rounded-3xl bg-white p-6 shadow-2xl border border-zinc-200/80 dark:bg-zinc-900 dark:border-zinc-800 animate-fade-in flex flex-col gap-5">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h4 className="text-sm font-black text-zinc-900 dark:text-white">تسهيل القراءة والمظهر</h4>
            <p className="text-xs text-zinc-400 mt-1">تحسين تجربة القراءة وتكبير الخط لسهولة الاستخدام وكبار السن.</p>
          </div>

          {/* Option A: Font Size */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-extrabold text-zinc-700 dark:text-zinc-300">حجم الخط</span>
            <div className="grid grid-cols-3 gap-1 bg-zinc-50 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-850">
              <button
                onClick={() => setFontSize('normal')}
                className={`py-2 px-1 rounded-lg text-xs font-black transition-all ${
                  fontSize === 'normal'
                    ? 'bg-white text-emerald-700 shadow dark:bg-zinc-800 dark:text-emerald-400'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                عادي
              </button>
              <button
                onClick={() => setFontSize('large')}
                className={`py-2 px-1 rounded-lg text-xs font-black transition-all ${
                  fontSize === 'large'
                    ? 'bg-white text-emerald-700 shadow dark:bg-zinc-800 dark:text-emerald-400'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                كبير
              </button>
              <button
                onClick={() => setFontSize('larger')}
                className={`py-2 px-1 rounded-lg text-xs font-black transition-all ${
                  fontSize === 'larger'
                    ? 'bg-white text-emerald-700 shadow dark:bg-zinc-800 dark:text-emerald-400'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                كبير جداً
              </button>
            </div>
          </div>

          {/* Option B: Light/Dark/System Mode (3 columns, very clear) */}
          <div className="flex flex-col gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
            <span className="text-xs font-extrabold text-zinc-700 dark:text-zinc-300">وضع ألوان الشاشة</span>
            <div className="grid grid-cols-3 gap-1 bg-zinc-50 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-850">
              <button
                onClick={() => handleSetTheme('light')}
                className={`py-2 px-1 rounded-lg text-[10px] font-black transition-all ${
                  theme === 'light'
                    ? 'bg-white text-emerald-700 shadow dark:bg-zinc-800 dark:text-emerald-400 border border-zinc-200/50 dark:border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                نهاري (فاتح)
              </button>
              <button
                onClick={() => handleSetTheme('dark')}
                className={`py-2 px-1 rounded-lg text-[10px] font-black transition-all ${
                  theme === 'dark'
                    ? 'bg-white text-emerald-700 shadow dark:bg-zinc-800 dark:text-emerald-400 border border-zinc-200/50 dark:border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                ليلي (داكن)
              </button>
              <button
                onClick={() => handleSetTheme('system')}
                className={`py-2 px-1 rounded-lg text-[10px] font-black transition-all ${
                  theme === 'system'
                    ? 'bg-white text-emerald-700 shadow dark:bg-zinc-800 dark:text-emerald-400 border border-zinc-200/50 dark:border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                اتبع النظام
              </button>
            </div>
          </div>

          {/* Option C: Contrast Toggle */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-zinc-700 dark:text-zinc-300">ألوان عالية التباين</span>
              <span className="text-[11px] text-zinc-400 mt-0.5">تبسيط الألوان لتسهيل القراءة.</span>
            </div>
            <button
              onClick={() => setHighContrast(!highContrast)}
              className={`flex h-7 w-12 items-center rounded-full p-0.5 transition-colors duration-300 focus:outline-none shrink-0 ${
                highContrast ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-750'
              }`}
              aria-label="Toggle high contrast"
            >
              <span
                className={`h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
                  highContrast ? '-translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
