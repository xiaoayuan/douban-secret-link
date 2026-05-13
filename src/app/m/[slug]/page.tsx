"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Secret {
  id: string; slug: string; title: string | null; creatorUid: string;
  expiresAt: string | null; isActive: boolean; createdAt: string;
  replies: { id: string }[];
}

export default function ManagePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [secret, setSecret] = useState<Secret | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((data) => {
      if (!data.user) { setError("请先登录"); setLoading(false); }
    });
  }, []);

  useEffect(() => {
    fetch(`/api/secrets/${slug}`).then((r) => r.json()).then((data) => {
      if (!data.secret) setError(data.error || "密文不存在");
      else if (!data.secret.isCreator) setError("只有创建者可以管理");
      else setSecret(data.secret);
      setLoading(false);
    }).catch(() => { setError("加载失败"); setLoading(false); });
  }, [slug]);

  const toggleActive = async () => {
    if (!secret) return;
    const res = await fetch(`/api/secrets/${slug}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !secret.isActive }),
    });
    const data = await res.json();
    if (res.ok) setSecret(data.secret);
  };

  const handleDelete = async () => {
    if (!confirm("确定删除？")) return;
    const res = await fetch(`/api/secrets/${slug}`, { method: "DELETE" });
    if (res.ok) window.location.href = "/";
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-gray-50"><div className="text-sm text-gray-500">加载中...</div></div>;
  if (error) return <div className="min-h-screen bg-gray-50"><main className="flex min-h-[60vh] items-center justify-center px-4"><div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div></main></div>;
  if (!secret) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">管理密文</h1>
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div><div className="text-sm font-medium text-gray-700">状态</div><a href={`/s/${secret.slug}`} className="mt-1 block text-xs text-blue-500 hover:underline">/s/{secret.slug}</a></div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${secret.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>{secret.isActive ? "生效中" : "已关闭"}</span>
                <button onClick={toggleActive} className={`rounded-lg px-3 py-1 text-xs font-medium ${secret.isActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>{secret.isActive ? "关闭" : "开启"}</button>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 text-sm font-medium text-gray-700">信息</div>
            <div className="space-y-2 text-sm text-gray-600">
              <div><span className="text-gray-500">标题：</span>{secret.title || "无"}</div>
              <div><span className="text-gray-500">创建时间：</span>{new Date(secret.createdAt).toLocaleString("zh-CN")}</div>
              <div><span className="text-gray-500">过期：</span>{secret.expiresAt ? new Date(secret.expiresAt).toLocaleString("zh-CN") : "永不过期"}</div>
              <div><span className="text-gray-500">回复：</span>{secret.replies.length} 条</div>
            </div>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 text-sm font-medium text-red-600">删除</div>
            <p className="mb-3 text-xs text-gray-600">删除后无法恢复</p>
            <button onClick={handleDelete} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600">删除此密文</button>
          </div>
        </div>
      </main>
    </div>
  );
}
