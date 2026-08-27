import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sayid-al-mursaleen.vercel.app"),
  title: "مسجد سيد المرسلين - الموقع الرسمي للخطب والمواعظ ومواقيت الصلاة",
  description: "منصة مسجد سيد المرسلين الرسمية للخطب والمحاضرات ومواقيت الصلاة والدروس الإسلامية. استمع إلى الخطب، المحاضرات، التلاوات والأنواع الإسلامية في مكان واحد.",
  applicationName: "مسجد سيد المرسلين",
  authors: [{ name: "مسجد سيد المرسلين" }],
  creator: "مسجد سيد المرسلين",
  publisher: "مسجد سيد المرسلين",
  keywords: [
    "مسجد سيد المرسلين",
    "سيد المرسلين",
    "مواقيت الصلاة",
    "خطب الجمعة",
    "دروس إسلامية",
    "أحاديث شريفة",
    "تلاوات قرآنية",
    "محاضرات إسلامية",
    "مواعظ إسلامية",
  ],
  alternates: {
    canonical: "/",
    languages: {
      ar: "/",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "مسجد سيد المرسلين - الموقع الرسمي للخطب والمواعظ ومواقيت الصلاة",
    description: "منصة مسجد سيد المرسلين الرسمية للخطب والمحاضرات ومواقيت الصلاة والدروس الإسلامية.",
  url: "https://sayid-al-mursaleen.vercel.app",
  images: [{ url: "https://sayid-al-mursaleen.vercel.app/logo.png", width: 1200, height: 630, alt: "مسجد سيد المرسلين" }],
    type: "website",
    locale: "ar_AR",
  siteName: "مسجد سيد المرسaleن",
  },
  twitter: {
    card: "summary_large_image",
    title: "مسجد سيد المرسلين - الموقع الرسمي",
    description: "منصة مسجد سيد المرسلين الرسمية للخطب والمحاضرات ومواقيت الصلاة والدروس الإسلامية.",
    images: ["https://sayid-al-mursaleen.vercel.app/logo.png"],
  },
  other: {
    "theme-color": "#0f766e",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} h-full antialiased`}
    >
      <head>
        {/* Anti-flash theme script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('saed_theme') || 'system';
                if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `
          }}
        />
        {/* Schema.org JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Mosque",
                  "@id": "https://sayid-al-mursaleen.vercel.app/#mosque",
                  "name": "مسجد سيد المرسلين",
                  "description": "منصة مسجد سيد المرسلين الرسمية للخطب والمحاضرات ومواقيت الصلاة والدروس الإسلامية.",
                  "url": "https://sayid-al-mursaleen.vercel.app",
                  "logo": "https://sayid-al-mursaleen.vercel.app/logo.png",
                  "image": "https://sayid-al-mursaleen.vercel.app/logo.png",
                  "telephone": "+201000000000",
                  "address": {
                    "@type": "PostalAddress",
                    "addressCountry": "EG"
                  }
                },
                {
                  "@type": "Organization",
                  "@id": "https://sayid-al-mursaleen.vercel.app/#organization",
                  "name": "مسجد سيد المرسلين",
                  "url": "https://sayid-al-mursaleen.vercel.app",
                  "logo": "https://sayid-al-mursaleen.vercel.app/logo.png"
                },
                {
                  "@type": "WebSite",
                  "@id": "https://sayid-al-mursaleen.vercel.app/#website",
                  "url": "https://sayid-al-mursaleen.vercel.app",
                  "name": "مسجد سيد المرسلين - الموقع الرسمي للخطب والمواعظ ومواقيت الصلاة",
                  "description": "منصة مسجد سيد المرسلين الرسمية للخطب والمحاضرات ومواقيت الصلاة والدروس الإسلامية.",
                  "inLanguage": "ar",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://sayid-al-mursaleen.vercel.app/?search={search_term_string}",
                    "query-input": "required name=search_term_string"
                  }
                }
              ]
            })
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        {children}
      </body>
    </html>
  );
}
