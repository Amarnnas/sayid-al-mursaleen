import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'مسجد سيد المرسلين',
    short_name: 'سيد المرسلين',
    description: 'المنصة الرسمية لمسجد سيد المرسلين للخطب، المحاضرات، المواعظ ومواقيت الصلاة.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#0f766e',
    lang: 'ar',
    dir: 'rtl',
    icons: [
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
