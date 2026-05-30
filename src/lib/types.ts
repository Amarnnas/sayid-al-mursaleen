export interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  createdAt: number; // millisecond timestamp
}

export interface Lecture {
  id: string;
  title: string;
  description: string;
  sheikh: string;
  youtubeUrl: string;
  thumbnailUrl?: string;
  categoryIds?: string[]; // IDs of associated categories
  mp3Url?: string; // external direct audio link
  slug?: string; // slug for clean URLs
  views?: number; // total views count
  downloads?: number; // total downloads count
  createdAt: number; // millisecond timestamp
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: number; // millisecond timestamp
  isActive: boolean;
}

export interface GeneralSettings {
  mosqueName: string;
  logoUrl: string;
  description: string;
  contactPhone: string;
  contactEmail?: string;
  whatsappLink: string;
  facebookLink: string;
  youtubeChannel: string;
  liveStreamUrl: string;
  tiktokLink?: string;
}

export interface PrayerOffsets {
  Fajr: number;
  Shuruq: number;
  Dhuhr: number;
  Asr: number;
  Maghrib: number;
  Isha: number;
}

export interface PrayerTimesManual {
  Fajr: string; // e.g. "04:30"
  Shuruq: string; // e.g. "06:00"
  Dhuhr: string; // e.g. "12:15"
  Asr: string; // e.g. "15:30"
  Maghrib: string; // e.g. "18:45"
  Isha: string; // e.g. "20:00"
}

export interface PrayerSettings {
  calculationMethod: 'Egyptian' | 'UmmAlQura' | 'MWL' | 'Karachi' | 'Moonsighting' | 'NorthAmerica' | 'Kuwait' | 'Qatar' | 'Singapore';
  madhab: 'Shafi' | 'Hanafi';
  manualOffsets: PrayerOffsets;
  manualTimes: PrayerTimesManual;
  useManualTimes: boolean;
  latitude: number;
  longitude: number;
}

export interface Admin {
  id: string; // doc ID is lowercase email
  email: string;
  role: 'super_admin' | 'admin';
  password?: string;
  createdAt: number;
}
