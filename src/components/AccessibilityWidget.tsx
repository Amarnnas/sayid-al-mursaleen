'use client';

import React, { useState, useEffect } from 'react';
import { Type, Eye, Check } from 'lucide-react';

export default function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'larger'>('normal');
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Handle Font Size
    const root = document.documentElement;
    if (fontSize === 'large') {
      root.style.fontSize = '112.5%'; // 1.125x scale (18px default instead of 16px)
    } else if (fontSize === 'larger') {
      root.style.fontSize = '125%'; // 1.25x scale (20px default instead of 16px)
    } else {
      root.style.fontSize = ''; // Default
    }
  }, [fontSize]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Handle High Contrast
    const body = document.body;
    if (highContrast) {
      body.classList.add('high-contrast');
    } else {
      body.classList.remove('high-contrast');
    }
  }, [highContrast]);

  return (
    <div className="fixed bottom-6 right-6 z-40 font-sans select-none">
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl border border-emerald-500/20 transition-all duration-300 hover:scale-105 active:scale-95"
        title="إعدادات سهولة الاستخدام لكبار السن"
        aria-label="Accessibility settings"
      >
        <Type className="w-5 h-5" />
      </button>

      {/* Settings Menu Popup */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-64 rounded-3xl bg-white p-5 shadow-2xl border border-zinc-200/60 dark:bg-zinc-900 dark:border-zinc-800/80 animate-fade-in flex flex-col gap-4">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-2">
            <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-100">تسهيل القراءة وكبار السن</h4>
            <p className="text-[10px] text-zinc-400 mt-0.5">تحسين تجربة القراءة وتكبير الخط لسهولة الاستخدام.</p>
          </div>

          {/* Option A: Font Size */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">حجم الخط</span>
            <div className="grid grid-cols-3 gap-1 bg-zinc-50 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-150 dark:border-zinc-800/50">
              <button
                onClick={() => setFontSize('normal')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all ${
                  fontSize === 'normal'
                    ? 'bg-white text-emerald-700 shadow-sm dark:bg-zinc-800 dark:text-emerald-400'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                عادي
              </button>
              <button
                onClick={() => setFontSize('large')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all ${
                  fontSize === 'large'
                    ? 'bg-white text-emerald-700 shadow-sm dark:bg-zinc-800 dark:text-emerald-400'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                كبير (+12%)
              </button>
              <button
                onClick={() => setFontSize('larger')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all ${
                  fontSize === 'larger'
                    ? 'bg-white text-emerald-700 shadow-sm dark:bg-zinc-800 dark:text-emerald-400'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                كبير جداً (+25%)
              </button>
            </div>
          </div>

          {/* Option B: Contrast Toggle */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">ألوان عالية التباين</span>
              <span className="text-[9px] text-zinc-400">يسهل القراءة في ظروف الإضاءة المختلفة.</span>
            </div>
            <button
              onClick={() => setHighContrast(!highContrast)}
              className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors duration-300 focus:outline-none ${
                highContrast ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'
              }`}
              aria-label="Toggle high contrast"
            >
              <span
                className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
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
