# saed-ia-upload-worker

Cloudflare Worker يعمل كوسيط رفع آمن من المتصفح إلى Internet Archive (IAS3).

```
Browser ──PUT stream──> Worker ──PUT stream──> https://s3.us.archive.org/{item}/{file}
                                     │
                                     └─> https://archive.org/download/{item}/{file}
```

- لا يتم تحويل الملف إلى Base64 ولا تحميله في الذاكرة؛ يمرّر `request.body` مباشرة (Streaming).
- مفاتيح IA تُخزَّن كسرور Cloudflare فقط ولا تصل للمتصفح إطلاقًا.
- اسم العنصر (item) يولَّد داخل الـ Worker تلقائيًا، واسم الملف يُنظَّف ويُتحقق من امتداده.

## المتغيرات والسرورات

| المتغير | مكان ضبطه | إلزامي |
|---|---|---|
| `IA_ACCESS_KEY` | Cloudflare Secrets | نعم |
| `IA_SECRET_KEY` | Cloudflare Secrets | نعم |
| `UPLOAD_TOKEN` | Cloudflare Secrets (اختياري) | يمنع الآخرين من استخدام نقطة الرفع |
| `ALLOWED_ORIGINS` | wrangler vars (فاصلة بين النطاقات) | يضبط CORS للواجهة |
| `IA_COLLECTION` | wrangler vars | مجموعة الأرشيف، مثل `opensource_media` |
| `MAX_UPLOAD_MB` | wrangler vars | الحد الأقصى للحجم (افتراضي 4096) |

## التشغيل محليًا

```bash
cd worker
npm install
cp .dev.vars.example .dev.vars   # ثم ضع المفاتيح الحقيقية (ملف .dev.vars مستثنى من Git)
npx wrangler dev
```

## النشر وإضافة السرورات

```bash
cd worker
npx wrangler login
npx wrangler secret put IA_ACCESS_KEY   # الصق القيمة عند الطلب (لا تظهر في الشاشة)
npx wrangler secret put IA_SECRET_KEY
npx wrangler secret put UPLOAD_TOKEN    # اختياري لكن موصى به
npx wrangler deploy
```

بعد النشر أضف في Vercel:

```text
NEXT_PUBLIC_IA_UPLOAD_URL=https://saed-ia-upload-worker.<your-subdomain>.workers.dev
NEXT_PUBLIC_IA_UPLOAD_TOKEN=<نفس قيمة UPLOAD_TOKEN إن فعّلته>
```

## الواجهة البرمجية

| الطريقة والمسار | الوظيفة |
|---|---|
| `OPTIONS /upload` | فحص CORS المسبق |
| `PUT /upload/{filename}` | رفع مع توليد item تلقائيًا (الطريقة المستخدمة في الواجهة) |
| `PUT /upload/{item}/{filename}` | رفع باسم item صريح (يُرفض إن كان غير آمن) |
| `GET /healthz` | فحص الجاهزية |

استجابة النجاح:

```json
{ "ok": true, "item": "sayid-al-mursaleen-20260823-ab12cd34ef56", "file": "khutbah.mp3",
  "url": "https://archive.org/download/sayid-al-mursaleen-20260823-ab12cd34ef56/khutbah.mp3" }
```

## الاختبارات

```bash
cd worker
npm test        # 24 اختبار وحدة/تكامل عبر vitest
```

ملاحظة: احصل على مفاتيحك من <https://archive.org/account/s3.php>.
