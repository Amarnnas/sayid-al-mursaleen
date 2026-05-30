import { db, auth } from './config';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { Lecture, Announcement, GeneralSettings, PrayerSettings, Admin, Category } from '../types';

// Check if we are running in the browser
const isBrowser = typeof window !== 'undefined';

// Check if Firebase is actually configured with real keys
export const isFirebaseConfigured = (): boolean => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  
  return !!(
    apiKey && 
    apiKey !== 'mock-api-key' &&
    apiKey !== 'dummy-api-key-for-build' &&
    projectId &&
    projectId !== 'mock-project-id' &&
    projectId !== 'dummy-project'
  );
};

// Helper to wrap database promises with a 15-second timeout to prevent any offline hangs
function withDbTimeout<T>(promise: Promise<T>, timeoutMs = 15000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Database operation timed out"));
    }, timeoutMs);
    
    promise.then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// Helper to extract YouTube Video ID
export const getYouTubeId = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/i;
  const match = trimmed.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
};

// Helper to get YouTube Thumbnail URL
export const getYouTubeThumbnail = (url: string): string => {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
};

// Slug generation utility (handles Arabic and English)
export const generateSlug = (text: string): string => {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '') // Keep alphanumeric, Arabic, spaces and hyphens
    .replace(/\s+/g, '-') // spaces to hyphens
    .replace(/-+/g, '-'); // collapse multiple hyphens
};

// --- DEFAULT SEED DATA ---
const defaultGeneralSettings: GeneralSettings = {
  mosqueName: "مسجد سيد المرسلين",
  logoUrl: "/logo.png",
  description: "الموقع الرسمي لمسجد سيد المرسلين. نسعى لتقديم الخدمات الدينية والثقافية، وإقامة شعائر الصلوات الخمس والجمعة، ونشر تعاليم الإسلام السمحة.",
  contactPhone: "+201000000000",
  contactEmail: "",
  whatsappLink: "https://wa.me/33700000000", // placeholder or real link
  facebookLink: "https://facebook.com",
  youtubeChannel: "https://www.youtube.com/@OfficialSydAL-Mursalin",
  liveStreamUrl: "",
  tiktokLink: ""
};

const defaultPrayerSettings: PrayerSettings = {
  calculationMethod: "UmmAlQura",
  madhab: "Shafi",
  manualOffsets: { Fajr: 0, Shuruq: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
  manualTimes: {
    Fajr: "04:15",
    Shuruq: "05:45",
    Dhuhr: "12:30",
    Asr: "16:00",
    Maghrib: "19:15",
    Isha: "20:45"
  },
  useManualTimes: false,
  latitude: 30.0444, // Cairo default
  longitude: 31.2357
};

export const defaultCategories: Category[] = [
  { id: "cat-1", name: "خطب الجمعة", slug: "friday-sermons", sortOrder: 1, createdAt: Date.now() },
  { id: "cat-2", name: "التلاوات", slug: "recitations", sortOrder: 2, createdAt: Date.now() },
  { id: "cat-3", name: "الدروس", slug: "lessons", sortOrder: 3, createdAt: Date.now() },
  { id: "cat-4", name: "الثلاثيات الدعوية", slug: "three-minute-reminders", sortOrder: 4, createdAt: Date.now() },
  { id: "cat-5", name: "الرباعيات الدعوية", slug: "four-minute-reminders", sortOrder: 5, createdAt: Date.now() },
  { id: "cat-6", name: "التلاوات في الصلاة", slug: "prayer-recitations", sortOrder: 6, createdAt: Date.now() }
];

const defaultLectures: Lecture[] = [
  {
    id: "lecture-1",
    title: "خطبة الجمعة المباركة - خطبة مؤثرة وقيمة",
    description: "تسجيل من خطب مسجد سيد المرسلين الرسمية على اليوتيوب.",
    sheikh: "خطيب المسجد",
    youtubeUrl: "https://youtu.be/Vs2ibIIJrSk?si=VfUCUAQMV_WjV6R3",
    thumbnailUrl: "https://img.youtube.com/vi/Vs2ibIIJrSk/hqdefault.jpg",
    categoryIds: ["cat-1"],
    slug: "friday-sermon-lecture-1",
    views: 142,
    downloads: 12,
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000 // 3 days ago
  },
  {
    id: "lecture-2",
    title: "من خطب الجمعة المتميزة ومواعظ الإيمان",
    description: "موعظة إيمانية هامة من الخطب الأسبوعية المباركة بالمسجد.",
    sheikh: "خطيب المسجد",
    youtubeUrl: "https://youtu.be/sLNkh_Ulv4g?si=x17Gm7o27MabZb4L",
    thumbnailUrl: "https://img.youtube.com/vi/sLNkh_Ulv4g/hqdefault.jpg",
    categoryIds: ["cat-1", "cat-3"],
    slug: "excellent-friday-sermons-2",
    views: 89,
    downloads: 5,
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days ago
  },
  {
    id: "lecture-3",
    title: "درس أسبوعي وخطبة مباركة حول العقيدة والسلوك",
    description: "مادة مسجلة ومرفوعة على قناة المسجد الرسمية.",
    sheikh: "دعاة المسجد",
    youtubeUrl: "https://youtu.be/2vn5Gp2gsXc?si=WxOeuvxIxqlVCC-Y",
    thumbnailUrl: "https://img.youtube.com/vi/2vn5Gp2gsXc/hqdefault.jpg",
    categoryIds: ["cat-3"],
    slug: "weekly-lesson-creed-3",
    views: 65,
    downloads: 2,
    createdAt: Date.now() - 12 * 24 * 60 * 60 * 1000 // 12 days ago
  },
  {
    id: "lecture-4",
    title: "تلاوة قرآنية خاشعة ومؤثرة بصوت ندي",
    description: "تلاوة خاشعة مميزة من الصلوات الجهرية بمسجد سيد المرسلين.",
    sheikh: "إمام المسجد",
    youtubeUrl: "https://youtu.be/vo48qB1gSxI?si=c9xuELkHpMaAzoLj",
    thumbnailUrl: "https://img.youtube.com/vi/vo48qB1gSxI/hqdefault.jpg",
    categoryIds: ["cat-2", "cat-6"],
    slug: "touching-recitation-mosque-4",
    views: 204,
    downloads: 48,
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000 // 15 days ago
  }
];

const defaultAnnouncements: Announcement[] = [
  {
    id: "ann-1",
    title: "إطلاق الموقع الإلكتروني الرسمي للمسجد",
    content: "تم بفضل الله وتوفيقه إطلاق الموقع الإلكتروني الرسمي لمسجد سيد المرسلين لمتابعة مواقيت الصلاة المحدثة والخطب الأسبوعية والإعلانات أولاً بأول.",
    imageUrl: "",
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    isActive: true
  },
  {
    id: "ann-2",
    title: "بدء التسجيل لحلقة تحفيظ القرآن الأسبوعية",
    content: "يسر إدارة المسجد الإعلان عن حلقة تحفيظ وتجويد القرآن الكريم للأطفال والشباب، كل يوم سبت بعد صلاة العصر بمكتبة المسجد. يُرجى التنسيق مع إمام المسجد للتسجيل.",
    imageUrl: "",
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    isActive: true
  }
];

const defaultAdmins: Admin[] = [
  {
    id: "am2004arnasir@gmail.com".toLowerCase(),
    email: "am2004arnasir@gmail.com",
    role: "super_admin",
    createdAt: Date.now()
  }
];

// --- MOCK STORAGE FALLBACK ---
const mockDb = {
  get: (key: string, defaultValue: any) => {
    if (!isBrowser) return defaultValue;
    const val = localStorage.getItem(`saed_${key}`);
    return val ? JSON.parse(val) : defaultValue;
  },
  set: (key: string, value: any) => {
    if (!isBrowser) return;
    localStorage.setItem(`saed_${key}`, JSON.stringify(value));
  }
};

// Ensure default structures are seeded in LocalStorage mock
const ensureMockSeeded = () => {
  if (!isBrowser) return;
  if (!localStorage.getItem('saed_general_settings')) {
    mockDb.set('general_settings', defaultGeneralSettings);
  }
  if (!localStorage.getItem('saed_prayer_settings')) {
    mockDb.set('prayer_settings', defaultPrayerSettings);
  }
  if (!localStorage.getItem('saed_categories')) {
    mockDb.set('categories', defaultCategories);
  }
  if (!localStorage.getItem('saed_lectures')) {
    mockDb.set('lectures', defaultLectures);
  }
  if (!localStorage.getItem('saed_announcements')) {
    mockDb.set('announcements', defaultAnnouncements);
  }
  if (!localStorage.getItem('saed_admins')) {
    mockDb.set('admins', defaultAdmins);
  }
};

// Initialize seeding for mock mode
ensureMockSeeded();

// ==========================================
// DB SERVICE ACTIONS (AUTO SWITCHING)
// ==========================================

// 1. GENERAL SETTINGS
export const getGeneralSettings = async (): Promise<GeneralSettings> => {
  if (isFirebaseConfigured()) {
    try {
      const docRef = doc(db, 'settings', 'general');
      const docSnap = await withDbTimeout(getDoc(docRef));
      if (docSnap.exists()) {
        return docSnap.data() as GeneralSettings;
      } else {
        // Seed default settings to Firestore
        await withDbTimeout(setDoc(docRef, defaultGeneralSettings));
        return defaultGeneralSettings;
      }
    } catch (e) {
      console.warn("Firebase failed, falling back to LocalStorage mock", e);
    }
  }
  return mockDb.get('general_settings', defaultGeneralSettings);
};

export const saveGeneralSettings = async (settings: GeneralSettings): Promise<void> => {
  if (isFirebaseConfigured()) {
    try {
      const docRef = doc(db, 'settings', 'general');
      await withDbTimeout(setDoc(docRef, settings, { merge: true }));
      return;
    } catch (e) {
      console.error("Firebase saveGeneralSettings error:", e);
    }
  }
  mockDb.set('general_settings', settings);
};

// 2. PRAYER SETTINGS
export const getPrayerSettings = async (): Promise<PrayerSettings> => {
  if (isFirebaseConfigured()) {
    try {
      const docRef = doc(db, 'settings', 'prayer');
      const docSnap = await withDbTimeout(getDoc(docRef));
      if (docSnap.exists()) {
        return docSnap.data() as PrayerSettings;
      } else {
        // Seed default to Firestore
        await withDbTimeout(setDoc(docRef, defaultPrayerSettings));
        return defaultPrayerSettings;
      }
    } catch (e) {
      console.warn("Firebase failed, falling back to LocalStorage mock", e);
    }
  }
  return mockDb.get('prayer_settings', defaultPrayerSettings);
};

export const savePrayerSettings = async (settings: PrayerSettings): Promise<void> => {
  if (isFirebaseConfigured()) {
    try {
      const docRef = doc(db, 'settings', 'prayer');
      await setDoc(docRef, settings, { merge: true });
      return;
    } catch (e) {
      console.error("Firebase savePrayerSettings error:", e);
    }
  }
  mockDb.set('prayer_settings', settings);
};

// 3. ANNOUNCEMENTS
export const getAnnouncements = async (onlyActive = false): Promise<Announcement[]> => {
  if (isFirebaseConfigured()) {
    try {
      const collRef = collection(db, 'announcements');
      let q = query(collRef, orderBy('createdAt', 'desc'));
      if (onlyActive) {
        q = query(collRef, where('isActive', '==', true), orderBy('createdAt', 'desc'));
      }
      const querySnap = await withDbTimeout(getDocs(q));
      const list: Announcement[] = [];
      querySnap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Announcement);
      });
      return list;
    } catch (e) {
      console.warn("Firebase failed, falling back to LocalStorage mock", e);
    }
  }
  
  const all: Announcement[] = mockDb.get('announcements', defaultAnnouncements);
  // Sort descending by date
  const sorted = all.sort((a, b) => b.createdAt - a.createdAt);
  return onlyActive ? sorted.filter(a => a.isActive) : sorted;
};

export const addAnnouncement = async (ann: Omit<Announcement, 'id'>): Promise<string> => {
  if (isFirebaseConfigured()) {
    const docRef = await withDbTimeout(addDoc(collection(db, 'announcements'), ann));
    return docRef.id;
  }
  
  const newId = `ann-${Date.now()}`;
  const fullAnn: Announcement = { ...ann, id: newId };
  const current: Announcement[] = mockDb.get('announcements', defaultAnnouncements);
  current.push(fullAnn);
  mockDb.set('announcements', current);
  return newId;
};

export const updateAnnouncement = async (id: string, updates: Partial<Announcement>): Promise<void> => {
  if (isFirebaseConfigured()) {
    const docRef = doc(db, 'announcements', id);
    await withDbTimeout(updateDoc(docRef, updates));
    return;
  }
  
  const current: Announcement[] = mockDb.get('announcements', defaultAnnouncements);
  const updated = current.map(item => item.id === id ? { ...item, ...updates } : item);
  mockDb.set('announcements', updated);
};

export const deleteAnnouncement = async (id: string): Promise<void> => {
  if (isFirebaseConfigured()) {
    const docRef = doc(db, 'announcements', id);
    await withDbTimeout(deleteDoc(docRef));
    return;
  }
  
  const current: Announcement[] = mockDb.get('announcements', defaultAnnouncements);
  const filtered = current.filter(item => item.id !== id);
  mockDb.set('announcements', filtered);
};

// 4. LECTURES
export const getLectures = async (): Promise<Lecture[]> => {
  if (isFirebaseConfigured()) {
    try {
      const collRef = collection(db, 'lectures');
      const q = query(collRef, orderBy('createdAt', 'desc'));
      const querySnap = await withDbTimeout(getDocs(q));
      const list: Lecture[] = [];
      querySnap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Lecture);
      });
      return list;
    } catch (e) {
      console.warn("Firebase failed, falling back to LocalStorage mock", e);
    }
  }
  
  const all: Lecture[] = mockDb.get('lectures', defaultLectures);
  return all.sort((a, b) => b.createdAt - a.createdAt);
};

export const getLectureBySlugOrId = async (slugOrId: string): Promise<Lecture | null> => {
  const decoded = decodeURIComponent(slugOrId || '').trim();
  const raw = (slugOrId || '').trim();
  
  if (isFirebaseConfigured()) {
    try {
      // 1. Try fetching by Document ID first (if it looks like a valid Firestore ID or prefixed mock ID)
      if (raw.startsWith('lec-') || raw.length > 15) {
        const docRef = doc(db, 'lectures', raw);
        const docSnap = await withDbTimeout(getDoc(docRef), 10000);
        if (docSnap.exists()) {
          return { id: docSnap.id, ...docSnap.data() } as Lecture;
        }
      }
      
      // 2. Try querying by slug or id using a simple query or collection fetch
      const collRef = collection(db, 'lectures');
      const querySnap = await withDbTimeout(getDocs(collRef), 10000);
      
      let found: Lecture | null = null;
      querySnap.forEach((doc) => {
        const data = doc.data() as Lecture;
        const lId = doc.id;
        const lSlug = data.slug || '';
        
        if (
          lId === raw || 
          lId === decoded ||
          lSlug === raw || 
          lSlug === decoded ||
          decodeURIComponent(lSlug) === decoded ||
          lSlug.toLowerCase() === decoded.toLowerCase()
        ) {
          found = { ...data, id: lId };
        }
      });
      
      if (found) return found;
    } catch (e) {
      console.error("Firebase getLectureBySlugOrId error, falling back to mock", e);
    }
  }
  
  // LocalStorage / Mock fallback
  const all: Lecture[] = mockDb.get('lectures', defaultLectures);
  const found = all.find(l => {
    const lSlug = l.slug || '';
    const lId = l.id || '';
    return (
      lId === raw || 
      lId === decoded ||
      lSlug === raw || 
      lSlug === decoded ||
      decodeURIComponent(lSlug) === decoded ||
      lSlug.toLowerCase() === decoded.toLowerCase()
    );
  });
  return found || null;
};


export const isLectureDuplicate = async (youtubeUrl: string, excludeId?: string): Promise<boolean> => {
  const videoId = getYouTubeId(youtubeUrl);
  if (!videoId) return false;
  
  const lectures = await getLectures();
  const lowerUrl = youtubeUrl.trim().toLowerCase();
  const lowerVideoId = videoId.toLowerCase();
  
  return lectures.some(lec => {
    if (excludeId && lec.id === excludeId) return false;
    const existingVideoId = getYouTubeId(lec.youtubeUrl).toLowerCase();
    const existingUrl = lec.youtubeUrl.trim().toLowerCase();
    return existingVideoId === lowerVideoId || existingUrl === lowerUrl;
  });
};

export const addLecture = async (lec: Omit<Lecture, 'id'>): Promise<string> => {
  // Check for duplicates
  const isDuplicate = await isLectureDuplicate(lec.youtubeUrl);
  if (isDuplicate) {
    throw new Error("هذه المحاضرة موجودة مسبقًا");
  }
  
  const newId = `lec-${Date.now()}`;
  const slug = generateSlug(lec.title) || newId;
  const completeLec: Lecture = {
    ...lec,
    id: newId,
    slug,
    views: 0,
    downloads: 0,
    thumbnailUrl: lec.thumbnailUrl || getYouTubeThumbnail(lec.youtubeUrl)
  };
  
  if (isFirebaseConfigured()) {
    try {
      const docRef = await withDbTimeout(addDoc(collection(db, 'lectures'), {
        ...lec,
        slug,
        views: 0,
        downloads: 0,
        thumbnailUrl: lec.thumbnailUrl || getYouTubeThumbnail(lec.youtubeUrl)
      }));
      return docRef.id;
    } catch (e) {
      console.error("Firebase addLecture error:", e);
    }
  }
  
  const current: Lecture[] = mockDb.get('lectures', defaultLectures);
  current.push(completeLec);
  mockDb.set('lectures', current);
  return newId;
};

export const updateLecture = async (id: string, updates: Partial<Lecture>): Promise<void> => {
  if (updates.youtubeUrl) {
    const isDuplicate = await isLectureDuplicate(updates.youtubeUrl, id);
    if (isDuplicate) {
      throw new Error("هذه المحاضرة موجودة مسبقًا");
    }
  }
  
  const cleanUpdates = { ...updates };
  if (updates.youtubeUrl && !updates.thumbnailUrl) {
    cleanUpdates.thumbnailUrl = getYouTubeThumbnail(updates.youtubeUrl);
  }
  if (updates.title) {
    cleanUpdates.slug = generateSlug(updates.title);
  }
  
  if (isFirebaseConfigured()) {
    try {
      const docRef = doc(db, 'lectures', id);
      await withDbTimeout(updateDoc(docRef, cleanUpdates));
      return;
    } catch (e) {
      console.error("Firebase updateLecture error:", e);
    }
  }
  
  const current: Lecture[] = mockDb.get('lectures', defaultLectures);
  const updated = current.map(item => item.id === id ? { ...item, ...cleanUpdates } : item);
  mockDb.set('lectures', updated);
};

export const deleteLecture = async (id: string): Promise<void> => {
  if (isFirebaseConfigured()) {
    try {
      const docRef = doc(db, 'lectures', id);
      await withDbTimeout(deleteDoc(docRef));
      return;
    } catch (e) {
      console.error("Firebase deleteLecture error:", e);
    }
  }
  
  const current: Lecture[] = mockDb.get('lectures', defaultLectures);
  const filtered = current.filter(item => item.id !== id);
  mockDb.set('lectures', filtered);
};

// --- VIEWS & DOWNLOADS ---
export const incrementLectureViews = async (id: string): Promise<void> => {
  if (isFirebaseConfigured()) {
    try {
      const docRef = doc(db, 'lectures', id);
      await withDbTimeout(updateDoc(docRef, { views: increment(1) }));
      return;
    } catch (e) {
      console.error("Firebase incrementLectureViews error:", e);
    }
  }
  
  const current: Lecture[] = mockDb.get('lectures', defaultLectures);
  const updated = current.map(item => item.id === id ? { ...item, views: (item.views || 0) + 1 } : item);
  mockDb.set('lectures', updated);
};

export const incrementLectureDownloads = async (id: string): Promise<void> => {
  if (isFirebaseConfigured()) {
    try {
      const docRef = doc(db, 'lectures', id);
      await withDbTimeout(updateDoc(docRef, { downloads: increment(1) }));
      return;
    } catch (e) {
      console.error("Firebase incrementLectureDownloads error:", e);
    }
  }
  
  const current: Lecture[] = mockDb.get('lectures', defaultLectures);
  const updated = current.map(item => item.id === id ? { ...item, downloads: (item.downloads || 0) + 1 } : item);
  mockDb.set('lectures', updated);
};

// --- CATEGORIES ---
export const getCategories = async (): Promise<Category[]> => {
  if (isFirebaseConfigured()) {
    try {
      const collRef = collection(db, 'categories');
      const q = query(collRef, orderBy('sortOrder', 'asc'));
      const querySnap = await withDbTimeout(getDocs(q));
      const list: Category[] = [];
      querySnap.forEach((doc) => {
        const data = doc.data();
        list.push({ id: doc.id, sortOrder: data.sortOrder ?? 999, ...data } as Category);
      });
      return list;
    } catch (e) {
      console.warn("Firebase failed, falling back to LocalStorage mock", e);
    }
  }
  
  const all: Category[] = mockDb.get('categories', defaultCategories);
  return all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
};

export const addCategory = async (cat: Omit<Category, 'id'>): Promise<string> => {
  const newId = `cat-${Date.now()}`;
  const completeCat: Category = {
    ...cat,
    id: newId,
    slug: cat.slug || generateSlug(cat.name),
    sortOrder: cat.sortOrder ?? 999
  };
  
  if (isFirebaseConfigured()) {
    try {
      const docRef = await withDbTimeout(addDoc(collection(db, 'categories'), {
        ...cat,
        slug: cat.slug || generateSlug(cat.name),
        sortOrder: cat.sortOrder ?? 999
      }));
      return docRef.id;
    } catch (e) {
      console.error("Firebase addCategory error:", e);
    }
  }
  
  const current: Category[] = mockDb.get('categories', defaultCategories);
  current.push(completeCat);
  mockDb.set('categories', current);
  return newId;
};

export const updateCategory = async (id: string, updates: Partial<Category>): Promise<void> => {
  const cleanUpdates = { ...updates };
  if (updates.name && !updates.slug) {
    cleanUpdates.slug = generateSlug(updates.name);
  }
  
  if (isFirebaseConfigured()) {
    try {
      const docRef = doc(db, 'categories', id);
      await withDbTimeout(updateDoc(docRef, cleanUpdates));
      return;
    } catch (e) {
      console.error("Firebase updateCategory error:", e);
    }
  }
  
  const current: Category[] = mockDb.get('categories', defaultCategories);
  const updated = current.map(item => item.id === id ? { ...item, ...cleanUpdates } : item);
  mockDb.set('categories', updated);
};

export const deleteCategory = async (id: string): Promise<void> => {
  const lectures = await getLectures();
  const isLinked = lectures.some(lec => lec.categoryIds?.includes(id));
  if (isLinked) {
    throw new Error("لا يمكن حذف هذا التصنيف لأنه مرتبط بمحاضرات قائمة. يرجى تعديل أو حذف المحاضرات المرتبطة أولاً.");
  }

  if (isFirebaseConfigured()) {
    try {
      const docRef = doc(db, 'categories', id);
      await withDbTimeout(deleteDoc(docRef));
      return;
    } catch (e) {
      console.error("Firebase deleteCategory error:", e);
    }
  }
  
  const current: Category[] = mockDb.get('categories', defaultCategories);
  const filtered = current.filter(item => item.id !== id);
  mockDb.set('categories', filtered);
};

// 5. ADMINS
export const checkAdminEmail = async (email: string): Promise<Admin | null> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Please set your credentials in .env.local.");
  }
  
  const docRef = doc(db, 'admins', cleanEmail);
  const docSnap = await withDbTimeout(getDoc(docRef));
  if (docSnap.exists()) {
    return docSnap.data() as Admin;
  } else {
    // If it's the default super admin, let's auto-seed it to Firestore!
    if (cleanEmail === 'am2004arnasir@gmail.com') {
      const superAdmin = {
        id: cleanEmail,
        email: 'am2004arnasir@gmail.com',
        role: 'super_admin',
        password: 'admin-password-2026',
        createdAt: serverTimestamp()
      };
      await withDbTimeout(setDoc(docRef, superAdmin));
      // Return with locally mocked createdAt since Firestore will resolve serverTimestamp async on subsequent fetches
      return {
        id: cleanEmail,
        email: 'am2004arnasir@gmail.com',
        role: 'super_admin',
        password: 'admin-password-2026',
        createdAt: Date.now()
      } as Admin;
    }
    return null;
  }
};

export const getAdmins = async (): Promise<Admin[]> => {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Please set your credentials in .env.local.");
  }
  
  const collRef = collection(db, 'admins');
  const querySnap = await withDbTimeout(getDocs(collRef));
  const list: Admin[] = [];
  querySnap.forEach((doc) => {
    list.push({ id: doc.id, ...doc.data() } as Admin);
  });
  // Ensure the default admin exists in the list if the list is empty
  if (list.length === 0) {
    const cleanEmail = 'am2004arnasir@gmail.com';
    const superAdmin = {
      id: cleanEmail,
      email: 'am2004arnasir@gmail.com',
      role: 'super_admin',
      password: 'admin-password-2026',
      createdAt: serverTimestamp()
    };
    await withDbTimeout(setDoc(doc(db, 'admins', cleanEmail), superAdmin));
    list.push({
      id: cleanEmail,
      email: 'am2004arnasir@gmail.com',
      role: 'super_admin',
      password: 'admin-password-2026',
      createdAt: Date.now()
    } as Admin);
  }
  return list;
};

export const addAdmin = async (email: string, role: 'super_admin' | 'admin', password?: string): Promise<void> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Please set your credentials in .env.local.");
  }
  
  const docRef = doc(db, 'admins', cleanEmail);
  const docSnap = await withDbTimeout(getDoc(docRef));
  if (docSnap.exists()) {
    throw new Error("هذا المشرف مسجل بالفعل.");
  }
  
  const newAdmin = {
    id: cleanEmail,
    email: email.trim(),
    role,
    password: password || '123456',
    createdAt: serverTimestamp()
  };
  await withDbTimeout(setDoc(docRef, newAdmin));
};

export const updateAdminPassword = async (email: string, newPassword: string): Promise<void> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Please set your credentials in .env.local.");
  }
  
  const docRef = doc(db, 'admins', cleanEmail);
  await withDbTimeout(updateDoc(docRef, { password: newPassword }));
};

export const deleteAdmin = async (email: string): Promise<void> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Please set your credentials in .env.local.");
  }
  
  // Check if we are deleting the last super admin
  const all = await getAdmins();
  const superAdmins = all.filter(a => a.role === 'super_admin');
  const deletingAdmin = all.find(a => a.id === cleanEmail);
  
  if (deletingAdmin?.role === 'super_admin' && superAdmins.length <= 1) {
    throw new Error("لا يمكن حذف المشرف المالك (Super Admin) الأخير.");
  }
  
  const docRef = doc(db, 'admins', cleanEmail);
  await withDbTimeout(deleteDoc(docRef));
};
