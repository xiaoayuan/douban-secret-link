"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [doubanUid, setDoubanUid] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doubanUid, doubanName: doubanUid, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">注册</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">豆瓣UID</label>
            <input type="text" value={doubanUid} onChange={(e) => setDoubanUid(e.target.value)}
              placeholder="你的豆瓣UID" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-500 focus:outline-none" required />
            <p className="mt-1 text-xs text-gray-500">昵称自动读取白名单中的记录</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">密码</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="至少6位密码" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-500 focus:outline-none" required minLength={6} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
            {loading ? "注册中..." : "注册"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          已有账号？<Link href="/login" className="text-gray-900 underline">登录</Link>
        </p>
      </div>
    </div>
  );
}
