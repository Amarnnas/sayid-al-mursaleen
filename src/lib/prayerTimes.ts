import { Coordinates, CalculationMethod, Madhab, PrayerTimes } from 'adhan';
import { PrayerSettings, PrayerTimesManual } from './types';

// Helper to format minutes offset to a Date
const applyOffset = (date: Date, offsetMinutes: number): Date => {
  return new Date(date.getTime() + offsetMinutes * 60 * 1000);
};

// Helper to format Date to HH:MM (24-hour)
export const formatTime24 = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Helper to format HH:MM to 12-hour Arabic format (e.g. 01:30 م / 04:15 ص)
export const formatToArabic12 = (time24: string): string => {
  if (!time24) return '';
  const [hoursStr, minutesStr] = time24.split(':');
  const hours = parseInt(hoursStr, 10);
  const ampm = hours >= 12 ? 'م' : 'ص';
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  const formattedHours = hours12.toString().padStart(2, '0');
  return `${formattedHours}:${minutesStr} ${ampm}`;
};

// Helper to parse HH:MM to Date object for today
export const parseTime24ToDate = (time24: string, baseDate = new Date()): Date => {
  const [hoursStr, minutesStr] = time24.split(':');
  const result = new Date(baseDate);
  result.setHours(parseInt(hoursStr, 10));
  result.setMinutes(parseInt(minutesStr, 10));
  result.setSeconds(0);
  result.setMilliseconds(0);
  return result;
};

// Main prayer times retrieval function
export const calculatePrayerTimes = (
  settings: PrayerSettings,
  date = new Date()
): { [key: string]: string } => {
  // If manual override is enabled
  if (settings.useManualTimes) {
    return settings.manualTimes as unknown as { [key: string]: string };
  }

  // Calculate using adhan library
  const coordinates = new Coordinates(settings.latitude, settings.longitude);
  
  // Resolve Calculation Method
  let method = CalculationMethod.UmmAlQura();
  switch (settings.calculationMethod) {
    case 'Egyptian':
      method = CalculationMethod.Egyptian();
      break;
    case 'MWL':
      method = CalculationMethod.MuslimWorldLeague();
      break;
    case 'Karachi':
      method = CalculationMethod.Karachi();
      break;
    case 'NorthAmerica':
      method = CalculationMethod.NorthAmerica();
      break;
    case 'Kuwait':
      method = CalculationMethod.Kuwait();
      break;
    case 'Qatar':
      method = CalculationMethod.Qatar();
      break;
    case 'Singapore':
      method = CalculationMethod.Singapore();
      break;
    case 'Moonsighting':
      method = CalculationMethod.UmmAlQura();
      break;
    case 'UmmAlQura':
    default:
      method = CalculationMethod.UmmAlQura();
      break;
  }

  // Resolve Madhab
  const madhab = settings.madhab === 'Hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  
  // Set parameters
  const params = method;
  params.madhab = madhab;

  // Compute base times
  const prayerTimesObj = new PrayerTimes(coordinates, date, params);

  // Map to list
  const rawTimes = {
    Fajr: prayerTimesObj.fajr,
    Shuruq: prayerTimesObj.sunrise,
    Dhuhr: prayerTimesObj.dhuhr,
    Asr: prayerTimesObj.asr,
    Maghrib: prayerTimesObj.maghrib,
    Isha: prayerTimesObj.isha,
  };

  // Apply manual minute offsets
  const computedTimes: { [key: string]: string } = {};
  Object.keys(rawTimes).forEach((key) => {
    const rawDate = rawTimes[key as keyof typeof rawTimes];
    const offset = settings.manualOffsets[key as keyof typeof settings.manualOffsets] || 0;
    const finalDate = applyOffset(rawDate, offset);
    computedTimes[key] = formatTime24(finalDate);
  });

  return computedTimes;
};

export interface NextPrayerInfo {
  name: string;
  arabicName: string;
  time: string;
  countdownSeconds: number;
}

export const prayerArabicNames: { [key: string]: string } = {
  Fajr: 'الفجر',
  Shuruq: 'الشروق',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

// Calculate which prayer is next and the countdown in seconds
export const getNextPrayer = (
  settings: PrayerSettings,
  now = new Date()
): NextPrayerInfo => {
  const times = calculatePrayerTimes(settings, now);
  const prayerOrder = ['Fajr', 'Shuruq', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  
  // Parse all times to Date objects for today
  const prayerDates = prayerOrder.map((name) => {
    return {
      name,
      arabicName: prayerArabicNames[name],
      time: times[name],
      date: parseTime24ToDate(times[name], now),
    };
  });

  // Find the first prayer whose time is in the future
  let next = prayerDates.find((p) => p.date.getTime() > now.getTime());

  // If no prayer is in the future today, it means the next prayer is Fajr tomorrow
  if (!next) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowTimes = calculatePrayerTimes(settings, tomorrow);
    const tomorrowFajrDate = parseTime24ToDate(tomorrowTimes.Fajr, tomorrow);
    
    return {
      name: 'Fajr',
      arabicName: prayerArabicNames.Fajr,
      time: tomorrowTimes.Fajr,
      countdownSeconds: Math.floor((tomorrowFajrDate.getTime() - now.getTime()) / 1000),
    };
  }

  return {
    name: next.name,
    arabicName: next.arabicName,
    time: next.time,
    countdownSeconds: Math.floor((next.date.getTime() - now.getTime()) / 1000),
  };
};
