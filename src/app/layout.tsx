import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "豆瓣私密链接",
  description: "私密内容分享",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="robots" content="noindex, nofollow, noarchive" />
        <meta name="referrer" content="no-referrer" />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
