"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface MySecret {
  slug: string;
  title: string | null;
  createdAt: string;
  expiresAt: string | null;
  isActive: boolean;
  _count: { replies: number; images: number };
}

export default function MySecretsPage() {
  const router = useRouter();
  const [secrets, setSecrets] = useState<MySecret[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    fetch("/api/secrets/mine")
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok && data.error === "请先登录") {
          router.replace("/verify?redirect=/my");
          return;
        }
        if (!ok) throw new Error(data.error);
        setSecrets(data.secrets || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [router]);

  const copyLink = async (slug: string) => {
    const url = `${window.location.origin}/s/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(""), 1500);
  };

  const formatTime = (value: string) => new Date(value).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">我的密文</h1>
            <p className="mt-1 text-xs text-gray-500">密文最多保留 7 天，过期后会自动清理。</p>
          </div>
          <Link href="/create" className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">新建</Link>
        </div>

        {loading && <div className="rounded-xl bg-white p-6 text-sm text-gray-500 shadow-sm">加载中...</div>}
        {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>}
        {!loading && !error && secrets.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <div className="text-sm text-gray-600">还没有创建过密文</div>
            <Link href="/create" className="mt-4 inline-block rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800">创建第一条</Link>
          </div>
        )}

        <div className="space-y-3">
          {secrets.map((secret) => {
            const expired = secret.expiresAt && new Date(secret.expiresAt) < new Date();
            return (
              <div key={secret.slug} className="rounded-xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link href={`/s/${secret.slug}`} className="block truncate text-base font-semibold text-gray-900 hover:underline">{secret.title || "无标题密文"}</Link>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                      <span>创建 {formatTime(secret.createdAt)}</span>
                      <span>回复 {secret._count.replies}</span>
                      <span>图片 {secret._count.images}</span>
                      <span className={expired ? "text-red-500" : ""}>{secret.expiresAt ? `${expired ? "已过期" : "到期"} ${formatTime(secret.expiresAt)}` : "7天后清理"}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${secret.isActive && !expired ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{secret.isActive && !expired ? "生效" : "不可访问"}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/s/${secret.slug}`} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200">查看</Link>
                  <Link href={`/m/${secret.slug}`} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200">管理</Link>
                  <button onClick={() => copyLink(secret.slug)} className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white hover:bg-gray-800">{copied === secret.slug ? "已复制" : "复制链接"}</button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
