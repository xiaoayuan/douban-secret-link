import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/header";

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
      <body className="min-h-screen antialiased">
        <noscript>
          <header className="border-b border-gray-200 bg-white">
            <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
              <a href="/" className="text-lg font-semibold text-gray-900">私密链接</a>
              <div className="flex items-center gap-2">
                <a href="/login" className="text-sm text-gray-600">登录</a>
                <a href="/register" className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white">注册</a>
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
