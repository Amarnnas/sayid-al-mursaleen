export interface Lecture {
  id: string;
  title: string;
  description: string;
  sheikh: string;
  youtubeUrl: string;
  thumbnailUrl?: string;
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
  whatsappLink: string;
  facebookLink: string;
  youtubeChannel: string;
  liveStreamUrl: string;
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
  createdAt: number;
}
