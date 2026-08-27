import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'الصفحة غير موجودة | مسجد سيد المرسلين',
  description: 'الصفحة المطلوبة غير موجودة. عد إلى الصفحة الرئيسية أو تصفح محتوى المسجد.',
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          404
        </div>
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white">الصفحة غير موجودة</h1>
        <p className="mt-4 text-base text-zinc-600 dark:text-zinc-300">
          ربما تم نقل المحتوى أو تم إدخال رابط غير صحيح. يمكنك العودة إلى الصفحة الرئيسية لتصفح الخطب والمحاضرات والمواعظ.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-500"
        >
          العودة إلى الصفحة الرئيسية
        </Link>
      </div>
    </main>
  );
}
