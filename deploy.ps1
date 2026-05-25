# 🚀 سكربت التحضير للنشر والرفع لمسجد سيد المرسلين

Write-Host "=============================================" -ForegroundColor Green
Write-Host "   🕌 جاري التحضير لبناء ونشر موقع المسجد 🕌   " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# 1. التحقق من نجاح عملية بناء المشروع (Production Build)
Write-Host "`n📦 [1/4] جاري التحقق من نجاح بناء المشروع (npm run build)..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ خطأ: فشلت عملية بناء التطبيق. يرجى التحقق من الأخطاء أعلاه قبل محاولة النشر." -ForegroundColor Red
    exit 1
}
Write-Host "✓ تم التحقق من نجاح بناء التطبيق بنجاح كامل!" -ForegroundColor Green

# 2. إنشاء وتهيئة مستودع Git محلي
Write-Host "`n📁 [2/4] جاري تهيئة مستودع Git المحلي..." -ForegroundColor Yellow
if (-not (Test-Path .git)) {
    git init
    Write-Host "✓ تم تهيئة مستودع Git جديد بنجاح." -ForegroundColor Green
} else {
    Write-Host "✓ مستودع Git مهيأ مسبقاً." -ForegroundColor Green
}

# 3. إعداد الالتزام الأول (Initial Commit)
Write-Host "`n📝 [3/4] جاري إضافة الملفات وحفظ الالتزام..." -ForegroundColor Yellow
git add .
git commit -m "feat: complete mosque website expansion with real auth, dynamic oEmbed, accessibility widget, and beautiful UI"
Write-Host "✓ تم حفظ التعديلات محلياً بنجاح." -ForegroundColor Green

# 4. شرح خطوات النشر للمستخدم
Write-Host "`n🚀 [4/4] الخطوات المتبقية للنشر على GitHub و Vercel:" -ForegroundColor Green
Write-Host "--------------------------------------------------------" -ForegroundColor White
Write-Host "أولاً: لرفع المشروع إلى مستودع GitHub الخاص بك، نفذ الأوامر التالية:" -ForegroundColor Yellow
Write-Host "   git branch -M main" -ForegroundColor Cyan
Write-Host "   git remote add origin https://github.com/اسم-حسابك/اسم-المستودع.git" -ForegroundColor Cyan
Write-Host "   git push -u origin main" -ForegroundColor Cyan

Write-Host "`nثانياً: للنشر الفوري والمجاني على منصة Vercel:" -ForegroundColor Yellow
Write-Host "   1. اذهب لموقع Vercel (https://vercel.com) واربط حسابك بـ GitHub." -ForegroundColor White
Write-Host "   2. اضغط على 'Add New' ثم 'Project' واختر مستودع المشروع." -ForegroundColor White
Write-Host "   3. **هام جداً**: في قسم 'Environment Variables'، قم بإضافة حقول التكوين لـ Firebase كما هي في ملف '.env.local':" -ForegroundColor Amber
Write-Host "      - NEXT_PUBLIC_FIREBASE_API_KEY" -ForegroundColor Cyan
Write-Host "      - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" -ForegroundColor Cyan
Write-Host "      - NEXT_PUBLIC_FIREBASE_PROJECT_ID" -ForegroundColor Cyan
Write-Host "      - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" -ForegroundColor Cyan
Write-Host "      - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" -ForegroundColor Cyan
Write-Host "      - NEXT_PUBLIC_FIREBASE_APP_ID" -ForegroundColor Cyan
Write-Host "   4. اضغط على 'Deploy' وسيتولى Vercel كل شيء وبناء الموقع ونشره في أقل من دقيقة!" -ForegroundColor White
Write-Host "--------------------------------------------------------" -ForegroundColor White

Write-Host "`n✨ مبارك! موقع مسجد سيد المرسلين جاهز تماماً للانطلاق والعمل على الإنترنت! ✨`n" -ForegroundColor Green
