# دليل إعداد وتفعيل منصة Firebase لموقع مسجد سيد المرسلين 🕌

لقد تم تصميم الموقع ليعمل بمرونة كاملة:
1. **وضع عدم الاتصال (Offline Mock Mode)**: يعمل تلقائياً عند عدم تكوين حقول Firebase في ملف بيئة المشروع (`.env`) باستخدام تخزين المتصفح المحلي `LocalStorage` مع بيانات افتراضية، وهي مثالية للتجربة والتعديل.
2. **وضع الإنتاج الحقيقي (Real Firebase Mode)**: يعمل بمجرد تعبئة المتغيرات الرسمية الخاصة بك في ملف `.env.local`.

---

## 🛠️ الخطوة 1: إنشاء مشروع Firebase جديد
1. اذهب إلى [Firebase Console](https://console.firebase.google.com/) وانقر على **Add Project**.
2. اختر اسماً لمشروعك (مثال: `syd-al-mursalin-mosque`) ثم اضغط **Continue**.
3. قم بإنشاء تطبيق ويب جديد بالضغط على أيقونة الويب (`</>`) في صفحة المشروع وسجل اسماً له، ثم انسخ كائن التكوين `firebaseConfig` المعروض لك.

---

## 🔐 الخطوة 2: تفعيل خدمات Firebase المطلوبة

### 1️⃣ خدمة تسجيل الدخول (Authentication)
* من القائمة الجانبية اختر **Build** ثم **Authentication**، واضغط **Get Started**.
* في قسم **Sign-in method**، قم بتفعيل الميزات التالية:
  1. **Email/Password**: لتسجيل الدخول بكلمة المرور وحساب المشرفين.
  2. **Google**: لتسجيل الدخول الفوري والآمن بضغطة زر لحساب المشرفين المسجلين.

### 2️⃣ قاعدة البيانات السحابية (Cloud Firestore)
* اختر **Firestore Database** واضغط على **Create database**.
* اختر **Start in production mode** وموقع الخادم الأقرب لمنطقتك.
* اذهب إلى تبويب **Rules** وقم بنسخ ولصق القواعد الأمنية التالية لحماية بيانات المسجد بالكامل:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        exists(/databases/$(database)/documents/admins/$(request.auth.token.email.lower()));
    }

    match /{document=**} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /admins/{adminEmail} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /settings/{settingId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /announcements/{annId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /lectures/{lectureId} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```
* اضغط على **Publish** لحفظ القواعد.

### 3️⃣ خدمة تخزين الصور (Cloud Storage)
* اختر **Storage** واضغط **Get Started**.
* اذهب لتبويب **Rules** وتأكد من كتابة قواعد القراءة والكتابة للمشرفين فقط:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && 
        firestore.exists(/databases/$(database)/documents/admins/$(request.auth.token.email.lower()));
    }
  }
}
```

---

## 🔑 الخطوة 3: إعداد حقول البيئة (Environment Variables)

قم بإنشاء ملف باسم `.env.local` في المجلد الرئيسي للمشروع، وعبئ فيه بيانات الوصول التي نسختها من كائن التكوين كالتالي:

```env
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyA..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="syd-al-mursalin.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="syd-al-mursalin"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="syd-al-mursalin.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="1:12345:web:abcd"
```

---

## 🚀 الخطوة 4: تشغيل المشروع محلياً وبنائه
قم بتشغيل خادم التطوير محلياً:
```bash
npm run dev
```

للتأكد من نجاح عملية البناء الكاملة وخلوها من الأخطاء:
```bash
npm run build
```

---

## 🔒 المشرف العام التلقائي (Super Admin)
بمجرد قيامك بأول تسجيل دخول عبر حساب Google أو البريد الإلكتروني للمشرف المالك المحدد مسبقاً:
* **البريد الإلكتروني الأساسي المالك**: `am2004arnasir@gmail.com`

سيقوم النظام السحابي تلقائياً بإنشاء مستند له في قاعدة بيانات Firestore كـ `super_admin` ليمكنك من بدء إضافة وإدارة وتعديل المشرفين الآخرين ومحتوى المسجد بالكامل بكل سهولة وسلاسة!
