import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "مسجد سيد المرسلين - الموقع الرسمي",
  description: "الموقع الرسمي لمسجد سيد المرسلين - مواقيت الصلاة، الخطب، الدروس والإعلانات الرسمية",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "مسجد سيد المرسلين - الموقع الرسمي",
    description: "الموقع الرسمي لمسجد سيد المرسلين - مواقيت الصلاة، الخطب، الدروس والإعلانات الرسمية",
    images: [{ url: "/logo.png" }],
    type: "website",
    locale: "ar_AR",
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
      <body className="min-h-full flex flex-col font-sans bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        {children}
      </body>
    </html>
  );
}
