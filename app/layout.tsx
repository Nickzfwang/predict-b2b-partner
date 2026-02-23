import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { Navbar } from '@/components/Navbar';
import './globals.css';

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'InsightHub Markets — 財經新聞與市場觀測',
  description: '提供宏觀趨勢、產業觀察與即時市場觀點，掌握財經脈動與投資機會。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={`${geist.variable} min-h-screen bg-gray-50 font-sans antialiased`}>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
