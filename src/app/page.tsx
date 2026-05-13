"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function HomePage() {
  const [user, setUser] = useState<{ doubanName: string; role: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => { setUser(d.user); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="flex min-h-[80vh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold text-gray-900">私密链接</h1>
          <p className="mt-3 text-sm text-gray-600">创建私密链接，分享给豆瓣白名单好友。只有通过评论验证的小组成员才能查看和回复。</p>
          {!loading && (user ? (
            <div className="mt-8 flex flex-col items-center gap-3">
              <Link href="/create" className="inline-block rounded-full bg-gray-900 px-8 py-3 text-sm font-medium text-white hover:bg-gray-800">创建密文</Link>
              {user.role === "ADMIN" && <Link href="/admin" className="text-sm text-blue-600 hover:underline">管理员面板</Link>}
            </div>
          ) : (
            <div className="mt-8 flex flex-col items-center gap-3">
              <p className="max-w-xs text-xs leading-5 text-gray-500">从私密链接进入后，按页面提示完成豆瓣评论验证即可查看内容。</p>
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-700">管理员登录</Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
