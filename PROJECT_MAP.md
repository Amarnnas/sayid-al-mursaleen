# PROJECT_MAP.md — مسجد سيد المرسلين

## الهيكلة

```
saed_web/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (font, HTML dir=RTL, anti-flash theme script)
│   │   ├── page.tsx            # Homepage: header, hero, prayer, announcements, lectures, contact, footer, accessibility
│   │   ├── globals.css         # Tailwind v4, custom CSS (high-contrast, scrollbar, animations)
│   │   ├── admin/page.tsx      # Admin dashboard (general/prayer/announcements/lectures/categories/admins CRUD)
│   │   ├── lectures/[slug]/page.tsx  # Single lecture detail page
│   │   ├── api/download/route.ts     # MP3 download proxy API
│   │   └── sitemap.xml/route.ts      # Dynamic sitemap
│   ├── components/
│   │   ├── AccessibilityWidget.tsx    # Floating accessibility (font size, high contrast, light/dark/system)
│   │   ├── AnnouncementCard.tsx       # Announcement display card
│   │   ├── LectureCard.tsx            # Lecture card with thumbnail, download, navigation
│   │   ├── PrayerTimesCard.tsx        # Dynamic prayer times with countdown
│   │   ├── ThemeToggle.tsx            # Light/Dark/System toggle in header
│   │   └── Toast.tsx                  # Toast notification component
│   └── lib/
│       ├── firebase/
│       │   ├── config.ts       # Firebase config & auth init
│       │   └── db.ts           # DB service (Firestore + LocalStorage mock fallback)
│       ├── prayerTimes.ts      # Adhan prayer time calculation utilities
│       └── types.ts            # TypeScript interfaces
├── public/
├── next.config.ts
├── package.json
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
├── AGENTS.md
├── CLAUDE.md
├── FIREBASE_GUIDE.md
├── README.md
├── deploy.ps1
└── PROJECT_MAP.md
```

## الميزات

| الميزة | الملفات | الحالة |
|--------|---------|--------|
| مواقيت الصلاة الحية | `PrayerTimesCard.tsx`, `prayerTimes.ts` | ✅ |
| الإعلانات | `AnnouncementCard.tsx`, إدارة في `admin/page.tsx` | ✅ |
| المحاضرات والخطب | `LectureCard.tsx`, صفحة تفاصيل `lectures/[slug]/page.tsx` | ✅ |
| التصنيفات | تصفية وفرز في `page.tsx`, إدارة في `admin/page.tsx` | ✅ |
| **تصفح المحتوى** | `CategoryCard.tsx`, قسم في `page.tsx`, صفحة `category/[slug]/page.tsx` | ✅ جديد |
| التحميل MP3 | زر تحميل + `api/download/route.ts` | ✅ |
| دعم Firebase + Mock | `db.ts` (تبديل تلقائي) | ✅ |
| دعم Arabic RTL | `layout.tsx` + Google Font Cairo | ✅ |
| وضع الظلام/النهار | `ThemeToggle.tsx`, `AccessibilityWidget.tsx` | ✅ |
| إمكانية الوصول (كبار السن) | `AccessibilityWidget.tsx` (حجم الخط، تباين عالي) | ✅ |
| بيانات منظمة (Schema.org) | `layout.tsx` JSON-LD + `page.tsx` (category schema) | ✅ |
| تحسين محركات البحث (SEO) | `layout.tsx` meta tags, sitemap, internal links | ✅ |
| **التواصل عبر البريد الإلكتروني** | قسم في `page.tsx` (footer), حقل في `GeneralSettings` | ✅ جديد |
| **أيقونات التواصل فقط في الموبايل** | `page.tsx` (إخفاء النصوص في أزرار السوشيال ميديا) | ✅ جديد |
| **هيدر مبسط للموبايل** | `page.tsx` (إخفاء النص الفرعي للمسجد + النصوص في الأزرار) | ✅ جديد |

## الأنواع (Types)

- `Category` — id, name, slug, **sortOrder (جديد)**, createdAt
- `GeneralSettings` — mosqueName, logoUrl, description, contactPhone, **contactEmail (جديد)**, whatsappLink, facebookLink, youtubeChannel, liveStreamUrl, tiktokLink
- `PrayerSettings`, `PrayerOffsets`, `PrayerTimesManual` — مواقيت الصلاة
- `Lecture`, `Announcement`, `Admin`

## التعديلات الجراحية الأخيرة

- **إصلاح خطأ حذف الإعلانات**: `db.ts` — إزالة التجاوز (fallback) إلى LocalStorage عند فشل Firebase في عمليات الكتابة (إضافة/تحديث/حذف). كان التجاوز يستخدم بيانات قديمة لا تتطابق مع معرفات Firebase مما يجعل الحذف بلا تأثير. الآن تنتشر الأخطاء إلى المتصل مباشرة.
- **تحسين معالجة الأخطاء**: `admin/page.tsx` — إظهار رسالة خطأ للمستخدم عند فشل الحذف أو الإضافة. 

- **إضافة تصفح المحتوى**: `CategoryCard.tsx` (مكون), قسم "تصفح المحتوى" في `page.tsx` (بعد مواقيت الصلاة), `category/[slug]/page.tsx` (صفحة تصنيف مستقلة)
- **إضافة sortOrder إلى Category**: `types.ts`, `db.ts` (defaults + sorting), `admin/page.tsx` (حقل في إضافة/تعديل التصنيف + عرضه)
- **تحديث Schema.org**: `layout.tsx` (إضافة WebSite + SearchAction), `page.tsx` (إضافة ItemList للتصنيفات ديناميكياً)
- **إضافة contactEmail**: `types.ts`, `db.ts`, `admin/page.tsx`, `page.tsx`
- **إخفاء نصوص السوشيال ميديا في الموبايل**: `page.tsx` (أزرار اليوتيوب، فيسبوك، واتساب، تيك توك)
- **تبسيط الهيدر في الموبايل**: إخفاء "الموقع الرسمي" subtitle + نصوص الأزرار (البث المباشر، لوحة التحكم)
- **إضافة قسم التواصل**: "كيف تتواصل معنا" قبل الفوتر مع بريد إلكتروني وهاتف
