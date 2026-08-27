export async function GET() {
  const body = `# مسجد سيد المرسلين

## معلومات الموقع
- الاسم: مسجد سيد المرسلين
- الوصف: المنصة الرسمية للخطب، المحاضرات، المواعظ ومواقيت الصلاة.
- الموقع: https://saed-al-mursaleen.web.app
- اللغة: العربية

## محتوى مهم
- الرئيسية: https://saed-al-mursaleen.web.app/
- محاضرات: https://saed-al-mursaleen.web.app/
- الخطب: https://saed-al-mursaleen.web.app/

## الأهداف
يقدم الموقع محتوى إسلامي موثوقًا يشمل الخطب، المحاضرات، التلاوات، المواقيت، والمواد الشرعية المنظمة في تصنيفات واضحة.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
