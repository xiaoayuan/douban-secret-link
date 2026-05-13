import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "私密链接",
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
      <body className="min-h-screen antialiased">
        <noscript>
          <header className="border-b border-gray-200 bg-white">
            <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
              <Link href="/" className="text-lg font-semibold text-gray-900">私密链接</Link>
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-sm text-gray-600">管理员登录</Link>
              </div>
            </div>
          </header>
        </noscript>
        <Header />
        {children}
      </body>
    </html>
  );
}
