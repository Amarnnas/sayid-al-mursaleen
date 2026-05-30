import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "مسجد سيد المرسلين - الموقع الرسمي للخطب والمواعظ ومواقيت الصلاة",
  description: "منصة مسجد سيد المرسلين الرسمية للخطب والمحاضرات ومواقيت الصلاة والدروس الإسلامية.",
  keywords: ["مسجد سيد المرسلين", "سيد المرسلين", "مواقيت الصلاة", "خطب الجمعة", "دروس إسلامية", "أحاديث شريفة", "تلاوات قرآنية"],
  alternates: {
    canonical: "https://saed-al-mursaleen.web.app",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "مسجد سيد المرسلين - الموقع الرسمي للخطب والمواعظ ومواقيت الصلاة",
    description: "منصة مسجد سيد المرسلين الرسمية للخطب والمحاضرات ومواقيت الصلاة والدروس الإسلامية.",
    images: [{ url: "https://saed-al-mursaleen.web.app/logo.png" }],
    type: "website",
    locale: "ar_AR",
    siteName: "مسجد سيد المرسلين",
  },
  twitter: {
    card: "summary",
    title: "مسجد سيد المرسلين - الموقع الرسمي",
    description: "منصة مسجد سيد المرسلين الرسمية للخطب والمحاضرات ومواقيت الصلاة والدروس الإسلامية.",
    images: ["https://saed-al-mursaleen.web.app/logo.png"],
  }
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
                  "@id": "https://saed-al-mursaleen.web.app/#mosque",
                  "name": "مسجد سيد المرسلين",
                  "description": "منصة مسجد سيد المرسلين الرسمية للخطب والمحاضرات ومواقيت الصلاة والدروس الإسلامية.",
                  "url": "https://saed-al-mursaleen.web.app",
                  "logo": "https://saed-al-mursaleen.web.app/logo.png",
                  "image": "https://saed-al-mursaleen.web.app/logo.png",
                  "telephone": "+201000000000",
                  "address": {
                    "@type": "PostalAddress",
                    "addressCountry": "EG"
                  }
                },
                {
                  "@type": "Organization",
                  "@id": "https://saed-al-mursaleen.web.app/#organization",
                  "name": "مسجد سيد المرسلين",
                  "url": "https://saed-al-mursaleen.web.app",
                  "logo": "https://saed-al-mursaleen.web.app/logo.png"
                },
                {
                  "@type": "WebSite",
                  "@id": "https://saed-al-mursaleen.web.app/#website",
                  "url": "https://saed-al-mursaleen.web.app",
                  "name": "مسجد سيد المرسلين - الموقع الرسمي للخطب والمواعظ ومواقيت الصلاة",
                  "description": "منصة مسجد سيد المرسلين الرسمية للخطب والمحاضرات ومواقيت الصلاة والدروس الإسلامية.",
                  "inLanguage": "ar",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://saed-al-mursaleen.web.app/?search={search_term_string}",
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
