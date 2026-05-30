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
│   │   ├── lectures/[slug]/page.tsx            # Server: metadata + JSON-LD + renders client component
│   │   ├── lectures/[slug]/client-page.tsx      # Client: all interactive UI + share button
│   │   ├── lectures/[slug]/opengraph-image.tsx   # OG image generator (ImageResponse + Cairo)
│   │   ├── api/download/route.ts                # MP3 download proxy API
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
│   ├── fonts/
│   │   ├── Cairo-Regular.ttf
│   │   ├── Cairo-Bold.ttf
│   │   └── Cairo-Black.ttf
│   ├── logo.png
│   └── robots.txt
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
| المحاضرات والخطب | `LectureCard.tsx`, `lectures/[slug]/page.tsx`, `l/[shortSlug]/page.tsx` | ✅ |
| نظام Short Links | `l/[shortSlug]/page.tsx`, `shortSlug` في `db.ts` و `types.ts` | ✅ جديد |
| إعادة توجيه الروابط القديمة | `lectures/[slug]/page.tsx` (permanentRedirect 308) | ✅ جديد |
| التصنيفات | تصفية وفرز في `page.tsx`, إدارة في `admin/page.tsx` | ✅ |
| **تصفح المحتوى** | `CategoryCard.tsx`, قسم في `page.tsx`, صفحة `category/[slug]/page.tsx` | ✅ |
| التحميل MP3 | زر تحميل + `api/download/route.ts` | ✅ |
| دعم Firebase + Mock | `db.ts` (تبديل تلقائي) | ✅ |
| دعم Arabic RTL | `layout.tsx` + Google Font Cairo | ✅ |
| وضع الظلام/النهار | `ThemeToggle.tsx`, `AccessibilityWidget.tsx` | ✅ |
| إمكانية الوصول (كبار السن) | `AccessibilityWidget.tsx` (حجم الخط، تباين عالي) | ✅ |
| بيانات منظمة (Schema.org) | `lectures/[slug]/page.tsx`, `l/[shortSlug]/page.tsx` (VideoObject/AudioObject JSON-LD) | ✅ |
| تحسين محركات البحث (SEO) | `layout.tsx` meta tags, sitemap, canonical URLs, internal links | ✅ |
| **صور المشاركة الديناميكية OG** | `lectures/[slug]/opengraph-image.tsx` (ImageResponse + خط Cairo) | ✅ |
| **Open Graph / Twitter Metadata** | `lectures/[slug]/page.tsx`, `l/[shortSlug]/page.tsx` (generateMetadata) | ✅ |
| **مشاركة واتساب + Web Share API** | `lectures/[slug]/client-page.tsx` (زر مشاركة واحد مع fallback) | ✅ |
| زر مشاركة واحد 🔗 | `lectures/[slug]/client-page.tsx` (إزالة زر نسخ الرابط، دمج في زر واحد) | ✅ جديد |
| **التواصل عبر البريد الإلكتروني** | قسم في `page.tsx` (footer), حقل في `GeneralSettings` | ✅ |
| **أيقونات التواصل فقط في الموبايل** | `page.tsx` (إخفاء النصوص في أزرار السوشيال ميديا) | ✅ |
| **هيدر مبسط للموبايل** | `page.tsx` (إخفاء النص الفرعي للمسجد + النصوص في الأزرار) | ✅ |

## الأنواع (Types)

- `Category` — id, name, slug, **sortOrder (جديد)**, createdAt
- `GeneralSettings` — mosqueName, logoUrl, description, contactPhone, **contactEmail (جديد)**, whatsappLink, facebookLink, youtubeChannel, liveStreamUrl, tiktokLink
- `PrayerSettings`, `PrayerOffsets`, `PrayerTimesManual` — مواقيت الصلاة
- `Lecture` — id, title, description, sheikh, youtubeUrl, thumbnailUrl, categoryIds, mp3Url, slug, **shortSlug (جديد)**, views, downloads, createdAt
- `Announcement`, `Admin`

## المسارات (Routes)

| المسار | الملف | الوظيفة |
|--------|-------|---------|
| `/` | `page.tsx` | الصفحة الرئيسية |
| `/admin` | `admin/page.tsx` | لوحة التحكم |
| `/lectures/[slug]` | `lectures/[slug]/page.tsx` | صفحة المحاضرة (يعيد التوجيه إلى /l/ إذا كان الرابط قديماً) |
| `/l/[shortSlug]` | **l/[shortSlug]/page.tsx (جديد)** | **الرابط المختصر للمحاضرة (الرابط الأساسي للمشاركة)** |
| `/category/[slug]` | `category/[slug]/page.tsx` | صفحة التصنيف |
| `/api/download` | `api/download/route.ts` | تحميل MP3 |
| `/sitemap.xml` | `sitemap.ts` | خريطة الموقع |

## التعديلات الجراحية الأخيرة

- **نظام Short Links (جديد)**: إعادة تصميم كامل لنظام روابط المحاضرات. تمت إضافة حقل `shortSlug` إلى `Lecture` يتم إنشاؤه تلقائياً (ترجمة عربية→إنجليزية أو معرف عشوائي 6 أحرف). المسار الجديد `/l/[shortSlug]` يعرض المحاضرة مباشرة وهو الرابط الأساسي للمشاركة.
- **إعادة توجيه الروابط القديمة**: `lectures/[slug]/page.tsx` — عند دخول رابط قديم (عربي أو ID)، يتم إعادة التوجيه 308 (permanent) إلى `/l/shortSlug`.
- **تحسين زر المشاركة**: استبدال زري (نسخ الرابط + مشاركة واتساب) بزر واحد "🔗 مشاركة المحاضرة". يستخدم Web Share API المدعوم مع fallback إلى واتساب.
- **تحديث رابط المشاركة**: نص المشاركة الآن يستخدم الرابط المختصر `/l/...` بدلاً من الرابط الطويل. نص المشاركة: 🎙 العنوان 👤 الشيخ 📖 منصة مسجد سيد المرسلين 🔗 الرابط.
- **تحديث جميع الروابط الداخلية**: `LectureCard.tsx` و `sitemap.ts` وروابط المحاضرات المقترحة تستخدم `/l/` بدلاً من `/lectures/`.
- **حقل Short Link في لوحة التحكم**: إضافة حقل "الرابط القصير Short Link" اختياري في إضافة/تعديل المحاضرة. إذا ترك فارغاً يتم إنشاؤه تلقائياً.
- **تحديث Canonical URL**: جميع صفحات المحاضرات تستخدم `/l/shortSlug` كـ canonical URL و og:url.
- **تحسين صور OG**: `generateMetadata` في `/l/[shortSlug]` و `/lectures/[slug]` تستخدم الرابط المختصر لـ og:url.
