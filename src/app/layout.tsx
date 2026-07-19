import '../styles/global.css';
import type { Metadata } from "next";
import Header from '@/components/Header/Header';
import ShortcutsHint from '@/components/ShortcutsHint';

export const metadata: Metadata = {
  title: {
    default: `${process.env.NODE_ENV === 'development' ? '[DEV] ' : ''}THE FRAME`,
    template: `%s | THE FRAME`,
  },
  description: "사진 갤러리 THE FRAME",
  metadataBase: process.env.SITE_URL ? new URL(process.env.SITE_URL) : undefined,
  openGraph: {
    type: 'website',
    siteName: 'THE FRAME',
    locale: 'ko_KR',
  },
  twitter: { card: 'summary_large_image' },
};

// FOUC 방지: 페인트 전에 저장된 테마 적용
const themeInit = `
try {
    const t = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (t === 'dark' || (!t && prefersDark)) document.documentElement.classList.add('dark');
} catch {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL;
  const umamiId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {umamiUrl && umamiId && (
          <script defer src={`${umamiUrl}/script.js`} data-website-id={umamiId} />
        )}
      </head>
      <body>
        <Header />
        <main>{children}</main>
        <ShortcutsHint />
      </body>
    </html>
  );
}
