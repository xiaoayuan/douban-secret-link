"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/create";
  const [doubanUid, setDoubanUid] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [challengeCode, setChallengeCode] = useState("");
  const [verifyPostUrl, setVerifyPostUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) router.replace(redirectTo);
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [redirectTo, router]);

  const startChallenge = async () => {
    if (!doubanUid.trim()) return;
    setChecking(true); setError("");
    try {
      const res = await fetch("/api/auth/comment-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doubanUid: doubanUid.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChallengeId(data.challengeId);
      setChallengeCode(data.code);
      setVerifyPostUrl(data.verifyPostUrl);
    } catch (e) { setError(e instanceof Error ? e.message : "生成验证口令失败"); }
    setChecking(false);
  };

  const checkChallenge = async () => {
    if (!challengeId) return;
    setChecking(true); setError("");
    try {
      const res = await fetch("/api/auth/comment-challenge", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.replace(redirectTo);
    } catch (e) { setError(e instanceof Error ? e.message : "验证失败"); }
    setChecking(false);
  };

  if (loading) return <div className="text-sm text-[#8a7b66]">加载中...</div>;

  return (
    <div className="w-full max-w-md rounded-[28px] border border-[#e3d8c5] bg-[#fffaf1] p-6 shadow-[0_24px_80px_rgba(64,48,28,0.12)]">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#244b36] text-lg font-semibold text-white">密</div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#2e2418]">验证豆瓣小组身份</h1>
        <p className="mt-3 text-sm leading-6 text-[#6f604d]">首次使用需要去豆瓣验证帖回复一次性口令。验证成功后，30 天内可以直接创建和查看密文。</p>
      </div>
      {error && <div className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {!challengeCode ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[#3c3124]">你的豆瓣 UID</label>
          <input type="text" value={doubanUid} onChange={(e) => setDoubanUid(e.target.value)} placeholder="例如 douban123 或数字ID" className="w-full rounded-2xl border border-[#d8cbb8] bg-white px-4 py-3 text-sm text-[#2e2418] outline-none focus:border-[#244b36]" />
          <button onClick={startChallenge} disabled={checking || !doubanUid.trim()} className="w-full rounded-2xl bg-[#244b36] py-3 text-sm font-semibold text-white disabled:opacity-50">{checking ? "生成中..." : "生成验证口令"}</button>
          <p className="text-xs leading-5 text-[#8a7b66]">系统会先确认这个 UID 是否在已同步的小组成员名单里。</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-dashed border-[#b9a88f] bg-white p-4 text-center">
            <div className="text-xs text-[#8a7b66]">请在豆瓣验证帖回复这串口令</div>
            <div className="mt-2 select-all text-2xl font-bold tracking-[0.18em] text-[#244b36]">{challengeCode}</div>
          </div>
          <a href={verifyPostUrl} target="_blank" rel="noopener noreferrer" className="block rounded-2xl border border-[#d8cbb8] bg-white py-3 text-center text-sm font-medium text-[#244b36] hover:bg-[#f8f2e8]">打开豆瓣验证帖</a>
          <button onClick={checkChallenge} disabled={checking} className="w-full rounded-2xl bg-[#244b36] py-3 text-sm font-semibold text-white disabled:opacity-50">{checking ? "检查中..." : "我已回复，开始验证"}</button>
          <button onClick={() => { setChallengeId(""); setChallengeCode(""); setVerifyPostUrl(""); }} className="w-full text-xs text-[#8a7b66] hover:text-[#3c3124]">重新输入 UID</button>
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f1e8] px-4 py-10">
      <Suspense fallback={<div className="text-sm text-[#8a7b66]">加载中...</div>}>
        <VerifyForm />
      </Suspense>
    </div>
  );
}
