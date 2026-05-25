'use client';

import React, { useState, useEffect } from 'react';
import { PrayerSettings } from '../lib/types';
import { 
  calculatePrayerTimes, 
  getNextPrayer, 
  formatToArabic12, 
  NextPrayerInfo, 
  prayerArabicNames 
} from '../lib/prayerTimes';
import { Clock, Navigation, MapPin } from 'lucide-react';

interface PrayerTimesCardProps {
  settings: PrayerSettings;
}

export default function PrayerTimesCard({ settings }: PrayerTimesCardProps) {
  const [times, setTimes] = useState<{ [key: string]: string }>({});
  const [nextPrayer, setNextPrayer] = useState<NextPrayerInfo | null>(null);
  const [countdownStr, setCountdownStr] = useState<string>('');

  useEffect(() => {
    // Initial fetch
    const now = new Date();
    setTimes(calculatePrayerTimes(settings, now));
    
    const updateCountdown = () => {
      const currentDate = new Date();
      const next = getNextPrayer(settings, currentDate);
      setNextPrayer(next);

      // Format countdown seconds to HH:MM:SS
      const s = next.countdownSeconds;
      const hours = Math.floor(s / 3600).toString().padStart(2, '0');
      const minutes = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
      const seconds = (s % 60).toString().padStart(2, '0');
      setCountdownStr(`${hours}:${minutes}:${seconds}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [settings]);

  if (!times.Fajr || !nextPrayer) {
    return (
      <div className="w-full h-80 rounded-2xl glass-panel flex items-center justify-center animate-pulse">
        <span className="text-zinc-500 dark:text-zinc-400">جاري تحميل مواقيت الصلاة...</span>
      </div>
    );
  }

  const prayerKeys = ['Fajr', 'Shuruq', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

  return (
    <div className="w-full overflow-hidden rounded-3xl shadow-xl transition-all duration-300 hover:shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md">
      {/* Top Banner: Countdown */}
      <div className="relative bg-emerald-800 p-6 text-white dark:bg-emerald-950/60 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/20 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm animate-pulse-slow">
              <Clock className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <p className="text-xs text-emerald-200 font-medium">الصلاة القادمة</p>
              <h3 className="text-2xl font-bold text-white mt-0.5">
                صلاة {nextPrayer.arabicName}
              </h3>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end text-center md:text-right">
            <p className="text-xs text-emerald-200 font-medium">الوقت المتبقي للأذان</p>
            <div className="text-3xl font-mono font-bold text-amber-300 tracking-wider mt-1 drop-shadow" dir="ltr">
              {countdownStr}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Prayer Times List */}
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {prayerKeys.map((key) => {
            const isNext = nextPrayer.name === key;
            const arabicName = prayerArabicNames[key];
            const time12 = formatToArabic12(times[key]);

            return (
              <div
                key={key}
                className={`relative flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 ${
                  isNext
                    ? 'bg-gradient-to-b from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 border-2 border-emerald-500 shadow-md transform scale-[1.03]'
                    : 'bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-800/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30'
                }`}
              >
                {isNext && (
                  <span className="absolute -top-2.5 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    قريباً
                  </span>
                )}
                
                <span className={`text-sm font-medium ${isNext ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  {arabicName}
                </span>
                
                <span className={`text-xl font-bold font-mono mt-2 ${isNext ? 'text-emerald-900 dark:text-white' : 'text-zinc-800 dark:text-zinc-200'}`} dir="ltr">
                  {time12.split(' ')[0]}
                </span>
                
                <span className={`text-xs mt-0.5 ${isNext ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-400'}`}>
                  {time12.split(' ')[1] === 'ص' ? 'صباحاً' : 'مساءً'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer: Meta settings display */}
        <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-wrap justify-between items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>حسب الحسابات الفلكية للمسجد</span>
            <span className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full"></span>
            <span>
              {settings.useManualTimes ? 'إدخال يدوي' : `طريقة ${settings.calculationMethod === 'UmmAlQura' ? 'أم القرى' : 'المساحة المصرية'}`}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span>الموقع الجغرافي: </span>
            <span className="font-mono text-zinc-600 dark:text-zinc-300">
              ({settings.latitude.toFixed(4)}, {settings.longitude.toFixed(4)})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
